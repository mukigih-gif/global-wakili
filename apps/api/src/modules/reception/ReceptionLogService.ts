// apps/api/src/modules/reception/ReceptionLogService.ts

import type {
  ReceptionCreateInput,
  ReceptionDbClient,
  ReceptionSearchFilters,
} from './reception.types';

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required'), {
      statusCode: 400,
      code: 'RECEPTION_TENANT_REQUIRED',
    });
  }
}

function normalizeDate(value?: Date | string | null): Date {
  if (!value) return new Date();

  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid reception timestamp'), {
      statusCode: 422,
      code: 'RECEPTION_TIMESTAMP_INVALID',
    });
  }

  return parsed;
}

function normalizeOptionalDate(value?: Date | string | null): Date | null {
  if (!value) return null;

  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid reception date filter'), {
      statusCode: 422,
      code: 'RECEPTION_DATE_FILTER_INVALID',
    });
  }

  return parsed;
}

function assertSubject(subject: string): void {
  if (!subject?.trim()) {
    throw Object.assign(new Error('Reception subject is required'), {
      statusCode: 422,
      code: 'RECEPTION_SUBJECT_REQUIRED',
    });
  }
}

async function assertActorAndMatter(
  db: ReceptionDbClient,
  params: {
    tenantId: string;
    receivedById: string;
    matterId?: string | null;
  },
): Promise<void> {
  const [receiver, matter] = await Promise.all([
    db.user.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.receivedById,
        status: 'ACTIVE',
      },
      select: { id: true },
    }),
    params.matterId
      ? db.matter.findFirst({
          where: {
            tenantId: params.tenantId,
            id: params.matterId,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (!receiver) {
    throw Object.assign(new Error('Reception receiver not found or inactive'), {
      statusCode: 404,
      code: 'RECEPTION_RECEIVER_NOT_FOUND',
    });
  }

  if (params.matterId && !matter) {
    throw Object.assign(new Error('Matter not found for tenant'), {
      statusCode: 404,
      code: 'RECEPTION_MATTER_NOT_FOUND',
    });
  }
}

function buildWhere(params: {
  tenantId: string;
  query?: string | null;
  filters?: ReceptionSearchFilters | null;
}): Record<string, unknown> {
  const filters = params.filters ?? {};
  const andClauses: Record<string, unknown>[] = [];

  if (params.query?.trim()) {
    const query = params.query.trim();

    andClauses.push({
      OR: [
        { subject: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { deliveryMethod: { contains: query, mode: 'insensitive' } },
        { trackingNumber: { contains: query, mode: 'insensitive' } },
        { personMeeting: { contains: query, mode: 'insensitive' } },
        {
          matter: {
            is: {
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { matterCode: { contains: query, mode: 'insensitive' } },
              ],
            },
          },
        },
        {
          receivedBy: {
            is: {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
              ],
            },
          },
        },
      ],
    });
  }

  if (filters.type) andClauses.push({ type: filters.type });
  if (filters.matterId) andClauses.push({ matterId: filters.matterId });
  if (filters.receivedById) andClauses.push({ receivedById: filters.receivedById });
  if (filters.isUrgent !== null && filters.isUrgent !== undefined) {
    andClauses.push({ isUrgent: filters.isUrgent });
  }
  if (filters.isPlanned !== null && filters.isPlanned !== undefined) {
    andClauses.push({ isPlanned: filters.isPlanned });
  }

  const timestampFrom = normalizeOptionalDate(filters.timestampFrom);
  const timestampTo = normalizeOptionalDate(filters.timestampTo);

  if (timestampFrom || timestampTo) {
    andClauses.push({
      timestamp: {
        ...(timestampFrom ? { gte: timestampFrom } : {}),
        ...(timestampTo ? { lte: timestampTo } : {}),
      },
    });
  }

  return {
    tenantId: params.tenantId,
    ...(andClauses.length ? { AND: andClauses } : {}),
  };
}

export class ReceptionLogService {
  static async createLog(db: ReceptionDbClient, input: ReceptionCreateInput) {
    assertTenant(input.tenantId);
    assertSubject(input.subject);

    if (!input.receivedById?.trim()) {
      throw Object.assign(new Error('Received-by user is required'), {
        statusCode: 422,
        code: 'RECEPTION_RECEIVER_REQUIRED',
      });
    }

    await assertActorAndMatter(db, {
      tenantId: input.tenantId,
      receivedById: input.receivedById,
      matterId: input.matterId ?? null,
    });

    return db.receptionLog.create({
      data: {
        tenantId: input.tenantId,
        type: input.type,
        subject: input.subject.trim(),
        description: input.description?.trim() ?? null,
        timestamp: normalizeDate(input.timestamp),
        receivedById: input.receivedById,
        matterId: input.matterId ?? null,
        isUrgent: input.isUrgent === true,
        deliveryMethod: input.deliveryMethod?.trim() ?? null,
        trackingNumber: input.trackingNumber?.trim() ?? null,
        digitalCopyUrl: input.digitalCopyUrl?.trim() ?? null,
        personMeeting: input.personMeeting?.trim() ?? null,
        durationMinutes: input.durationMinutes ?? null,
        isPlanned: input.isPlanned !== false,
      },
      include: {
        matter: {
          select: {
            id: true,
            title: true,
            matterCode: true,
          },
        },
        receivedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  static async getLog(
    db: ReceptionDbClient,
    params: {
      tenantId: string;
      logId: string;
    },
  ) {
    assertTenant(params.tenantId);

    const log = await db.receptionLog.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.logId,
      },
      include: {
        matter: {
          select: {
            id: true,
            title: true,
            matterCode: true,
          },
        },
        receivedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!log) {
      throw Object.assign(new Error('Reception log not found'), {
        statusCode: 404,
        code: 'RECEPTION_LOG_NOT_FOUND',
      });
    }

    return log;
  }

  static async searchLogs(
    db: ReceptionDbClient,
    params: {
      tenantId: string;
      query?: string | null;
      filters?: ReceptionSearchFilters | null;
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
      db.receptionLog.findMany({
        where,
        include: {
          matter: {
            select: {
              id: true,
              title: true,
              matterCode: true,
            },
          },
          receivedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.receptionLog.count({ where }),
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
}

export default ReceptionLogService;