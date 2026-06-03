/**
 * TenderService.ts
 *
 * Legal tender management — tracks tendering activities on behalf of clients.
 * A law firm prepares tender documents, tracks deadlines, records submissions,
 * and logs outcomes.
 *
 * Distinct from procurement RFQ (firm's own buying).
 * This is for client matters where the firm assists with tender submissions.
 *
 * Covers:
 *   - Tender documents used (technical proposal, financial bid, certificates)
 *   - Submission deadlines
 *   - Tender opening dates
 *   - Clarification requests/responses
 *   - Outcome tracking (awarded, not awarded, disqualified)
 *   - Activity log (full audit trail)
 */

type TenderDbClient = {
  tenderRecord: {
    create: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
    findFirst: (args: unknown) => Promise<unknown | null>;
    findMany: (args: unknown) => Promise<unknown[]>;
    count: (args: unknown) => Promise<number>;
  };
  tenderActivity: {
    create: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown[]>;
  };
  tenderDocument: {
    create: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown[]>;
    deleteMany: (args: unknown) => Promise<unknown>;
  };
  matter?: { findFirst: (args: unknown) => Promise<unknown | null> };
  user: { findFirst: (args: unknown) => Promise<unknown | null> };
};

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required'), { statusCode: 400, code: 'TENDER_TENANT_REQUIRED' });
  }
}

function pageOf(page?: number, limit?: number) {
  const p = page && page > 0 ? page : 1;
  const l = limit && limit > 0 ? Math.min(limit, 100) : 25;
  return { page: p, limit: l, skip: (p - 1) * l };
}

export class TenderService {
  static async createTender(db: TenderDbClient, input: {
    tenantId: string;
    matterId?: string | null;
    clientId?: string | null;
    tenderName: string;
    tenderNumber?: string | null;
    issuedBy?: string | null;
    category?: string;
    estimatedValue?: number | null;
    currency?: string;
    openingDate?: Date | string | null;
    deadline?: Date | string | null;
    practiceArea?: string | null;
    assignedToId?: string | null;
    notes?: string | null;
  }) {
    assertTenant(input.tenantId);
    if (!input.tenderName?.trim()) {
      throw Object.assign(new Error('Tender name is required'), { statusCode: 422, code: 'TENDER_NAME_REQUIRED' });
    }

    return db.tenderRecord.create({
      data: {
        tenantId: input.tenantId,
        matterId: input.matterId ?? null,
        clientId: input.clientId ?? null,
        tenderName: input.tenderName.trim(),
        tenderNumber: input.tenderNumber?.trim() ?? null,
        issuedBy: input.issuedBy?.trim() ?? null,
        category: input.category ?? 'GOODS',
        status: 'IDENTIFIED',
        estimatedValue: input.estimatedValue ?? null,
        currency: input.currency ?? 'KES',
        openingDate: input.openingDate ? new Date(input.openingDate as string) : null,
        deadline: input.deadline ? new Date(input.deadline as string) : null,
        assignedToId: input.assignedToId ?? null,
        notes: input.notes?.trim() ?? null,
      },
      include: {
        matter: { select: { id: true, title: true, matterCode: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    } as any);
  }

  static async getTender(db: TenderDbClient, params: { tenantId: string; tenderId: string }) {
    assertTenant(params.tenantId);
    const tender = await db.tenderRecord.findFirst({
      where: { tenantId: params.tenantId, id: params.tenderId },
      include: {
        matter: { select: { id: true, title: true, matterCode: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 30,
          include: { user: { select: { id: true, name: true } } },
        },
        documents: { orderBy: { uploadedAt: 'desc' } },
      },
    } as any);
    if (!tender) throw Object.assign(new Error('Tender not found'), { statusCode: 404, code: 'TENDER_NOT_FOUND' });
    return tender;
  }

  static async searchTenders(db: TenderDbClient, params: {
    tenantId: string;
    matterId?: string | null;
    status?: string | null;
    assignedToId?: string | null;
    overdueOnly?: boolean;
    page?: number;
    limit?: number;
  }) {
    assertTenant(params.tenantId);
    const { page, limit, skip } = pageOf(params.page, params.limit);

    const where: Record<string, unknown> = { tenantId: params.tenantId };
    if (params.matterId)    where.matterId    = params.matterId;
    if (params.status)      where.status      = params.status;
    if (params.assignedToId) where.assignedToId = params.assignedToId;
    if (params.overdueOnly) {
      where.deadline = { lt: new Date() };
      where.status   = { notIn: ['SUBMITTED', 'AWARDED', 'NOT_AWARDED', 'CANCELLED', 'WITHDRAWN'] };
    }

    const [data, total] = await Promise.all([
      db.tenderRecord.findMany({
        where,
        include: {
          matter: { select: { id: true, title: true, matterCode: true } },
          assignedTo: { select: { id: true, name: true } },
        },
        orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      } as any),
      db.tenderRecord.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  static async updateTenderStatus(db: TenderDbClient, input: {
    tenantId: string;
    tenderId: string;
    actorId: string;
    status: string;
    submittedAt?: Date | null;
    outcomeDate?: Date | null;
    outcome?: string | null;
    outcomeNotes?: string | null;
  }) {
    assertTenant(input.tenantId);
    const existing = await db.tenderRecord.findFirst({ where: { tenantId: input.tenantId, id: input.tenderId } });
    if (!existing) throw Object.assign(new Error('Tender not found'), { statusCode: 404, code: 'TENDER_NOT_FOUND' });

    const data: Record<string, unknown> = { status: input.status };
    if (input.status === 'SUBMITTED' && !input.submittedAt) data.submittedAt = new Date();
    if (input.submittedAt !== undefined) data.submittedAt = input.submittedAt;
    if (input.outcome !== undefined)     data.outcome     = input.outcome;
    if (input.outcomeNotes !== undefined) data.outcomeNotes = input.outcomeNotes?.trim() ?? null;
    if (input.outcomeDate !== undefined) data.outcomeDate = input.outcomeDate;

    const updated = await db.tenderRecord.update({ where: { id: input.tenderId } as any, data });

    // Auto-log as activity
    await db.tenderActivity.create({
      data: {
        tenantId: input.tenantId,
        tenderId: input.tenderId,
        userId: input.actorId,
        activityType: input.status === 'SUBMITTED' ? 'SUBMISSION_MADE'
                    : input.outcome ? 'AWARD_RECEIVED'
                    : 'NOTE',
        subject: `Status updated to ${input.status}`,
        notes: input.outcomeNotes?.trim() ?? null,
        completedAt: new Date(),
      },
    } as any);

    return updated;
  }

  static async logActivity(db: TenderDbClient, input: {
    tenantId: string;
    tenderId: string;
    userId: string;
    activityType: string;
    subject: string;
    notes?: string | null;
    documentId?: string | null;
    completedAt?: Date | null;
  }) {
    assertTenant(input.tenantId);
    const tender = await db.tenderRecord.findFirst({ where: { tenantId: input.tenantId, id: input.tenderId } });
    if (!tender) throw Object.assign(new Error('Tender not found'), { statusCode: 404, code: 'TENDER_NOT_FOUND' });

    return db.tenderActivity.create({
      data: {
        tenantId: input.tenantId,
        tenderId: input.tenderId,
        userId: input.userId,
        activityType: input.activityType,
        subject: input.subject.trim(),
        notes: input.notes?.trim() ?? null,
        documentId: input.documentId ?? null,
        completedAt: input.completedAt ?? new Date(),
      },
      include: { user: { select: { id: true, name: true } } },
    } as any);
  }

  static async addDocument(db: TenderDbClient, input: {
    tenantId: string;
    tenderId: string;
    title: string;
    docType: string;
    scanUrl?: string | null;
    documentId?: string | null;
  }) {
    assertTenant(input.tenantId);
    const tender = await db.tenderRecord.findFirst({ where: { tenantId: input.tenantId, id: input.tenderId } });
    if (!tender) throw Object.assign(new Error('Tender not found'), { statusCode: 404, code: 'TENDER_NOT_FOUND' });

    return db.tenderDocument.create({
      data: {
        tenantId: input.tenantId,
        tenderId: input.tenderId,
        title: input.title.trim(),
        docType: input.docType.trim(),
        scanUrl: input.scanUrl?.trim() ?? null,
        documentId: input.documentId ?? null,
      },
    } as any);
  }

  static async getDashboard(db: TenderDbClient, params: { tenantId: string }) {
    assertTenant(params.tenantId);
    const now = new Date();
    const weekFromNow = new Date(Date.now() + 7 * 86400000);

    const [all, overdue, deadlineSoon] = await Promise.all([
      db.tenderRecord.findMany({ where: { tenantId: params.tenantId }, select: { status: true, category: true, outcome: true } } as any),
      db.tenderRecord.findMany({ where: { tenantId: params.tenantId, status: { notIn: ['SUBMITTED','AWARDED','NOT_AWARDED','CANCELLED','WITHDRAWN'] }, deadline: { lt: now } }, take: 10, include: { matter: { select: { id: true, title: true } } } } as any),
      db.tenderRecord.findMany({ where: { tenantId: params.tenantId, status: { notIn: ['SUBMITTED','AWARDED','NOT_AWARDED','CANCELLED','WITHDRAWN'] }, deadline: { gte: now, lte: weekFromNow } }, take: 10, include: { matter: { select: { id: true, title: true } } } } as any),
    ]);

    const statusBreakdown: Record<string, number> = {};
    for (const t of all as any[]) {
      statusBreakdown[t.status] = (statusBreakdown[t.status] ?? 0) + 1;
    }

    return { tenantId: params.tenantId, generatedAt: new Date(), totalTenders: (all as any[]).length, overdueCount: (overdue as any[]).length, deadlineSoonCount: (deadlineSoon as any[]).length, statusBreakdown, overdueDeadlines: overdue, upcomingDeadlines: deadlineSoon };
  }
}

export default TenderService;
