import {
  NotificationChannel,
  NotificationStatus,
  Prisma,
  PrismaClient,
  TenantRole,
  UserStatus,
} from '@prisma/client';

type DbClient = PrismaClient | Prisma.TransactionClient;

export type TrustAlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type TrustAlertCode =
  | 'NEGATIVE_TRUST_ACCOUNT_BALANCE'
  | 'INACTIVE_TRUST_ACCOUNT_HAS_BALANCE'
  | 'TENANT_LEDGER_BANK_MISMATCH'
  | 'STALE_TRUST_RECONCILIATION'
  | 'OLD_UNRECONCILED_TRUST_TRANSACTIONS'
  | 'UNPOSTED_TRUST_TRANSACTIONS';

export interface TrustAlert {
  code: TrustAlertCode;
  severity: TrustAlertSeverity;
  title: string;
  message: string;
  tenantId: string;
  trustAccountId?: string;
  entityType?: string;
  entityId?: string;
  amount?: Prisma.Decimal;
  metadata?: Record<string, unknown>;
}

export interface TrustAlertScanOptions {
  tenantId: string;
  asOfDate?: Date;
  staleReconciliationDays?: number;
  unreconciledAgeDays?: number;
  emitNotifications?: boolean;
}

export interface EmitTrustAlertInput {
  tenantId: string;
  alert: TrustAlert;
  recipientUserIds?: string[];
  debounceKey?: string;
}

export interface TrustBalanceSummary {
  tenantId: string;
  totalTrustBankBalance: Prisma.Decimal;
  totalClientLedgerBalance: Prisma.Decimal;
  variance: Prisma.Decimal;
}

const ZERO = new Prisma.Decimal(0);

function decimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) return ZERO;
  return new Prisma.Decimal(value);
}

function daysBefore(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - days);
  return copy;
}

function severityPriority(severity: TrustAlertSeverity): string {
  switch (severity) {
    case 'CRITICAL':
      return 'critical';
    case 'WARNING':
      return 'high';
    default:
      return 'normal';
  }
}

export class TrustAlertService {
  constructor(private readonly db: DbClient) {}

  async scanTenant(options: TrustAlertScanOptions): Promise<TrustAlert[]> {
    const asOfDate = options.asOfDate ?? new Date();
    const staleReconciliationDays = options.staleReconciliationDays ?? 30;
    const unreconciledAgeDays = options.unreconciledAgeDays ?? 14;

    const alerts: TrustAlert[] = [];

    alerts.push(...(await this.detectNegativeTrustBalances(options.tenantId)));
    alerts.push(...(await this.detectInactiveAccountsWithBalances(options.tenantId)));
    alerts.push(...(await this.detectTenantLedgerBankMismatch(options.tenantId)));
    alerts.push(
      ...(await this.detectStaleReconciliations({
        tenantId: options.tenantId,
        asOfDate,
        staleReconciliationDays,
      })),
    );
    alerts.push(
      ...(await this.detectOldUnreconciledTransactions({
        tenantId: options.tenantId,
        asOfDate,
        unreconciledAgeDays,
      })),
    );
    alerts.push(...(await this.detectUnpostedTransactions(options.tenantId)));

    if (options.emitNotifications && alerts.length > 0) {
      for (const alert of alerts) {
        await this.emitTrustAlert({
          tenantId: options.tenantId,
          alert,
          debounceKey: `${alert.code}:${alert.entityId ?? alert.trustAccountId ?? options.tenantId}`,
        });
      }
    }

    return alerts;
  }

  async getTrustBalanceSummary(tenantId: string): Promise<TrustBalanceSummary> {
    const [accounts, ledgerTotals] = await Promise.all([
      this.db.trustAccount.findMany({
        where: { tenantId },
        select: {
          currentBalance: true,
        },
      }),
      this.db.clientTrustLedger.aggregate({
        where: { tenantId },
        _sum: {
          debit: true,
          credit: true,
        },
      }),
    ]);

    const totalTrustBankBalance = accounts.reduce(
      (sum, account) => sum.plus(decimal(account.currentBalance)),
      ZERO,
    );

    const totalClientLedgerBalance = decimal(ledgerTotals._sum.credit).minus(
      decimal(ledgerTotals._sum.debit),
    );

    return {
      tenantId,
      totalTrustBankBalance,
      totalClientLedgerBalance,
      variance: totalTrustBankBalance.minus(totalClientLedgerBalance),
    };
  }

  async emitTrustAlert(input: EmitTrustAlertInput): Promise<number> {
    const recipients =
      input.recipientUserIds && input.recipientUserIds.length > 0
        ? await this.db.user.findMany({
            where: {
              tenantId: input.tenantId,
              id: { in: input.recipientUserIds },
              status: UserStatus.ACTIVE,
            },
            select: {
              id: true,
            },
          })
        : await this.getDefaultTrustAlertRecipients(input.tenantId);

    if (recipients.length === 0) return 0;

    await this.db.notification.createMany({
      data: recipients.map((recipient) => ({
        tenantId: input.tenantId,
        userId: recipient.id,
        channel: NotificationChannel.SYSTEM_ALERT,
        status: NotificationStatus.PENDING,
        systemTitle: input.alert.title,
        systemMessage: input.alert.message,
        category: 'TRUST_ACCOUNTING',
        priority: severityPriority(input.alert.severity),
        entityType: input.alert.entityType ?? 'TrustAlert',
        entityId: input.alert.entityId ?? input.alert.trustAccountId,
        debounceKey: input.debounceKey
          ? `${input.debounceKey}:${recipient.id}`
          : `trust-alert:${input.alert.code}:${recipient.id}:${input.alert.entityId ?? input.alert.trustAccountId ?? input.tenantId}`,
        metadata: {
          code: input.alert.code,
          severity: input.alert.severity,
          trustAccountId: input.alert.trustAccountId,
          amount: input.alert.amount?.toString(),
          ...input.alert.metadata,
        },
      })),
      skipDuplicates: true,
    });

    return recipients.length;
  }

  private async detectNegativeTrustBalances(tenantId: string): Promise<TrustAlert[]> {
    const accounts = await this.db.trustAccount.findMany({
      where: {
        tenantId,
        currentBalance: {
          lt: ZERO,
        },
      },
      select: {
        id: true,
        accountName: true,
        accountNumber: true,
        currentBalance: true,
      },
    });

    return accounts.map((account) => ({
      tenantId,
      code: 'NEGATIVE_TRUST_ACCOUNT_BALANCE',
      severity: 'CRITICAL',
      title: 'Negative trust account balance detected',
      message: `Trust account ${account.accountName} (${account.accountNumber}) has a negative balance of ${account.currentBalance.toString()}. Immediate review is required.`,
      trustAccountId: account.id,
      entityType: 'TrustAccount',
      entityId: account.id,
      amount: account.currentBalance,
      metadata: {
        accountName: account.accountName,
        accountNumber: account.accountNumber,
      },
    }));
  }

  private async detectInactiveAccountsWithBalances(tenantId: string): Promise<TrustAlert[]> {
    const accounts = await this.db.trustAccount.findMany({
      where: {
        tenantId,
        isActive: false,
        currentBalance: {
          not: ZERO,
        },
      },
      select: {
        id: true,
        accountName: true,
        accountNumber: true,
        currentBalance: true,
      },
    });

    return accounts.map((account) => ({
      tenantId,
      code: 'INACTIVE_TRUST_ACCOUNT_HAS_BALANCE',
      severity: 'WARNING',
      title: 'Inactive trust account still has funds',
      message: `Inactive trust account ${account.accountName} (${account.accountNumber}) still has a balance of ${account.currentBalance.toString()}.`,
      trustAccountId: account.id,
      entityType: 'TrustAccount',
      entityId: account.id,
      amount: account.currentBalance,
      metadata: {
        accountName: account.accountName,
        accountNumber: account.accountNumber,
      },
    }));
  }

  private async detectTenantLedgerBankMismatch(tenantId: string): Promise<TrustAlert[]> {
    const summary = await this.getTrustBalanceSummary(tenantId);

    if (summary.variance.equals(ZERO)) return [];

    return [
      {
        tenantId,
        code: 'TENANT_LEDGER_BANK_MISMATCH',
        severity: 'CRITICAL',
        title: 'Trust bank and client ledger mismatch',
        message: `Tenant-level trust bank balance and client trust ledger balance differ by ${summary.variance.toString()}. Run three-way reconciliation before further trust movements.`,
        entityType: 'Tenant',
        entityId: tenantId,
        amount: summary.variance,
        metadata: {
          totalTrustBankBalance: summary.totalTrustBankBalance.toString(),
          totalClientLedgerBalance: summary.totalClientLedgerBalance.toString(),
          variance: summary.variance.toString(),
        },
      },
    ];
  }

  private async detectStaleReconciliations(input: {
    tenantId: string;
    asOfDate: Date;
    staleReconciliationDays: number;
  }): Promise<TrustAlert[]> {
    const threshold = daysBefore(input.asOfDate, input.staleReconciliationDays);

    const accounts = await this.db.trustAccount.findMany({
      where: {
        tenantId: input.tenantId,
        isActive: true,
        OR: [{ lastReconciled: null }, { lastReconciled: { lt: threshold } }],
      },
      select: {
        id: true,
        accountName: true,
        accountNumber: true,
        lastReconciled: true,
      },
    });

    return accounts.map((account) => ({
      tenantId: input.tenantId,
      code: 'STALE_TRUST_RECONCILIATION',
      severity: 'WARNING',
      title: 'Trust reconciliation is stale',
      message: account.lastReconciled
        ? `Trust account ${account.accountName} (${account.accountNumber}) was last reconciled on ${account.lastReconciled.toISOString()}.`
        : `Trust account ${account.accountName} (${account.accountNumber}) has no recorded reconciliation date.`,
      trustAccountId: account.id,
      entityType: 'TrustAccount',
      entityId: account.id,
      metadata: {
        accountName: account.accountName,
        accountNumber: account.accountNumber,
        lastReconciled: account.lastReconciled?.toISOString() ?? null,
        staleReconciliationDays: input.staleReconciliationDays,
      },
    }));
  }

  private async detectOldUnreconciledTransactions(input: {
    tenantId: string;
    asOfDate: Date;
    unreconciledAgeDays: number;
  }): Promise<TrustAlert[]> {
    const threshold = daysBefore(input.asOfDate, input.unreconciledAgeDays);

    const grouped = await this.db.trustTransaction.groupBy({
      by: ['trustAccountId'],
      where: {
        tenantId: input.tenantId,
        isReconciled: false,
        transactionDate: {
          lt: threshold,
        },
      },
      _count: {
        _all: true,
      },
      _sum: {
        amount: true,
      },
    });

    if (grouped.length === 0) return [];

    const accountIds = grouped.map((row) => row.trustAccountId);
    const accounts = await this.db.trustAccount.findMany({
      where: {
        tenantId: input.tenantId,
        id: { in: accountIds },
      },
      select: {
        id: true,
        accountName: true,
        accountNumber: true,
      },
    });

    const accountById = new Map(accounts.map((account) => [account.id, account]));

    return grouped.map((row) => {
      const account = accountById.get(row.trustAccountId);

      return {
        tenantId: input.tenantId,
        code: 'OLD_UNRECONCILED_TRUST_TRANSACTIONS',
        severity: 'WARNING',
        title: 'Old unreconciled trust transactions',
        message: `${row._count._all} trust transaction(s) older than ${input.unreconciledAgeDays} days remain unreconciled for ${account?.accountName ?? row.trustAccountId}.`,
        trustAccountId: row.trustAccountId,
        entityType: 'TrustAccount',
        entityId: row.trustAccountId,
        amount: decimal(row._sum.amount),
        metadata: {
          accountName: account?.accountName,
          accountNumber: account?.accountNumber,
          transactionCount: row._count._all,
          unreconciledAgeDays: input.unreconciledAgeDays,
        },
      };
    });
  }

  private async detectUnpostedTransactions(tenantId: string): Promise<TrustAlert[]> {
    const grouped = await this.db.trustTransaction.groupBy({
      by: ['trustAccountId'],
      where: {
        tenantId,
        postedDate: null,
      },
      _count: {
        _all: true,
      },
      _sum: {
        amount: true,
      },
    });

    if (grouped.length === 0) return [];

    return grouped.map((row) => ({
      tenantId,
      code: 'UNPOSTED_TRUST_TRANSACTIONS',
      severity: 'WARNING',
      title: 'Unposted trust transactions detected',
      message: `${row._count._all} trust transaction(s) have no posted date. Review posting workflow and ledger integrity.`,
      trustAccountId: row.trustAccountId,
      entityType: 'TrustAccount',
      entityId: row.trustAccountId,
      amount: decimal(row._sum.amount),
      metadata: {
        transactionCount: row._count._all,
      },
    }));
  }

  private async getDefaultTrustAlertRecipients(tenantId: string): Promise<Array<{ id: string }>> {
    return this.db.user.findMany({
      where: {
        tenantId,
        status: UserStatus.ACTIVE,
        tenantRole: {
          in: [TenantRole.FIRM_ADMIN, TenantRole.ACCOUNTANT, TenantRole.BRANCH_MANAGER],
        },
      },
      select: {
        id: true,
      },
    });
  }
}