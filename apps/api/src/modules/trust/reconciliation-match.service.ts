import { Prisma, prisma } from '@global-wakili/database';

export interface ListReconciliationMatchesInput {
  tenantId: string;
  runId?: string;
  status?: string;
  trustTransactionId?: string;
  clientTrustLedgerId?: string;
  bankTransactionId?: string;
  take?: number;
  skip?: number;
}

export interface CreateReconciliationMatchInput {
  tenantId: string;
  runId: string;
  bankTransactionId?: string;
  trustTransactionId?: string;
  clientTrustLedgerId?: string;
  matchType: string;
  matchedAmount: Prisma.Decimal | number | string;
  varianceAmount?: Prisma.Decimal | number | string;
  varianceExplanation?: string;
  status?: string;
  notes?: string;
}

export interface UpdateReconciliationMatchInput {
  status?: string;
  notes?: string;
  varianceAmount?: Prisma.Decimal | number | string;
  varianceExplanation?: string;
  varianceStatus?: string;
}

export class ReconciliationMatchService {
  async list(input: ListReconciliationMatchesInput) {
    return prisma.reconciliationMatch.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.runId ? { runId: input.runId } : {}),
        ...(input.status ? { status: input.status as any } : {}),
        ...(input.trustTransactionId ? { trustTransactionId: input.trustTransactionId } : {}),
        ...(input.clientTrustLedgerId ? { clientTrustLedgerId: input.clientTrustLedgerId } : {}),
        ...(input.bankTransactionId ? { bankTransactionId: input.bankTransactionId } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: input.take ?? 100,
      skip: input.skip ?? 0,
    });
  }

  async getById(tenantId: string, id: string) {
    return prisma.reconciliationMatch.findFirst({
      where: {
        id,
        tenantId,
      },
    });
  }

  async create(input: CreateReconciliationMatchInput) {
    return prisma.reconciliationMatch.create({
      data: {
        tenantId: input.tenantId,
        runId: input.runId,
        bankTransactionId: input.bankTransactionId,
        trustTransactionId: input.trustTransactionId,
        clientTrustLedgerId: input.clientTrustLedgerId,
        matchType: input.matchType,
        matchedAmount: new Prisma.Decimal(input.matchedAmount),
        varianceAmount: input.varianceAmount
          ? new Prisma.Decimal(input.varianceAmount)
          : new Prisma.Decimal(0),
        varianceExplanation: input.varianceExplanation,
        status: (input.status ?? 'PENDING') as any,
        notes: input.notes,
      },
    });
  }

  async update(tenantId: string, id: string, input: UpdateReconciliationMatchInput) {
    const existing = await this.getById(tenantId, id);

    if (!existing) {
      throw new Error('Reconciliation match not found.');
    }

    return prisma.reconciliationMatch.update({
      where: {
        id,
      },
      data: {
        ...(input.status ? { status: input.status as any } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.varianceAmount !== undefined
          ? { varianceAmount: new Prisma.Decimal(input.varianceAmount) }
          : {}),
        ...(input.varianceExplanation !== undefined
          ? { varianceExplanation: input.varianceExplanation }
          : {}),
        ...(input.varianceStatus ? { varianceStatus: input.varianceStatus as any } : {}),
      },
    });
  }

  async approveVariance(input: {
    tenantId: string;
    id: string;
    approvedById: string;
    explanation?: string;
  }) {
    const existing = await this.getById(input.tenantId, input.id);

    if (!existing) {
      throw new Error('Reconciliation match not found.');
    }

    return prisma.reconciliationMatch.update({
      where: {
        id: input.id,
      },
      data: {
        varianceStatus: 'APPROVED' as any,
        varianceApprovedBy: input.approvedById,
        varianceApprovedAt: new Date(),
        ...(input.explanation ? { varianceExplanation: input.explanation } : {}),
      },
    });
  }

  async rejectVariance(input: {
    tenantId: string;
    id: string;
    explanation?: string;
  }) {
    const existing = await this.getById(input.tenantId, input.id);

    if (!existing) {
      throw new Error('Reconciliation match not found.');
    }

    return prisma.reconciliationMatch.update({
      where: {
        id: input.id,
      },
      data: {
        varianceStatus: 'REJECTED' as any,
        ...(input.explanation ? { varianceExplanation: input.explanation } : {}),
      },
    });
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.getById(tenantId, id);

    if (!existing) {
      throw new Error('Reconciliation match not found.');
    }

    return prisma.reconciliationMatch.delete({
      where: {
        id,
      },
    });
  }

  async getSummary(tenantId: string, runId?: string) {
    const [total, pending, approvedVariance, rejectedVariance, aggregate] =
      await Promise.all([
        prisma.reconciliationMatch.count({
          where: {
            tenantId,
            ...(runId ? { runId } : {}),
          },
        }),
        prisma.reconciliationMatch.count({
          where: {
            tenantId,
            ...(runId ? { runId } : {}),
            status: 'PENDING' as any,
          },
        }),
        prisma.reconciliationMatch.count({
          where: {
            tenantId,
            ...(runId ? { runId } : {}),
            varianceStatus: 'APPROVED' as any,
          },
        }),
        prisma.reconciliationMatch.count({
          where: {
            tenantId,
            ...(runId ? { runId } : {}),
            varianceStatus: 'REJECTED' as any,
          },
        }),
        prisma.reconciliationMatch.aggregate({
          where: {
            tenantId,
            ...(runId ? { runId } : {}),
          },
          _sum: {
            matchedAmount: true,
            varianceAmount: true,
          },
        }),
      ]);

    return {
      total,
      pending,
      approvedVariance,
      rejectedVariance,
      totalMatchedAmount: aggregate._sum.matchedAmount ?? new Prisma.Decimal(0),
      totalVarianceAmount: aggregate._sum.varianceAmount ?? new Prisma.Decimal(0),
    };
  }
}

export const reconciliationMatchService = new ReconciliationMatchService();

export default ReconciliationMatchService;