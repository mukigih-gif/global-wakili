/**
 * ClientProspectService.ts
 *
 * Client Prospects Pipeline — CRM for tracking potential clients
 * through pipeline stages before they become active clients.
 *
 * Pipeline stages (PipelineStage):
 *   INITIAL_CONTACT → NEEDS_ASSESSMENT → PROPOSAL_SENT →
 *   NEGOTIATION → RETAINER_SIGNED → CONVERTED | LOST | DORMANT
 *
 * When a prospect converts, convertedClientId is set and status = CONVERTED.
 */

type ProspectDbClient = {
  clientProspect: {
    create:    (args: unknown) => Promise<unknown>;
    update:    (args: unknown) => Promise<unknown>;
    findFirst: (args: unknown) => Promise<unknown | null>;
    findMany:  (args: unknown) => Promise<unknown[]>;
    count:     (args: unknown) => Promise<number>;
    groupBy?:  (args: unknown) => Promise<unknown[]>;
  };
  prospectActivity: {
    create:   (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown[]>;
    count:    (args: unknown) => Promise<number>;
  };
  user: { findFirst: (args: unknown) => Promise<unknown | null> };
};

const PIPELINE_ORDER = [
  'INITIAL_CONTACT',
  'NEEDS_ASSESSMENT',
  'PROPOSAL_SENT',
  'NEGOTIATION',
  'RETAINER_SIGNED',
] as const;

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required'), { statusCode: 400, code: 'PROSPECT_TENANT_REQUIRED' });
  }
}

function pageOf(page?: number, limit?: number) {
  const p = page && page > 0 ? page : 1;
  const l = limit && limit > 0 ? Math.min(limit, 100) : 25;
  return { page: p, limit: l, skip: (p - 1) * l };
}

type CreateProspectInput = {
  tenantId: string;
  branchId?: string | null;
  name: string;
  email?: string | null;
  phoneNumber?: string | null;
  company?: string | null;
  source?: string;
  stage?: string;
  estimatedValue?: number | null;
  currency?: string;
  practiceArea?: string | null;
  notes?: string | null;
  assignedToId?: string | null;
  expectedCloseDate?: Date | string | null;
};

type UpdateStageInput = {
  tenantId: string;
  prospectId: string;
  actorId: string;
  stage: string;
  notes?: string | null;
};

export class ClientProspectService {
  static async createProspect(db: ProspectDbClient, input: CreateProspectInput) {
    assertTenant(input.tenantId);
    if (!input.name?.trim()) {
      throw Object.assign(new Error('Prospect name is required'), { statusCode: 422, code: 'PROSPECT_NAME_REQUIRED' });
    }

    return db.clientProspect.create({
      data: {
        tenantId: input.tenantId,
        branchId: input.branchId ?? null,
        name: input.name.trim(),
        email: input.email?.trim() ?? null,
        phoneNumber: input.phoneNumber?.trim() ?? null,
        company: input.company?.trim() ?? null,
        source: input.source ?? 'REFERRAL',
        stage: input.stage ?? 'INITIAL_CONTACT',
        status: 'ACTIVE',
        estimatedValue: input.estimatedValue ?? null,
        currency: input.currency ?? 'KES',
        practiceArea: input.practiceArea?.trim() ?? null,
        notes: input.notes?.trim() ?? null,
        assignedToId: input.assignedToId ?? null,
        expectedCloseDate: input.expectedCloseDate
          ? new Date(input.expectedCloseDate as string)
          : null,
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    } as any);
  }

  static async getProspect(db: ProspectDbClient, params: { tenantId: string; prospectId: string }) {
    assertTenant(params.tenantId);
    const prospect = await db.clientProspect.findFirst({
      where: { tenantId: params.tenantId, id: params.prospectId },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { user: { select: { id: true, name: true } } },
        },
      },
    } as any);

    if (!prospect) throw Object.assign(new Error('Prospect not found'), { statusCode: 404, code: 'PROSPECT_NOT_FOUND' });
    return prospect;
  }

  static async searchProspects(db: ProspectDbClient, params: {
    tenantId: string;
    stage?: string | null;
    status?: string | null;
    source?: string | null;
    assignedToId?: string | null;
    page?: number;
    limit?: number;
  }) {
    assertTenant(params.tenantId);
    const { page, limit, skip } = pageOf(params.page, params.limit);

    const where: Record<string, unknown> = { tenantId: params.tenantId };
    if (params.stage)      where.stage      = params.stage;
    if (params.status)     where.status     = params.status;
    if (params.source)     where.source     = params.source;
    if (params.assignedToId) where.assignedToId = params.assignedToId;

    const [data, total] = await Promise.all([
      db.clientProspect.findMany({
        where,
        include: { assignedTo: { select: { id: true, name: true } } },
        orderBy: [{ stage: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      } as any),
      db.clientProspect.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  static async getPipelineView(db: ProspectDbClient, params: { tenantId: string }) {
    assertTenant(params.tenantId);

    const prospects = await db.clientProspect.findMany({
      where: { tenantId: params.tenantId, status: 'ACTIVE' },
      include: { assignedTo: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    } as any) as any[];

    // Group by stage for Kanban-style pipeline view
    const pipeline: Record<string, unknown[]> = {};
    for (const stage of [...PIPELINE_ORDER]) {
      pipeline[stage] = [];
    }

    let totalEstimatedValue = 0;
    for (const p of prospects) {
      const stage = p.stage as string;
      if (pipeline[stage]) {
        (pipeline[stage] as unknown[]).push(p);
      }
      totalEstimatedValue += parseFloat(p.estimatedValue ?? '0');
    }

    return {
      tenantId: params.tenantId,
      generatedAt: new Date(),
      totalActive: prospects.length,
      totalEstimatedValue: totalEstimatedValue.toFixed(2),
      pipeline,
      stageCounts: Object.fromEntries(
        Object.entries(pipeline).map(([s, items]) => [s, (items as unknown[]).length])
      ),
    };
  }

  static async advanceStage(db: ProspectDbClient, input: UpdateStageInput) {
    assertTenant(input.tenantId);

    const prospect = await db.clientProspect.findFirst({
      where: { tenantId: input.tenantId, id: input.prospectId },
    }) as any;
    if (!prospect) throw Object.assign(new Error('Prospect not found'), { statusCode: 404, code: 'PROSPECT_NOT_FOUND' });

    const data: Record<string, unknown> = { stage: input.stage };
    if (input.stage === 'CONVERTED') { data.status = 'CONVERTED'; data.convertedAt = new Date(); }
    if (input.stage === 'LOST')      { data.status = 'LOST'; }
    if (input.stage === 'DORMANT')   { data.status = 'DORMANT'; }

    const updated = await db.clientProspect.update({
      where: { id: input.prospectId } as any,
      data,
    });

    // Log as pipeline activity
    await db.prospectActivity.create({
      data: {
        tenantId: input.tenantId,
        prospectId: input.prospectId,
        userId: input.actorId,
        activityType: 'NOTE',
        subject: `Stage advanced to ${input.stage}`,
        notes: input.notes?.trim() ?? null,
        completedAt: new Date(),
      },
    } as any);

    return updated;
  }

  static async logActivity(db: ProspectDbClient, input: {
    tenantId: string;
    prospectId: string;
    userId: string;
    activityType: string;
    subject: string;
    notes?: string | null;
    outcome?: string | null;
    scheduledAt?: Date | null;
    completedAt?: Date | null;
  }) {
    assertTenant(input.tenantId);

    const prospect = await db.clientProspect.findFirst({ where: { tenantId: input.tenantId, id: input.prospectId } });
    if (!prospect) throw Object.assign(new Error('Prospect not found'), { statusCode: 404, code: 'PROSPECT_NOT_FOUND' });

    return db.prospectActivity.create({
      data: {
        tenantId: input.tenantId,
        prospectId: input.prospectId,
        userId: input.userId,
        activityType: input.activityType,
        subject: input.subject.trim(),
        notes: input.notes?.trim() ?? null,
        outcome: input.outcome?.trim() ?? null,
        scheduledAt: input.scheduledAt ?? null,
        completedAt: input.completedAt ?? null,
      },
      include: { user: { select: { id: true, name: true } } },
    } as any);
  }

  static async convertToClient(db: ProspectDbClient & { client: { create: (args: unknown) => Promise<{ id: string }> } }, input: {
    tenantId: string;
    prospectId: string;
    actorId: string;
  }) {
    assertTenant(input.tenantId);

    const prospect = await db.clientProspect.findFirst({
      where: { tenantId: input.tenantId, id: input.prospectId, status: 'ACTIVE' },
    }) as any;

    if (!prospect) throw Object.assign(new Error('Active prospect not found'), { statusCode: 404, code: 'PROSPECT_NOT_FOUND' });
    if (prospect.convertedClientId) throw Object.assign(new Error('Prospect already converted'), { statusCode: 409, code: 'PROSPECT_ALREADY_CONVERTED' });

    // Create the client record from the prospect
    const client = await (db as any).client.create({
      data: {
        tenantId: input.tenantId,
        name: prospect.name,
        email: prospect.email ?? null,
        phoneNumber: prospect.phoneNumber ?? null,
        status: 'ACTIVE',
        metadata: {
          convertedFromProspectId: prospect.id,
          source: prospect.source,
          convertedAt: new Date().toISOString(),
        },
      },
      select: { id: true },
    });

    await db.clientProspect.update({
      where: { id: input.prospectId } as any,
      data: {
        status: 'CONVERTED',
        stage: 'CONVERTED',
        convertedClientId: client.id,
        convertedAt: new Date(),
      },
    });

    await db.prospectActivity.create({
      data: {
        tenantId: input.tenantId,
        prospectId: input.prospectId,
        userId: input.actorId,
        activityType: 'NOTE',
        subject: 'Prospect converted to client',
        notes: `Client record created: ${client.id}`,
        completedAt: new Date(),
      },
    } as any);

    return { clientId: client.id, prospectId: input.prospectId, converted: true };
  }
}

export default ClientProspectService;
