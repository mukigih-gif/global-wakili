import { Prisma } from '@global-wakili/database';
import type {
  MatterInput,
  MatterValidationIssue,
  MatterValidationResult,
  TenantMatterDbClient,
} from './matter.types';

function normalizeCurrency(currency?: string | null): string | null {
  return currency?.trim().toUpperCase() || null;
}

function toDecimal(value: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return new Prisma.Decimal(value);
}

function buildMatterMetadata(input: MatterInput): Record<string, unknown> | null {
  const extra = {
    matterReference: input.matterReference ?? null,
    originatorId: input.originatorId ?? null,
    assigneeId: input.assigneeId ?? null,
    progressPercent: input.progressPercent ?? null,
    progressStage: input.progressStage ?? null,
    billing: input.billing ?? null,
    documents: input.documents ?? null,
    calendar: input.calendar ?? null,
    invoice: input.invoice ?? null,
    reports: input.reports ?? null,
  };

  return {
    ...(input.metadata ?? {}),
    ...extra,
  };
}

export class MatterService {
  static async validateCreate(
    db: TenantMatterDbClient,
    tenantId: string,
    input: MatterInput,
  ): Promise<MatterValidationResult> {
    const issues: MatterValidationIssue[] = [];

    const [client, branch, existingCode, partner, assignee, originator] = await Promise.all([
      db.client.findFirst({
        where: {
          tenantId,
          id: input.clientId,
        },
        select: {
          id: true,
          tenantId: true,
          branchId: true,
        },
      }),
      input.branchId
        ? db.branch.findFirst({
            where: {
              tenantId,
              id: input.branchId,
            },
            select: {
              id: true,
              tenantId: true,
            },
          })
        : Promise.resolve(null),
      input.matterCode
        ? db.matter.findFirst({
            where: {
              tenantId,
              matterCode: input.matterCode.trim(),
            },
            select: { id: true },
          })
        : Promise.resolve(null),
      input.partnerId
        ? db.user.findFirst({
            where: {
              tenantId,
              id: input.partnerId,
              status: 'ACTIVE',
            },
            select: { id: true, tenantId: true },
          })
        : Promise.resolve(null),
      input.assigneeId
        ? db.user.findFirst({
            where: {
              tenantId,
              id: input.assigneeId,
              status: 'ACTIVE',
            },
            select: { id: true, tenantId: true },
          })
        : Promise.resolve(null),
      input.originatorId
        ? db.user.findFirst({
            where: {
              tenantId,
              id: input.originatorId,
              status: 'ACTIVE',
            },
            select: { id: true, tenantId: true },
          })
        : Promise.resolve(null),
    ]);

    if (!client) {
      issues.push({
        code: 'MISSING_CLIENT',
        message: 'Client not found for tenant.',
      });
    }

    if (input.branchId && !branch) {
      issues.push({
        code: 'INVALID_BRANCH',
        message: 'Branch not found for tenant.',
      });
    }

    if (existingCode) {
      issues.push({
        code: 'DUPLICATE_MATTER_CODE',
        message: 'Matter code already exists.',
      });
    }

    if (input.partnerId && !partner) {
      issues.push({
        code: 'INVALID_PARTNER',
        message: 'Partner not found for tenant or inactive.',
      });
    }

    if (input.assigneeId && !assignee) {
      issues.push({
        code: 'INVALID_ASSIGNEE',
        message: 'Assignee not found for tenant or inactive.',
      });
    }

    if (input.originatorId && !originator) {
      issues.push({
        code: 'INVALID_ASSIGNEE',
        message: 'Originator not found for tenant or inactive.',
      });
    }

    if (input.closeDate && input.openedDate && input.closeDate < input.openedDate) {
      issues.push({
        code: 'INVALID_DATES',
        message: 'Close date cannot be before opened date.',
      });
    }

    if (input.branchId && branch && branch.tenantId !== tenantId) {
      issues.push({
        code: 'TENANT_BRANCH_CONFLICT',
        message: 'Branch does not belong to the current tenant.',
      });
    }

    if (client && input.branchId && client.branchId && client.branchId !== input.branchId) {
      issues.push({
        code: 'CLIENT_BRANCH_CONFLICT',
        message: 'Matter branch conflicts with the client branch.',
        meta: {
          clientBranchId: client.branchId,
          matterBranchId: input.branchId,
        },
      });
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  static async create(
    db: TenantMatterDbClient,
    tenantId: string,
    input: MatterInput,
  ) {
    const validation = await this.validateCreate(db, tenantId, input);

    if (!validation.valid) {
      throw Object.assign(new Error('Matter validation failed'), {
        statusCode: 422,
        code: 'MATTER_VALIDATION_FAILED',
        details: validation.issues,
      });
    }

    return db.matter.create({
      data: {
        tenantId,
        matterCode: input.matterCode?.trim() ?? null,
        title: input.title.trim(),
        description: input.description?.trim() ?? null,
        clientId: input.clientId,
        branchId: input.branchId ?? null,
        status: input.status ?? 'ACTIVE',
        billingModel: input.billingModel ?? 'HOURLY',
        currency: normalizeCurrency(input.currency) ?? 'KES',
        openedDate: input.openedDate ?? new Date(),
        closeDate: input.closeDate ?? null,
        partnerId: input.partnerId ?? null,
        assignedLawyerId: input.assigneeId ?? null,
        estimatedValue: toDecimal(input.estimatedValue),
        metadata: buildMatterMetadata(input),
      },
    });
  }

  static async update(
    db: TenantMatterDbClient,
    tenantId: string,
    matterId: string,
    input: Partial<MatterInput>,
  ) {
    const existing = await db.matter.findFirst({
      where: {
        tenantId,
        id: matterId,
      },
      select: {
        id: true,
        clientId: true,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Matter not found'), {
        statusCode: 404,
        code: 'MISSING_MATTER',
      });
    }

    const effectiveClientId = input.clientId ?? existing.clientId;

    const [client, branch, duplicateCode, partner, assignee, originator] = await Promise.all([
      db.client.findFirst({
        where: {
          tenantId,
          id: effectiveClientId,
        },
        select: {
          id: true,
          tenantId: true,
          branchId: true,
        },
      }),
      input.branchId
        ? db.branch.findFirst({
            where: {
              tenantId,
              id: input.branchId,
            },
            select: {
              id: true,
              tenantId: true,
            },
          })
        : Promise.resolve(null),
      input.matterCode
        ? db.matter.findFirst({
            where: {
              tenantId,
              matterCode: input.matterCode.trim(),
              id: { not: matterId },
            },
            select: { id: true },
          })
        : Promise.resolve(null),
      input.partnerId
        ? db.user.findFirst({
            where: {
              tenantId,
              id: input.partnerId,
              status: 'ACTIVE',
            },
            select: { id: true, tenantId: true },
          })
        : Promise.resolve(null),
      input.assigneeId
        ? db.user.findFirst({
            where: {
              tenantId,
              id: input.assigneeId,
              status: 'ACTIVE',
            },
            select: { id: true, tenantId: true },
          })
        : Promise.resolve(null),
      input.originatorId
        ? db.user.findFirst({
            where: {
              tenantId,
              id: input.originatorId,
              status: 'ACTIVE',
            },
            select: { id: true, tenantId: true },
          })
        : Promise.resolve(null),
    ]);

    const issues: MatterValidationIssue[] = [];

    if (!client) {
      issues.push({
        code: 'MISSING_CLIENT',
        message: 'Client not found for tenant.',
      });
    }

    if (input.branchId && !branch) {
      issues.push({
        code: 'INVALID_BRANCH',
        message: 'Branch not found for tenant.',
      });
    }

    if (duplicateCode) {
      issues.push({
        code: 'DUPLICATE_MATTER_CODE',
        message: 'Matter code already exists.',
      });
    }

    if (input.partnerId && !partner) {
      issues.push({
        code: 'INVALID_PARTNER',
        message: 'Partner not found for tenant or inactive.',
      });
    }

    if (input.assigneeId && !assignee) {
      issues.push({
        code: 'INVALID_ASSIGNEE',
        message: 'Assignee not found for tenant or inactive.',
      });
    }

    if (input.originatorId && !originator) {
      issues.push({
        code: 'INVALID_ASSIGNEE',
        message: 'Originator not found for tenant or inactive.',
      });
    }

    if (input.closeDate && input.openedDate && input.closeDate < input.openedDate) {
      issues.push({
        code: 'INVALID_DATES',
        message: 'Close date cannot be before opened date.',
      });
    }

    if (input.branchId && branch && branch.tenantId !== tenantId) {
      issues.push({
        code: 'TENANT_BRANCH_CONFLICT',
        message: 'Branch does not belong to the current tenant.',
      });
    }

    if (client && input.branchId && client.branchId && client.branchId !== input.branchId) {
      issues.push({
        code: 'CLIENT_BRANCH_CONFLICT',
        message: 'Matter branch conflicts with the client branch.',
        meta: {
          clientBranchId: client.branchId,
          matterBranchId: input.branchId,
        },
      });
    }

    if (issues.length) {
      throw Object.assign(new Error('Matter update validation failed'), {
        statusCode: 422,
        code: 'MATTER_VALIDATION_FAILED',
        details: issues,
      });
    }

    return db.matter.update({
      where: { id: matterId },
      data: {
        ...(input.matterCode !== undefined ? { matterCode: input.matterCode?.trim() ?? null } : {}),
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description?.trim() ?? null } : {}),
        ...(input.clientId !== undefined ? { clientId: input.clientId } : {}),
        ...(input.branchId !== undefined ? { branchId: input.branchId ?? null } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.billingModel !== undefined ? { billingModel: input.billingModel } : {}),
        ...(input.currency !== undefined ? { currency: normalizeCurrency(input.currency) ?? 'KES' } : {}),
        ...(input.openedDate !== undefined ? { openedDate: input.openedDate ?? new Date() } : {}),
        ...(input.closeDate !== undefined ? { closeDate: input.closeDate ?? null } : {}),
        ...(input.partnerId !== undefined ? { partnerId: input.partnerId ?? null } : {}),
        ...(input.assigneeId !== undefined ? { assignedLawyerId: input.assigneeId ?? null } : {}),
        ...(input.estimatedValue !== undefined
          ? { estimatedValue: toDecimal(input.estimatedValue) }
          : {}),
        ...(input.metadata !== undefined ||
        input.matterReference !== undefined ||
        input.originatorId !== undefined ||
        input.assigneeId !== undefined ||
        input.progressPercent !== undefined ||
        input.progressStage !== undefined ||
        input.billing !== undefined ||
        input.documents !== undefined ||
        input.calendar !== undefined ||
        input.invoice !== undefined ||
        input.reports !== undefined
          ? { metadata: buildMatterMetadata(input as MatterInput) }
          : {}),
      },
    });
  }

  static async listOpen(
    db: TenantMatterDbClient,
    tenantId: string,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
    },
  ) {
    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit = params?.limit && params.limit > 0 ? Math.min(params.limit, 100) : 50;
    const skip = (page - 1) * limit;
    const search = params?.search?.trim() ?? '';

    const where = {
      tenantId,
      status: {
        in: ['ACTIVE', 'ON_HOLD'],
      },
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { matterCode: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      db.matter.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: [{ openedDate: 'desc' }],
      }),
      db.matter.count ? db.matter.count({ where }) : Promise.resolve(0),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }

  static async getById(db: TenantMatterDbClient, tenantId: string, matterId: string) {
    return db.matter.findFirst({
      where: {
        tenantId,
        id: matterId,
      },
      include: {
        client: true,
        invoices: {
          orderBy: [{ issuedDate: 'desc' }],
        },
        trustTransactions: {
          orderBy: [{ transactionDate: 'desc' }],
        },
      },
    });
  }

  static async getOverview(db: TenantMatterDbClient, tenantId: string, matterId: string) {
    return db.matter.findFirst({
      where: {
        tenantId,
        id: matterId,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            clientCode: true,
          },
        },
        invoices: {
          take: 5,
          orderBy: [{ createdAt: 'desc' }],
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            paidAmount: true,
            status: true,
          },
        },
        trustTransactions: {
          take: 5,
          orderBy: [{ transactionDate: 'desc' }],
          select: {
            id: true,
            amount: true,
            type: true,
            transactionDate: true,
          },
        },
        _count: {
          select: {
            invoices: true,
            trustTransactions: true,
            expenseEntries: true,
          },
        },
      },
    });
  }
}