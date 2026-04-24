// apps/api/src/modules/compliance/ComplianceReportService.ts

import type {
  AmlStatus,
  ComplianceDbClient,
  ComplianceReportCreateInput,
  ComplianceReportSearchFilters,
  ComplianceReportUpdateInput,
} from './compliance.types';

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required'), {
      statusCode: 400,
      code: 'COMPLIANCE_TENANT_REQUIRED',
    });
  }
}

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;

  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid compliance report date'), {
      statusCode: 422,
      code: 'COMPLIANCE_REPORT_DATE_INVALID',
    });
  }

  return parsed;
}

function assertPeriod(periodStart?: Date | null, periodEnd?: Date | null): void {
  if (periodStart && periodEnd && periodEnd.getTime() < periodStart.getTime()) {
    throw Object.assign(new Error('Compliance report period end cannot be before period start'), {
      statusCode: 422,
      code: 'COMPLIANCE_REPORT_PERIOD_INVALID',
    });
  }
}

const allowedTransitions: Record<string, AmlStatus[]> = {
  DRAFT: ['PENDING_REVIEW', 'SUBMITTED', 'REJECTED'],
  PENDING_REVIEW: ['DRAFT', 'SUBMITTED', 'REJECTED'],
  SUBMITTED: ['ACKNOWLEDGED', 'REJECTED'],
  ACKNOWLEDGED: [],
  REJECTED: ['DRAFT', 'PENDING_REVIEW'],
};

function assertStatusTransition(current: string, next: AmlStatus): void {
  if (current === next) return;

  const allowed = allowedTransitions[current] ?? [];

  if (!allowed.includes(next)) {
    throw Object.assign(new Error(`Compliance report cannot move from ${current} to ${next}`), {
      statusCode: 409,
      code: 'COMPLIANCE_REPORT_STATUS_TRANSITION_FORBIDDEN',
      details: {
        current,
        next,
        allowed,
      },
    });
  }
}

async function assertClientAndActor(
  db: ComplianceDbClient,
  params: {
    tenantId: string;
    clientId?: string | null;
    actorId?: string | null;
  },
): Promise<void> {
  const [client, actor] = await Promise.all([
    params.clientId
      ? db.client.findFirst({
          where: {
            tenantId: params.tenantId,
            id: params.clientId,
          },
          select: {
            id: true,
          },
        })
      : Promise.resolve(null),
    params.actorId
      ? db.user.findFirst({
          where: {
            tenantId: params.tenantId,
            id: params.actorId,
            status: 'ACTIVE',
          },
          select: {
            id: true,
          },
        })
      : Promise.resolve(null),
  ]);

  if (params.clientId && !client) {
    throw Object.assign(new Error('Client not found for tenant'), {
      statusCode: 404,
      code: 'COMPLIANCE_REPORT_CLIENT_NOT_FOUND',
    });
  }

  if (params.actorId && !actor) {
    throw Object.assign(new Error('Compliance actor not found or inactive'), {
      statusCode: 404,
      code: 'COMPLIANCE_REPORT_ACTOR_NOT_FOUND',
    });
  }
}

function buildWhere(params: {
  tenantId: string;
  query?: string | null;
  filters?: ComplianceReportSearchFilters | null;
}): Record<string, unknown> {
  const filters = params.filters ?? {};
  const andClauses: Record<string, unknown>[] = [];

  if (params.query?.trim()) {
    const query = params.query.trim();

    andClauses.push({
      OR: [
        { referenceNumber: { contains: query, mode: 'insensitive' } },
        { regulatorAck: { contains: query, mode: 'insensitive' } },
        {
          client: {
            is: {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { clientCode: { contains: query, mode: 'insensitive' } },
                { kraPin: { contains: query, mode: 'insensitive' } },
              ],
            },
          },
        },
      ],
    });
  }

  if (filters.reportType) andClauses.push({ reportType: filters.reportType });
  if (filters.status) andClauses.push({ status: filters.status });
  if (filters.clientId) andClauses.push({ clientId: filters.clientId });

  const datePairs: Array<{
    field: string;
    from?: Date | string | null;
    to?: Date | string | null;
  }> = [
    { field: 'periodStart', from: filters.periodStartFrom, to: filters.periodStartTo },
    { field: 'periodEnd', from: filters.periodEndFrom, to: filters.periodEndTo },
    { field: 'createdAt', from: filters.createdFrom, to: filters.createdTo },
  ];

  for (const pair of datePairs) {
    const from = normalizeDate(pair.from);
    const to = normalizeDate(pair.to);

    if (from || to) {
      andClauses.push({
        [pair.field]: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
      });
    }
  }

  return {
    tenantId: params.tenantId,
    ...(andClauses.length ? { AND: andClauses } : {}),
  };
}

export class ComplianceReportService {
  static async createReport(db: ComplianceDbClient, input: ComplianceReportCreateInput) {
    assertTenant(input.tenantId);

    const periodStart = normalizeDate(input.periodStart);
    const periodEnd = normalizeDate(input.periodEnd);
    const submittedAt = normalizeDate(input.submittedAt);
    assertPeriod(periodStart, periodEnd);

    await assertClientAndActor(db, {
      tenantId: input.tenantId,
      clientId: input.clientId ?? null,
      actorId: input.createdById ?? null,
    });

    return db.complianceReport.create({
      data: {
        tenantId: input.tenantId,
        reportType: input.reportType,
        status: input.status ?? 'DRAFT',
        periodStart,
        periodEnd,
        referenceNumber: input.referenceNumber?.trim() ?? null,
        regulatorAck: input.regulatorAck?.trim() ?? null,
        submittedAt,
        clientId: input.clientId ?? null,
        createdById: input.createdById ?? null,
        payload: input.payload ?? {},
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            clientCode: true,
            kycStatus: true,
            pepStatus: true,
            sanctionsStatus: true,
            riskBand: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  static async getReport(
    db: ComplianceDbClient,
    params: {
      tenantId: string;
      reportId: string;
    },
  ) {
    assertTenant(params.tenantId);

    const report = await db.complianceReport.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.reportId,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            clientCode: true,
            kraPin: true,
            kycStatus: true,
            pepStatus: true,
            sanctionsStatus: true,
            riskScore: true,
            riskBand: true,
            needsEnhancedDueDiligence: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!report) {
      throw Object.assign(new Error('Compliance report not found'), {
        statusCode: 404,
        code: 'COMPLIANCE_REPORT_NOT_FOUND',
      });
    }

    return report;
  }

  static async searchReports(
    db: ComplianceDbClient,
    params: {
      tenantId: string;
      query?: string | null;
      filters?: ComplianceReportSearchFilters | null;
      page?: number;
      limit?: number;
    },
  ) {
    assertTenant(params.tenantId);

    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 50;
    const skip = (page - 1) * limit;

    const where = buildWhere({
      tenantId: params.tenantId,
      query: params.query,
      filters: params.filters,
    });

    const [data, total] = await Promise.all([
      db.complianceReport.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              clientCode: true,
              riskBand: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.complianceReport.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        query: params.query?.trim() ?? '',
      },
    };
  }

  static async updateReport(db: ComplianceDbClient, input: ComplianceReportUpdateInput) {
    assertTenant(input.tenantId);

    const existing = await db.complianceReport.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.reportId,
      },
      select: {
        id: true,
        status: true,
        clientId: true,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Compliance report not found'), {
        statusCode: 404,
        code: 'COMPLIANCE_REPORT_NOT_FOUND',
      });
    }

    if (input.status) {
      assertStatusTransition(String(existing.status), input.status);
    }

    const submittedAt = normalizeDate(input.submittedAt);

    const data: Record<string, unknown> = {};

    if (input.status !== undefined) data.status = input.status;
    if (input.referenceNumber !== undefined) data.referenceNumber = input.referenceNumber?.trim() ?? null;
    if (input.regulatorAck !== undefined) data.regulatorAck = input.regulatorAck?.trim() ?? null;
    if (input.submittedAt !== undefined) data.submittedAt = submittedAt;
    if (input.payload !== undefined) data.payload = input.payload ?? {};

    return db.complianceReport.update({
      where: {
        id: input.reportId,
      },
      data,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            clientCode: true,
            riskBand: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}

export default ComplianceReportService;