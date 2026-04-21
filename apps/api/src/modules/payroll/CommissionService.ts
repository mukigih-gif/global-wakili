// apps/api/src/modules/payroll/CommissionService.ts

import { Prisma, prisma } from '@global-wakili/database';

import type { PayrollEarningInput } from './payroll.types';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

export type PayrollCommissionBasis =
  | 'BILLED'
  | 'COLLECTED'
  | 'MANUAL'
  | 'MATTER_COMMISSION'
  | 'SALES'
  | 'OTHER';

export type PayrollCommissionInput = {
  tenantId: string;
  employeeId: string;
  periodStart: Date;
  periodEnd: Date;
};

export type PayrollCommissionLine = PayrollEarningInput & {
  commissionId?: string | null;
  basis: PayrollCommissionBasis;
};

const ZERO = new Prisma.Decimal(0);

function delegate(db: DbClient, name: string) {
  const modelDelegate = db[name];

  if (!modelDelegate) {
    throw Object.assign(
      new Error(`Prisma model delegate "${name}" is missing. Apply Payroll schema before activating this workflow.`),
      {
        statusCode: 500,
        code: 'PAYROLL_SCHEMA_DELEGATE_MISSING',
        model: name,
      },
    );
  }

  return modelDelegate;
}

function money(value: unknown): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;

  const parsed = new Prisma.Decimal(value as any);

  if (!parsed.isFinite()) {
    throw Object.assign(new Error('Invalid decimal value'), {
      statusCode: 422,
      code: 'INVALID_DECIMAL_VALUE',
    });
  }

  return parsed.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function asRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, any>;
}

function normalizeBasis(value: unknown): PayrollCommissionBasis {
  const normalized = String(value ?? '').toUpperCase();

  if (
    [
      'BILLED',
      'COLLECTED',
      'MANUAL',
      'MATTER_COMMISSION',
      'SALES',
      'OTHER',
    ].includes(normalized)
  ) {
    return normalized as PayrollCommissionBasis;
  }

  return 'MANUAL';
}

export class CommissionService {
  async listApprovedCommissionsForPayroll(
    input: PayrollCommissionInput,
  ): Promise<PayrollCommissionLine[]> {
    const commissionDelegate = delegate(prisma, 'employeeCommission');

    const commissions = await commissionDelegate.findMany({
      where: {
        tenantId: input.tenantId,
        employeeId: input.employeeId,
        status: {
          in: ['APPROVED', 'READY_FOR_PAYROLL'],
        },
        earnedAt: {
          gte: input.periodStart,
          lte: input.periodEnd,
        },
      },
      orderBy: {
        earnedAt: 'asc',
      },
    });

    return commissions
      .map((commission: any): PayrollCommissionLine => {
        const metadata = asRecord(commission.metadata);
        const basis = normalizeBasis(commission.basis ?? metadata.basis);
        const amount = money(commission.amount ?? metadata.amount);

        return {
          commissionId: commission.id,
          kind: 'COMMISSION',
          code: commission.code ?? metadata.code ?? 'COMMISSION',
          label:
            commission.label ??
            commission.description ??
            metadata.label ??
            'Commission',
          amount,
          taxable: commission.taxable === undefined ? true : Boolean(commission.taxable),
          pensionable:
            commission.pensionable === undefined
              ? false
              : Boolean(commission.pensionable),
          cash: true,
          basis,
          metadata: {
            ...metadata,
            commissionId: commission.id,
            basis,
            sourceType: commission.sourceType ?? metadata.sourceType ?? null,
            sourceId: commission.sourceId ?? metadata.sourceId ?? null,
          },
        };
      })
      .filter((commission) => money(commission.amount).gt(0));
  }

  async calculateMatterCommissionPayrollLines(input: PayrollCommissionInput) {
    const matterCommissionDelegate = delegate(prisma, 'matterCommission');

    const matterCommissions = await matterCommissionDelegate.findMany({
      where: {
        tenantId: input.tenantId,
        userId: input.employeeId,
        status: {
          in: ['APPROVED', 'READY_FOR_PAYROLL'],
        },
        earnedAt: {
          gte: input.periodStart,
          lte: input.periodEnd,
        },
      },
      orderBy: {
        earnedAt: 'asc',
      },
    });

    return matterCommissions
      .map((commission: any): PayrollCommissionLine => {
        const metadata = asRecord(commission.metadata);
        const amount = money(commission.payoutAmount ?? commission.amount);

        return {
          commissionId: commission.id,
          kind: 'COMMISSION',
          code: commission.code ?? 'MATTER_COMMISSION',
          label:
            commission.label ??
            `Matter Commission${commission.matterId ? ` - ${commission.matterId}` : ''}`,
          amount,
          taxable: true,
          pensionable: false,
          cash: true,
          basis: 'MATTER_COMMISSION',
          metadata: {
            ...metadata,
            matterCommissionId: commission.id,
            matterId: commission.matterId ?? null,
            role: commission.role ?? null,
          },
        };
      })
      .filter((commission) => money(commission.amount).gt(0));
  }

  async buildPayrollCommissionSummary(input: PayrollCommissionInput) {
    const directCommissions = await this.listApprovedCommissionsForPayroll(input).catch(
      (error) => {
        if (error?.code === 'PAYROLL_SCHEMA_DELEGATE_MISSING') return [];
        throw error;
      },
    );

    const matterCommissions = await this.calculateMatterCommissionPayrollLines(input).catch(
      (error) => {
        if (error?.code === 'PAYROLL_SCHEMA_DELEGATE_MISSING') return [];
        throw error;
      },
    );

    const commissions = [...directCommissions, ...matterCommissions];

    const total = commissions.reduce(
      (sum, commission) => sum.plus(money(commission.amount)),
      ZERO,
    );

    return {
      tenantId: input.tenantId,
      employeeId: input.employeeId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      commissions,
      total: total.toDecimalPlaces(2),
    };
  }

  async markCommissionPaid(input: {
    tenantId: string;
    commissionId: string;
    paidById: string;
    payrollRecordId?: string | null;
  }) {
    const commissionDelegate = delegate(prisma, 'employeeCommission');

    const existing = await commissionDelegate.findFirst({
      where: {
        id: input.commissionId,
        tenantId: input.tenantId,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Commission not found'), {
        statusCode: 404,
        code: 'COMMISSION_NOT_FOUND',
      });
    }

    if (existing.status === 'PAID') {
      return existing;
    }

    return commissionDelegate.update({
      where: {
        id: input.commissionId,
      },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paidById: input.paidById,
        payrollRecordId: input.payrollRecordId ?? null,
      },
    });
  }
}

export const commissionService = new CommissionService();

export default CommissionService;