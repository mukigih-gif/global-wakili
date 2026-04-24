import {
  Prisma,
  PrismaClient,
  TrustTransactionType,
} from '@prisma/client';

type DbClient = PrismaClient | Prisma.TransactionClient;

export type TrustInterestAllocationBasis =
  | 'MANUAL'
  | 'MATTER_BALANCE_PRO_RATA'
  | 'CLIENT_BALANCE_PRO_RATA';

export interface ManualTrustInterestAllocation {
  clientId?: string;
  matterId?: string;
  amount: Prisma.Decimal | number | string;
  description?: string;
}

export interface CalculateTrustInterestInput {
  tenantId: string;
  totalInterestAmount: Prisma.Decimal | number | string;
  matterIds?: string[];
  clientIds?: string[];
  asOfDate?: Date;
}

export interface CalculatedTrustInterestAllocation {
  clientId: string;
  matterId?: string;
  ledgerBalance: Prisma.Decimal;
  amount: Prisma.Decimal;
}

export interface PostTrustInterestInput {
  tenantId: string;
  trustAccountId: string;
  totalInterestAmount: Prisma.Decimal | number | string;
  transactionDate?: Date;
  postedById?: string;
  reference?: string;
  description?: string;
  allocationBasis: TrustInterestAllocationBasis;
  allocations?: ManualTrustInterestAllocation[];
  metadata?: Record<string, unknown>;
}

export interface PostedTrustInterestResult {
  trustTransactionIds: string[];
  clientTrustLedgerIds: string[];
  totalPosted: Prisma.Decimal;
  referencePrefix: string;
}

const ZERO = new Prisma.Decimal(0);

function decimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) return ZERO;
  return new Prisma.Decimal(value);
}

function money(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function assertPositiveAmount(amount: Prisma.Decimal, label: string): void {
  if (amount.lte(ZERO)) {
    throw new Error(`${label} must be greater than zero.`);
  }
}

function buildReference(prefix: string, index: number): string {
  return `${prefix}-${String(index + 1).padStart(3, '0')}`;
}

export class TrustInterestService {
  constructor(private readonly db: DbClient) {}

  async calculateProRataAllocations(
    input: CalculateTrustInterestInput,
  ): Promise<CalculatedTrustInterestAllocation[]> {
    const totalInterestAmount = money(decimal(input.totalInterestAmount));
    assertPositiveAmount(totalInterestAmount, 'totalInterestAmount');

    const grouped = await this.db.clientTrustLedger.groupBy({
      by: ['clientId', 'matterId'],
      where: {
        tenantId: input.tenantId,
        ...(input.clientIds?.length ? { clientId: { in: input.clientIds } } : {}),
        ...(input.matterIds?.length ? { matterId: { in: input.matterIds } } : {}),
        ...(input.asOfDate ? { transactionDate: { lte: input.asOfDate } } : {}),
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const positiveBalances = grouped
      .map((row) => {
        const ledgerBalance = decimal(row._sum.credit).minus(decimal(row._sum.debit));

        return {
          clientId: row.clientId,
          matterId: row.matterId ?? undefined,
          ledgerBalance,
        };
      })
      .filter((row) => row.ledgerBalance.gt(ZERO));

    if (positiveBalances.length === 0) {
      throw new Error('No positive client trust ledger balances found for interest allocation.');
    }

    const totalEligibleBalance = positiveBalances.reduce(
      (sum, row) => sum.plus(row.ledgerBalance),
      ZERO,
    );

    let allocatedSoFar = ZERO;

    return positiveBalances.map((row, index) => {
      const isLast = index === positiveBalances.length - 1;
      const amount = isLast
        ? totalInterestAmount.minus(allocatedSoFar)
        : money(totalInterestAmount.times(row.ledgerBalance).div(totalEligibleBalance));

      allocatedSoFar = allocatedSoFar.plus(amount);

      return {
        clientId: row.clientId,
        matterId: row.matterId,
        ledgerBalance: row.ledgerBalance,
        amount,
      };
    });
  }

  async postInterest(input: PostTrustInterestInput): Promise<PostedTrustInterestResult> {
    const totalInterestAmount = money(decimal(input.totalInterestAmount));
    assertPositiveAmount(totalInterestAmount, 'totalInterestAmount');

    return this.db.$transaction(async (tx) => {
      const trustAccount = await tx.trustAccount.findFirst({
        where: {
          id: input.trustAccountId,
          tenantId: input.tenantId,
        },
        select: {
          id: true,
          isActive: true,
          accountName: true,
        },
      });

      if (!trustAccount) {
        throw new Error('Trust account not found for tenant.');
      }

      if (!trustAccount.isActive) {
        throw new Error('Cannot post interest to an inactive trust account.');
      }

      const referencePrefix =
        input.reference ??
        `TRUST-INT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now()}`;

      const existing = await tx.trustTransaction.findFirst({
        where: {
          tenantId: input.tenantId,
          reference: {
            startsWith: referencePrefix,
          },
        },
        select: {
          id: true,
        },
      });

      if (existing) {
        throw new Error(`Trust interest reference already exists: ${referencePrefix}`);
      }

      const allocations =
        input.allocationBasis === 'MANUAL'
          ? await this.normalizeManualAllocations(tx, input)
          : await this.calculateProRataAllocationsUsingTx(tx, {
              tenantId: input.tenantId,
              totalInterestAmount,
            });

      this.validateAllocationTotal(totalInterestAmount, allocations);

      const trustTransactionIds: string[] = [];
      const clientTrustLedgerIds: string[] = [];
      const transactionDate = input.transactionDate ?? new Date();

      for (let index = 0; index < allocations.length; index += 1) {
        const allocation = allocations[index];
        const reference = buildReference(referencePrefix, index);

        const previousBalance = await this.getCurrentClientTrustBalance(tx, {
          tenantId: input.tenantId,
          clientId: allocation.clientId,
          matterId: allocation.matterId,
        });

        const newBalance = previousBalance.plus(allocation.amount);

        const trustTransaction = await tx.trustTransaction.create({
          data: {
            tenantId: input.tenantId,
            trustAccountId: input.trustAccountId,
            matterId: allocation.matterId,
            reference,
            description:
              input.description ??
              allocation.description ??
              `Trust interest allocation for ${trustAccount.accountName}`,
            transactionType: TrustTransactionType.INTEREST,
            amount: allocation.amount,
            debit: ZERO,
            credit: allocation.amount,
            transactionDate,
            postedDate: new Date(),
          },
          select: {
            id: true,
          },
        });

        const ledger = await tx.clientTrustLedger.create({
          data: {
            tenantId: input.tenantId,
            clientId: allocation.clientId,
            matterId: allocation.matterId,
            debit: ZERO,
            credit: allocation.amount,
            balance: newBalance,
            description:
              input.description ??
              allocation.description ??
              `Trust interest allocation ${reference}`,
            transactionDate,
          },
          select: {
            id: true,
          },
        });

        if (allocation.matterId) {
          await tx.matter.updateMany({
            where: {
              tenantId: input.tenantId,
              id: allocation.matterId,
            },
            data: {
              trustBalance: {
                increment: allocation.amount,
              },
            },
          });
        }

        trustTransactionIds.push(trustTransaction.id);
        clientTrustLedgerIds.push(ledger.id);
      }

      await tx.trustAccount.update({
        where: {
          id: input.trustAccountId,
        },
        data: {
          currentBalance: {
            increment: totalInterestAmount,
          },
        },
      });

      return {
        trustTransactionIds,
        clientTrustLedgerIds,
        totalPosted: totalInterestAmount,
        referencePrefix,
      };
    });
  }

  private async normalizeManualAllocations(
    tx: Prisma.TransactionClient,
    input: PostTrustInterestInput,
  ): Promise<
    Array<{
      clientId: string;
      matterId?: string;
      amount: Prisma.Decimal;
      description?: string;
    }>
  > {
    if (!input.allocations || input.allocations.length === 0) {
      throw new Error('Manual trust interest posting requires allocations.');
    }

    const matterIds = input.allocations
      .map((allocation) => allocation.matterId)
      .filter((matterId): matterId is string => Boolean(matterId));

    const matters = matterIds.length
      ? await tx.matter.findMany({
          where: {
            tenantId: input.tenantId,
            id: { in: matterIds },
          },
          select: {
            id: true,
            clientId: true,
          },
        })
      : [];

    const matterClientById = new Map(matters.map((matter) => [matter.id, matter.clientId]));

    return input.allocations.map((allocation) => {
      const amount = money(decimal(allocation.amount));
      assertPositiveAmount(amount, 'allocation.amount');

      const clientId =
        allocation.clientId ??
        (allocation.matterId ? matterClientById.get(allocation.matterId) : undefined);

      if (!clientId) {
        throw new Error(
          'Each manual trust interest allocation must provide clientId or a valid matterId.',
        );
      }

      return {
        clientId,
        matterId: allocation.matterId,
        amount,
        description: allocation.description,
      };
    });
  }

  private async calculateProRataAllocationsUsingTx(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      totalInterestAmount: Prisma.Decimal;
    },
  ): Promise<
    Array<{
      clientId: string;
      matterId?: string;
      amount: Prisma.Decimal;
      description?: string;
    }>
  > {
    const grouped = await tx.clientTrustLedger.groupBy({
      by: ['clientId', 'matterId'],
      where: {
        tenantId: input.tenantId,
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const positiveBalances = grouped
      .map((row) => ({
        clientId: row.clientId,
        matterId: row.matterId ?? undefined,
        ledgerBalance: decimal(row._sum.credit).minus(decimal(row._sum.debit)),
      }))
      .filter((row) => row.ledgerBalance.gt(ZERO));

    if (positiveBalances.length === 0) {
      throw new Error('No positive client trust ledger balances found for interest allocation.');
    }

    const totalEligibleBalance = positiveBalances.reduce(
      (sum, row) => sum.plus(row.ledgerBalance),
      ZERO,
    );

    let allocatedSoFar = ZERO;

    return positiveBalances.map((row, index) => {
      const isLast = index === positiveBalances.length - 1;
      const amount = isLast
        ? input.totalInterestAmount.minus(allocatedSoFar)
        : money(input.totalInterestAmount.times(row.ledgerBalance).div(totalEligibleBalance));

      allocatedSoFar = allocatedSoFar.plus(amount);

      return {
        clientId: row.clientId,
        matterId: row.matterId,
        amount,
        description: 'Pro-rata trust interest allocation',
      };
    });
  }

  private validateAllocationTotal(
    expectedTotal: Prisma.Decimal,
    allocations: Array<{ amount: Prisma.Decimal }>,
  ): void {
    const actualTotal = allocations.reduce((sum, allocation) => sum.plus(allocation.amount), ZERO);

    if (!actualTotal.equals(expectedTotal)) {
      throw new Error(
        `Trust interest allocation mismatch. Expected ${expectedTotal.toString()}, got ${actualTotal.toString()}.`,
      );
    }
  }

  private async getCurrentClientTrustBalance(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      clientId: string;
      matterId?: string;
    },
  ): Promise<Prisma.Decimal> {
    const totals = await tx.clientTrustLedger.aggregate({
      where: {
        tenantId: input.tenantId,
        clientId: input.clientId,
        matterId: input.matterId ?? null,
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    return decimal(totals._sum.credit).minus(decimal(totals._sum.debit));
  }
}