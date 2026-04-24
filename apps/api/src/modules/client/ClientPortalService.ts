import { Prisma } from '@global-wakili/database';

function toDecimal(value: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) return new Prisma.Decimal(0);
  return new Prisma.Decimal(value);
}

function normalizeMatterView(matter: any) {
  return {
    id: matter.id,
    title: matter.title,
    matterCode: matter.matterCode ?? null,
    status: matter.status,
    matterType: String(matter.metadata?.matterType ?? 'OTHER').toUpperCase(),
    workflowType: String(matter.metadata?.workflowType ?? 'GENERAL').toUpperCase(),
    progressStage: matter.metadata?.progressStage ?? null,
    progressPercent: matter.metadata?.progressPercent ?? null,
    openedDate: matter.openedDate,
    nextKeyDate: matter.metadata?.calendar?.nextKeyDate ?? null,
    nextCourtDate: matter.metadata?.calendar?.nextCourtDate ?? null,
    portalVisible: matter.metadata?.portalVisible !== false,
    documents: {
      folderId: matter.metadata?.documents?.folderId ?? null,
      documentCount: matter.metadata?.documents?.documentCount ?? null,
    },
  };
}

export class ClientPortalService {
  static async assertPortalAccess(
    db: any,
    params: {
      tenantId: string;
      clientId: string;
      portalUserId: string;
    },
  ) {
    const client = await db.client.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.clientId,
        portalUserId: params.portalUserId,
      },
      select: {
        id: true,
        name: true,
        clientCode: true,
        portalUserId: true,
        status: true,
      },
    });

    if (!client) {
      throw Object.assign(new Error('Client portal profile not found'), {
        statusCode: 404,
        code: 'CLIENT_PORTAL_NOT_FOUND',
      });
    }

    return client;
  }

  static async getPortalDashboard(
    db: any,
    params: {
      tenantId: string;
      clientId: string;
      portalUserId: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 50) : 10;
    const skip = (page - 1) * limit;

    const client = await this.assertPortalAccess(db, params);

    const [matters, invoices, invoiceAgg] = await Promise.all([
      db.matter.findMany({
        where: {
          tenantId: params.tenantId,
          clientId: params.clientId,
        },
        select: {
          id: true,
          title: true,
          matterCode: true,
          status: true,
          openedDate: true,
          metadata: true,
        },
        orderBy: [{ openedDate: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.invoice.findMany({
        where: {
          tenantId: params.tenantId,
          clientId: params.clientId,
        },
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          paidAmount: true,
          status: true,
          issuedDate: true,
          dueDate: true,
        },
        orderBy: [{ issuedDate: 'desc' }, { id: 'desc' }],
        take: 10,
      }),
      db.invoice.aggregate({
        where: {
          tenantId: params.tenantId,
          clientId: params.clientId,
        },
        _sum: {
          total: true,
          paidAmount: true,
        },
        _count: {
          id: true,
        },
      }),
    ]);

    const visibleMatters = matters
      .filter((matter: any) => matter.metadata?.portalVisible !== false)
      .map(normalizeMatterView);

    const totalInvoiced = toDecimal(invoiceAgg._sum.total);
    const totalPaid = toDecimal(invoiceAgg._sum.paidAmount);

    return {
      client: {
        id: client.id,
        name: client.name,
        clientCode: client.clientCode ?? null,
        status: client.status,
      },
      portal: {
        enabled: Boolean(client.portalUserId),
        portalUserId: client.portalUserId,
      },
      recentMatters: visibleMatters,
      recentInvoices: invoices,
      financials: {
        invoiceCount: invoiceAgg._count.id,
        totalInvoiced,
        totalPaid,
        outstanding: totalInvoiced.minus(totalPaid),
      },
      meta: {
        page,
        limit,
      },
      generatedAt: new Date(),
    };
  }

  static async listPortalMatters(
    db: any,
    params: {
      tenantId: string;
      clientId: string;
      portalUserId: string;
      page?: number;
      limit?: number;
      search?: string;
    },
  ) {
    await this.assertPortalAccess(db, params);

    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 25;
    const skip = (page - 1) * limit;
    const search = params.search?.trim() ?? '';

    const where = {
      tenantId: params.tenantId,
      clientId: params.clientId,
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { matterCode: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [matters, total] = await Promise.all([
      db.matter.findMany({
        where,
        select: {
          id: true,
          title: true,
          matterCode: true,
          status: true,
          openedDate: true,
          metadata: true,
        },
        orderBy: [{ openedDate: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.matter.count({ where }),
    ]);

    const data = matters
      .filter((matter: any) => matter.metadata?.portalVisible !== false)
      .map(normalizeMatterView);

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
}