/**
 * CourtFilingService.ts
 *
 * Court filing registry — records discrete filings made by clerks or advocates.
 * Each filing maps to a specific filing type (Notice of Motion, Application, etc.),
 * supports scan URL attachment, court receipt tracking, and document linkage.
 *
 * Replaces CourtFilingBridgeService stub (was 501) for FILING type.
 * Wired from CourtFilingBridgeService.requestBridge() for type=FILING.
 */

type FilingDbClient = {
  courtFiling: {
    create:    (args: unknown) => Promise<unknown>;
    update:    (args: unknown) => Promise<unknown>;
    findFirst: (args: unknown) => Promise<unknown | null>;
    findMany:  (args: unknown) => Promise<unknown[]>;
    count:     (args: unknown) => Promise<number>;
  };
  matter:      { findFirst: (args: unknown) => Promise<unknown | null> };
  courtHearing?: { findFirst: (args: unknown) => Promise<unknown | null> };
  user:        { findFirst: (args: unknown) => Promise<unknown | null> };
};

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required'), { statusCode: 400, code: 'FILING_TENANT_REQUIRED' });
  }
}

function pageOf(page?: number, limit?: number) {
  const p = page && page > 0 ? page : 1;
  const l = limit && limit > 0 ? Math.min(limit, 100) : 25;
  return { page: p, limit: l, skip: (p - 1) * l };
}

export class CourtFilingService {
  static async createFiling(db: FilingDbClient, input: {
    tenantId: string;
    matterId: string;
    hearingId?: string | null;
    filingType?: string;
    title: string;
    courtRef?: string | null;
    filedAt?: Date | string | null;
    filedById?: string | null;
    dueDate?: Date | string | null;
    documentId?: string | null;
    scanUrl?: string | null;
    notes?: string | null;
  }) {
    assertTenant(input.tenantId);
    if (!input.title?.trim()) {
      throw Object.assign(new Error('Filing title is required'), { statusCode: 422, code: 'FILING_TITLE_REQUIRED' });
    }

    const matter = await db.matter.findFirst({ where: { tenantId: input.tenantId, id: input.matterId } });
    if (!matter) throw Object.assign(new Error('Matter not found'), { statusCode: 404, code: 'FILING_MATTER_NOT_FOUND' });

    return db.courtFiling.create({
      data: {
        tenantId: input.tenantId,
        matterId: input.matterId,
        hearingId: input.hearingId ?? null,
        filingType: input.filingType ?? 'OTHER',
        status: 'PREPARED',
        title: input.title.trim(),
        courtRef: input.courtRef?.trim() ?? null,
        filedAt: input.filedAt ? new Date(input.filedAt as string) : null,
        filedById: input.filedById ?? null,
        dueDate: input.dueDate ? new Date(input.dueDate as string) : null,
        documentId: input.documentId ?? null,
        scanUrl: input.scanUrl?.trim() ?? null,
        notes: input.notes?.trim() ?? null,
      },
      include: {
        matter:  { select: { id: true, title: true, matterCode: true } },
        hearing: { select: { id: true, title: true, hearingDate: true } },
        filedBy: { select: { id: true, name: true, email: true } },
      },
    } as any);
  }

  static async updateFiling(db: FilingDbClient, input: {
    tenantId: string;
    filingId: string;
    status?: string;
    courtRef?: string | null;
    filedAt?: Date | string | null;
    receivedAt?: Date | string | null;
    scanUrl?: string | null;
    documentId?: string | null;
    notes?: string | null;
  }) {
    assertTenant(input.tenantId);
    const existing = await db.courtFiling.findFirst({ where: { tenantId: input.tenantId, id: input.filingId } });
    if (!existing) throw Object.assign(new Error('Filing not found'), { statusCode: 404, code: 'FILING_NOT_FOUND' });

    const data: Record<string, unknown> = {};
    if (input.status     !== undefined) data.status     = input.status;
    if (input.courtRef   !== undefined) data.courtRef   = input.courtRef?.trim() ?? null;
    if (input.filedAt    !== undefined) data.filedAt    = input.filedAt ? new Date(input.filedAt as string) : null;
    if (input.receivedAt !== undefined) data.receivedAt = input.receivedAt ? new Date(input.receivedAt as string) : null;
    if (input.scanUrl    !== undefined) data.scanUrl    = input.scanUrl?.trim() ?? null;
    if (input.documentId !== undefined) data.documentId = input.documentId ?? null;
    if (input.notes      !== undefined) data.notes      = input.notes?.trim() ?? null;

    // Auto-set FILED status + filedAt if transitioning
    if (input.status === 'FILED' && !(existing as any).filedAt && !input.filedAt) {
      data.filedAt = new Date();
    }
    if (input.status === 'RECEIVED_BY_COURT' && !(existing as any).receivedAt && !input.receivedAt) {
      data.receivedAt = new Date();
    }

    return db.courtFiling.update({ where: { id: input.filingId } as any, data });
  }

  static async listFilings(db: FilingDbClient, params: {
    tenantId: string;
    matterId?: string | null;
    hearingId?: string | null;
    status?: string | null;
    filingType?: string | null;
    page?: number;
    limit?: number;
  }) {
    assertTenant(params.tenantId);
    const { page, limit, skip } = pageOf(params.page, params.limit);

    const where: Record<string, unknown> = { tenantId: params.tenantId };
    if (params.matterId)   where.matterId   = params.matterId;
    if (params.hearingId)  where.hearingId  = params.hearingId;
    if (params.status)     where.status     = params.status;
    if (params.filingType) where.filingType = params.filingType;

    const [data, total] = await Promise.all([
      db.courtFiling.findMany({
        where,
        include: {
          matter:  { select: { id: true, title: true, matterCode: true } },
          hearing: { select: { id: true, title: true, hearingDate: true } },
          filedBy: { select: { id: true, name: true } },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      } as any),
      db.courtFiling.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  static async getFilingDashboard(db: FilingDbClient, params: { tenantId: string; matterId?: string | null }) {
    assertTenant(params.tenantId);
    const where: Record<string, unknown> = { tenantId: params.tenantId };
    if (params.matterId) where.matterId = params.matterId;

    const now = new Date();
    const weekFromNow = new Date(Date.now() + 7 * 86400000);

    const [all, overdue, dueSoon, recent] = await Promise.all([
      db.courtFiling.findMany({ where, select: { status: true, filingType: true } } as any),
      db.courtFiling.findMany({ where: { ...where, status: { notIn: ['FILED','RECEIVED_BY_COURT','COMPLETED'] }, dueDate: { lt: now } }, take: 10, include: { matter: { select: { id: true, title: true } } } } as any),
      db.courtFiling.findMany({ where: { ...where, status: { notIn: ['FILED','RECEIVED_BY_COURT','COMPLETED'] }, dueDate: { gte: now, lte: weekFromNow } }, take: 10, include: { matter: { select: { id: true, title: true } } } } as any),
      db.courtFiling.findMany({ where, take: 10, orderBy: { createdAt: 'desc' } as any, include: { matter: { select: { id: true, title: true } } } } as any),
    ]);

    const statusBreakdown: Record<string, number> = {};
    const typeBreakdown: Record<string, number> = {};
    for (const f of all as any[]) {
      statusBreakdown[f.status] = (statusBreakdown[f.status] ?? 0) + 1;
      typeBreakdown[f.filingType] = (typeBreakdown[f.filingType] ?? 0) + 1;
    }

    return { tenantId: params.tenantId, generatedAt: new Date(), totalFilings: (all as any[]).length, overdueCount: (overdue as any[]).length, dueSoonCount: (dueSoon as any[]).length, statusBreakdown, typeBreakdown, overdueFilings: overdue, dueSoonFilings: dueSoon, recentFilings: recent };
  }
}

export default CourtFilingService;
