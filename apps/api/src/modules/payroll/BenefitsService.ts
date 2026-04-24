// apps/api/src/modules/payroll/BenefitsService.ts

import { Prisma, prisma } from '@global-wakili/database';

import type { PayrollEarningInput } from './payroll.types';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

export type BenefitTaxTreatment =
  | 'TAXABLE_CASH'
  | 'TAXABLE_NON_CASH'
  | 'NON_TAXABLE'
  | 'REIMBURSEMENT'
  | 'EMPLOYER_ONLY';

export type PayrollBenefitInput = {
  tenantId: string;
  employeeId: string;
  periodStart: Date;
  periodEnd: Date;
};

export type PayrollBenefitLine = PayrollEarningInput & {
  benefitId?: string | null;
  taxTreatment: BenefitTaxTreatment;
};

const ZERO = new Prisma.Decimal(0);

function delegate(db: DbClient, name: string) {
  const modelDelegate = db[name];

  if (!modelDelegate) {
    throw Object.assign(
      new Error(`Prisma model delegate "${name}" is missing. Apply HR/Payroll schema before activating this workflow.`),
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

function normalizeTreatment(value: unknown): BenefitTaxTreatment {
  const normalized = String(value ?? '').toUpperCase();

  if (
    [
      'TAXABLE_CASH',
      'TAXABLE_NON_CASH',
      'NON_TAXABLE',
      'REIMBURSEMENT',
      'EMPLOYER_ONLY',
    ].includes(normalized)
  ) {
    return normalized as BenefitTaxTreatment;
  }

  return 'TAXABLE_CASH';
}

export class BenefitsService {
  async listActiveBenefitsForPayroll(input: PayrollBenefitInput): Promise<PayrollBenefitLine[]> {
    const employeeBenefitDelegate = delegate(prisma, 'employeeBenefit');

    const benefits = await employeeBenefitDelegate.findMany({
      where: {
        tenantId: input.tenantId,
        employeeId: input.employeeId,
        status: {
          in: ['ACTIVE', 'APPROVED'],
        },
        OR: [
          {
            effectiveFrom: {
              lte: input.periodEnd,
            },
            effectiveTo: null,
          },
          {
            effectiveFrom: {
              lte: input.periodEnd,
            },
            effectiveTo: {
              gte: input.periodStart,
            },
          },
        ],
      },
      orderBy: {
        effectiveFrom: 'asc',
      },
    });

    return benefits
      .map((benefit: any): PayrollBenefitLine => {
        const metadata = asRecord(benefit.metadata);
        const taxTreatment = normalizeTreatment(
          benefit.taxTreatment ?? metadata.taxTreatment,
        );

        const amount = money(benefit.amount ?? metadata.amount);

        return {
          benefitId: benefit.id,
          kind:
            taxTreatment === 'REIMBURSEMENT'
              ? 'REIMBURSEMENT'
              : 'BENEFIT',
          code: benefit.code ?? metadata.code ?? 'BENEFIT',
          label:
            benefit.label ??
            benefit.name ??
            metadata.label ??
            metadata.name ??
            'Employee Benefit',
          amount,
          taxable:
            taxTreatment === 'TAXABLE_CASH' ||
            taxTreatment === 'TAXABLE_NON_CASH',
          pensionable:
            metadata.pensionable === undefined
              ? taxTreatment === 'TAXABLE_CASH'
              : Boolean(metadata.pensionable),
          cash:
            taxTreatment === 'TAXABLE_CASH' ||
            taxTreatment === 'NON_TAXABLE' ||
            taxTreatment === 'REIMBURSEMENT',
          taxTreatment,
          metadata: {
            ...metadata,
            benefitId: benefit.id,
            taxTreatment,
          },
        };
      })
      .filter((benefit) => money(benefit.amount).gt(0));
  }

  async buildPayrollBenefitSummary(input: PayrollBenefitInput) {
    const benefits = await this.listActiveBenefitsForPayroll(input);

    const taxableCash = benefits
      .filter((benefit) => benefit.taxTreatment === 'TAXABLE_CASH')
      .reduce((sum, benefit) => sum.plus(money(benefit.amount)), ZERO);

    const taxableNonCash = benefits
      .filter((benefit) => benefit.taxTreatment === 'TAXABLE_NON_CASH')
      .reduce((sum, benefit) => sum.plus(money(benefit.amount)), ZERO);

    const nonTaxable = benefits
      .filter((benefit) => benefit.taxTreatment === 'NON_TAXABLE')
      .reduce((sum, benefit) => sum.plus(money(benefit.amount)), ZERO);

    const reimbursements = benefits
      .filter((benefit) => benefit.taxTreatment === 'REIMBURSEMENT')
      .reduce((sum, benefit) => sum.plus(money(benefit.amount)), ZERO);

    const employerOnly = benefits
      .filter((benefit) => benefit.taxTreatment === 'EMPLOYER_ONLY')
      .reduce((sum, benefit) => sum.plus(money(benefit.amount)), ZERO);

    return {
      tenantId: input.tenantId,
      employeeId: input.employeeId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      benefits,
      totals: {
        taxableCash: taxableCash.toDecimalPlaces(2),
        taxableNonCash: taxableNonCash.toDecimalPlaces(2),
        nonTaxable: nonTaxable.toDecimalPlaces(2),
        reimbursements: reimbursements.toDecimalPlaces(2),
        employerOnly: employerOnly.toDecimalPlaces(2),
      },
    };
  }

  async createBenefitAssignment(input: {
    tenantId: string;
    employeeId: string;
    label: string;
    amount: string | number | Prisma.Decimal;
    taxTreatment?: BenefitTaxTreatment;
    effectiveFrom: Date;
    effectiveTo?: Date | null;
    createdById: string;
    metadata?: Record<string, unknown>;
  }) {
    const employeeBenefitDelegate = delegate(prisma, 'employeeBenefit');

    return employeeBenefitDelegate.create({
      data: {
        tenantId: input.tenantId,
        employeeId: input.employeeId,
        label: input.label,
        amount: money(input.amount),
        taxTreatment: input.taxTreatment ?? 'TAXABLE_CASH',
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo ?? null,
        status: 'ACTIVE',
        createdById: input.createdById,
        metadata: input.metadata ?? {},
      },
    });
  }
}

export const benefitsService = new BenefitsService();

export default BenefitsService;