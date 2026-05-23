import {
  Prisma,
  prisma,
  ReconciliationStatus,
  ReconciliationVarianceStatus,
} from '@global-wakili/database';

export interface ListReconciliationMatchesInput {
  tenantId: string;
  runId?: string;
  status?: ReconciliationStatus | string;
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
  varianceStatus?: ReconciliationVarianceStatus | string;
  status?: ReconciliationStatus | string;
  notes?: string;
}

export interface UpdateReconciliationMatchInput {
  status?: ReconciliationStatus | string;
  notes?: string;
  varianceAmount?: Prisma.Decimal | number | string;
  varianceExplanation?: string;
  varianceStatus?: ReconciliationVarianceStatus | string;
}

function decimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined || value === '') {
    return new Prisma.Decimal(0);
  }

  return value instanceof Prisma.Decimal
    ? value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
    : new Prisma.Decimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function parseReconciliationStatus(
  value: ReconciliationStatus | string | null | undefined,
  fallback?: ReconciliationStatus,
): ReconciliationStatus | undefined {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toUpperCase();
  const allowed = Object.values(ReconciliationStatus);

  if (!allowed.includes(normalized as ReconciliationStatus)) {
    throw Object.assign(new Error('Invalid reconciliation match status'), {
      statusCode: 400,
      code: 'INVALID_RECONCILIATION_STATUS',
      details: { value, allowed },
    });
  }

  return normalized as ReconciliationStatus;
}

function parseVarianceStatus(
  value: ReconciliationVarianceStatus | string | null | undefined,
  fallback?: ReconciliationVarianceStatus,
): ReconciliationVarianceStatus | undefined {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toUpperCase();
  const allowed = Object.values(ReconciliationVarianceStatus);

  if (!allowed.includes(normalized as ReconciliationVarianceStatus)) {
    throw Object.assign(new Error('Invalid reconciliation variance status'), {
      statusCode: 400,
      code: 'INVALID_RECONCILIATION_VARIANCE_STATUS',
      details: { value, allowed },
    });
  }

  return normalized as ReconciliationVarianceStatus;
}

export class ReconciliationMatchService {
  async list(input: ListReconciliationMatchesInput) {
    const status = parseReconciliationStatus(input.status);

    return prisma.reconciliationMatch.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.runId ? { runId: input.runId } : {}),
        ...(status ? { status } : {}),
        ...(input.trustTransactionId ? { trustTransactionId: input.trustTransactionId } : {}),
        ...(input.clientTrustLedgerId ? { clientTrustLedgerId: input.clientTrustLedgerId } : {}),
        ...(input.bankTransactionId ? { bankTransactionId: input.bankTransactionId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(input.take ?? 100, 500),
      skip: input.skip ?? 0,
    });
  }

  async getById(tenantId: string, id: string) {
    return prisma.reconciliationMatch.findFirst({
      where: { id, tenantId },
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
        matchedAmount: decimal(input.matchedAmount),
        varianceAmount: decimal(input.varianceAmount),
        varianceExplanation: input.varianceExplanation,
        varianceStatus: parseVarianceStatus(input.varianceStatus, ReconciliationVarianceStatus.NONE),
        status: parseReconciliationStatus(input.status, ReconciliationStatus.PENDING),
        notes: input.notes,
      },
    });
  }

  async update(tenantId: string, id: string, input: UpdateReconciliationMatchInput) {
    const existing = await this.getById(tenantId, id);

    if (!existing) {
      throw Object.assign(new Error('Reconciliation match not found'), {
        statusCode: 404,
        code: 'RECONCILIATION_MATCH_NOT_FOUND',
      });
    }

    const data: Prisma.ReconciliationMatchUpdateInput = {};

    const status = parseReconciliationStatus(input.status);
    const varianceStatus = parseVarianceStatus(input.varianceStatus);

    if (status) data.status = status;
    if (varianceStatus) data.varianceStatus = varianceStatus;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.varianceAmount !== undefined) data.varianceAmount = decimal(input.varianceAmount);
    if (input.varianceExplanation !== undefined) data.varianceExplanation = input.varianceExplanation;

    return prisma.reconciliationMatch.update({
      where: { id },
      data,
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
      throw Object.assign(new Error('Reconciliation match not found'), {
        statusCode: 404,
        code: 'RECONCILIATION_MATCH_NOT_FOUND',
      });
    }

    return prisma.reconciliationMatch.update({
      where: { id: input.id },
      data: {
        varianceStatus: ReconciliationVarianceStatus.APPROVED,
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
      throw Object.assign(new Error('Reconciliation match not found'), {
        statusCode: 404,
        code: 'RECONCILIATION_MATCH_NOT_FOUND',
      });
    }

    return prisma.reconciliationMatch.update({
      where: { id: input.id },
      data: {
        varianceStatus: ReconciliationVarianceStatus.REJECTED,
        ...(input.explanation ? { varianceExplanation: input.explanation } : {}),
      },
    });
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.getById(tenantId, id);

    if (!existing) {
      throw Object.assign(new Error('Reconciliation match not found'), {
        statusCode: 404,
        code: 'RECONCILIATION_MATCH_NOT_FOUND',
      });
    }

    return prisma.reconciliationMatch.delete({
      where: { id },
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
            status: ReconciliationStatus.PENDING,
          },
        }),
        prisma.reconciliationMatch.count({
          where: {
            tenantId,
            ...(runId ? { runId } : {}),
            varianceStatus: ReconciliationVarianceStatus.APPROVED,
          },
        }),
        prisma.reconciliationMatch.count({
          where: {
            tenantId,
            ...(runId ? { runId } : {}),
            varianceStatus: ReconciliationVarianceStatus.REJECTED,
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