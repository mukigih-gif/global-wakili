import { MatterWorkflowService } from './MatterWorkflowService';

export class MatterQueryService {
  static async listMatters(
    db: any,
    params: {
      tenantId: string;
      page?: number;
      limit?: number;
      search?: string;
      statuses?: string[];
      clientId?: string | null;
      branchId?: string | null;
      matterType?: string | null;
      workflowType?: string | null;
    },
  ) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 50;
    const skip = (page - 1) * limit;
    const search = params.search?.trim() ?? '';

    const where: Record<string, unknown> = {
      tenantId: params.tenantId,
    };

    if (params.statuses?.length) {
      where.status = { in: params.statuses };
    }

    if (params.clientId) where.clientId = params.clientId;
    if (params.branchId) where.branchId = params.branchId;

    const andFilters: any[] = [];
    if (search) {
      andFilters.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { matterCode: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (params.matterType) {
      andFilters.push({
        metadata: {
          path: ['matterType'],
          equals: MatterWorkflowService.normalizeMatterType(params.matterType),
        },
      });
    }

    if (params.workflowType) {
      andFilters.push({
        metadata: {
          path: ['workflowType'],
          equals: MatterWorkflowService.resolveWorkflowType(params.workflowType),
        },
      });
    }

    if (andFilters.length) {
      where.AND = andFilters;
    }

    const [data, total] = await Promise.all([
      db.matter.findMany({
        where,
        select: {
          id: true,
          matterCode: true,
          title: true,
          status: true,
          billingModel: true,
          openedDate: true,
          metadata: true,
          client: {
            select: {
              id: true,
              name: true,
              clientCode: true,
            },
          },
        },
        orderBy: [{ openedDate: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.matter.count({ where }),
    ]);

    return {
      data: data.map((matter: any) => ({
        ...matter,
        metadata: MatterWorkflowService.normalizeMetadata(matter.metadata),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getMatterProfile(
    db: any,
    params: {
      tenantId: string;
      matterId: string;
    },
  ) {
    const matter = await db.matter.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.matterId,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            clientCode: true,
          },
        },
      },
    });

    if (!matter) return null;

    return {
      ...matter,
      metadata: MatterWorkflowService.normalizeMetadata(matter.metadata),
    };
  }
}