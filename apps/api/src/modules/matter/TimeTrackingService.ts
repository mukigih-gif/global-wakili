import { Prisma } from '@global-wakili/database';

function toDecimal(value: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined || value === '') {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(value);
}

export class TimeTrackingService {
  static async createEntry(
    db: any,
    params: {
      tenantId: string;
      matterId: string;
      userId: string;
      entryDate: Date;
      hours: Prisma.Decimal | string | number;
      description: string;
      billable?: boolean;
      activityCode?: string | null;
      rate?: Prisma.Decimal | string | number | null;
      source?: 'MANUAL' | 'TIMER';
      timerSessionId?: string | null;
    },
  ) {
    const [matter, user] = await Promise.all([
      db.matter.findFirst({
        where: {
          tenantId: params.tenantId,
          id: params.matterId,
        },
        select: {
          id: true,
          status: true,
          metadata: true,
        },
      }),
      db.user.findFirst({
        where: {
          tenantId: params.tenantId,
          id: params.userId,
          status: 'ACTIVE',
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (!matter) {
      throw Object.assign(new Error('Matter not found'), {
        statusCode: 404,
        code: 'MISSING_MATTER',
      });
    }

    if (!user) {
      throw Object.assign(new Error('User not found'), {
        statusCode: 404,
        code: 'MISSING_USER',
      });
    }

    if (['CLOSED', 'ARCHIVED'].includes(matter.status)) {
      throw Object.assign(new Error('Time cannot be posted to a closed or archived matter'), {
        statusCode: 409,
        code: 'MATTER_NOT_TIME_ELIGIBLE',
      });
    }

    const hours = toDecimal(params.hours);

    if (hours.lte(0)) {
      throw Object.assign(new Error('Hours must be greater than zero'), {
        statusCode: 422,
        code: 'INVALID_HOURS',
      });
    }

    if (hours.gt(24)) {
      throw Object.assign(new Error('Hours cannot exceed 24 for a single entry'), {
        statusCode: 422,
        code: 'HOURS_EXCEED_DAILY_LIMIT',
      });
    }

    const defaultRate = params.rate ? toDecimal(params.rate) : new Prisma.Decimal(0);

    return db.timeEntry.create({
      data: {
        tenantId: params.tenantId,
        matterId: params.matterId,
        userId: params.userId,
        entryDate: params.entryDate,
        hours,
        description: params.description.trim(),
        billable: params.billable ?? true,
        activityCode: params.activityCode ?? null,
        rate: defaultRate,
        amount: hours.mul(defaultRate),
        status: 'PENDING',
        source: params.source ?? 'MANUAL',
        timerSessionId: params.timerSessionId ?? null,
      },
    });
  }

  static async listMatterTimeEntries(
    db: any,
    params: {
      tenantId: string;
      matterId: string;
      page?: number;
      limit?: number;
      status?: string | null;
      userId?: string | null;
    },
  ) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 50;
    const skip = (page - 1) * limit;

    const where = {
      tenantId: params.tenantId,
      matterId: params.matterId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.userId ? { userId: params.userId } : {}),
    };

    const [data, total] = await Promise.all([
      db.timeEntry.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      db.timeEntry.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async summarizeMatterTime(
    db: any,
    params: {
      tenantId: string;
      matterId: string;
    },
  ) {
    const agg = await db.timeEntry.aggregate({
      where: {
        tenantId: params.tenantId,
        matterId: params.matterId,
      },
      _sum: {
        hours: true,
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      entryCount: agg._count.id,
      totalHours: toDecimal(agg._sum.hours),
      totalAmount: toDecimal(agg._sum.amount),
      generatedAt: new Date(),
    };
  }
}