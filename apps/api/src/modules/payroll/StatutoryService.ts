// apps/api/src/modules/payroll/StatutoryService.ts

import { Prisma } from '@global-wakili/database';

import type {
  DecimalInput,
  PayrollCalculationInput,
  StatutoryBreakdown,
} from './payroll.types';

type PayeBand = {
  limit: Prisma.Decimal | null;
  rate: Prisma.Decimal;
};

export type KenyaPayrollStatutoryConfig = {
  effectiveFrom: Date;
  currency: 'KES';

  payeBands: PayeBand[];
  personalReliefMonthly: Prisma.Decimal;
  residentPersonalReliefEnabled: boolean;

  nssfEmployeeRate: Prisma.Decimal;
  nssfEmployerRate: Prisma.Decimal;
  nssfLowerEarningLimit: Prisma.Decimal;
  nssfUpperEarningLimit: Prisma.Decimal;

  shaRate: Prisma.Decimal;
  shaMinimumMonthly: Prisma.Decimal;

  housingLevyEmployeeRate: Prisma.Decimal;
  housingLevyEmployerRate: Prisma.Decimal;

  nitaMonthlyEmployerAmount: Prisma.Decimal;
};

const ZERO = new Prisma.Decimal(0);

function decimal(value: DecimalInput | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;

  const parsed = new Prisma.Decimal(value);

  if (!parsed.isFinite()) {
    throw Object.assign(new Error('Invalid decimal value'), {
      statusCode: 422,
      code: 'INVALID_DECIMAL_VALUE',
    });
  }

  return parsed;
}

function money(value: DecimalInput | null | undefined): Prisma.Decimal {
  return decimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function rate(value: string | number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function sum(values: Array<DecimalInput | null | undefined>): Prisma.Decimal {
  return values.reduce((acc, value) => acc.plus(decimal(value)), ZERO).toDecimalPlaces(2);
}

function max(a: Prisma.Decimal, b: Prisma.Decimal): Prisma.Decimal {
  return Prisma.Decimal.max(a, b);
}

function min(a: Prisma.Decimal, b: Prisma.Decimal): Prisma.Decimal {
  return Prisma.Decimal.min(a, b);
}

export class StatutoryService {
  static readonly kenya2026Config: KenyaPayrollStatutoryConfig = {
    effectiveFrom: new Date('2026-02-01T00:00:00.000Z'),
    currency: 'KES',

    payeBands: [
      { limit: new Prisma.Decimal('24000'), rate: rate('0.10') },
      { limit: new Prisma.Decimal('8333'), rate: rate('0.25') },
      { limit: new Prisma.Decimal('467667'), rate: rate('0.30') },
      { limit: new Prisma.Decimal('300000'), rate: rate('0.325') },
      { limit: null, rate: rate('0.35') },
    ],
    personalReliefMonthly: new Prisma.Decimal('2400'),
    residentPersonalReliefEnabled: true,

    nssfEmployeeRate: rate('0.06'),
    nssfEmployerRate: rate('0.06'),
    nssfLowerEarningLimit: new Prisma.Decimal('9000'),
    nssfUpperEarningLimit: new Prisma.Decimal('108000'),

    shaRate: rate('0.0275'),
    shaMinimumMonthly: new Prisma.Decimal('300'),

    housingLevyEmployeeRate: rate('0.015'),
    housingLevyEmployerRate: rate('0.015'),

    nitaMonthlyEmployerAmount: new Prisma.Decimal('50'),
  };

  static calculate(input: PayrollCalculationInput): StatutoryBreakdown {
    const config = this.kenya2026Config;

    const basicPay = money(input.basicPay);

    const allEarnings = [
      ...(input.allowances ?? []),
      ...(input.benefits ?? []),
      ...(input.overtime ?? []),
      ...(input.bonuses ?? []),
      ...(input.commissions ?? []),
      ...(input.reimbursements ?? []),
    ];

    const taxableEarnings = allEarnings
      .filter((item) => item.taxable !== false)
      .map((item) => item.amount);

    const pensionableEarnings = allEarnings
      .filter((item) => item.pensionable !== false)
      .map((item) => item.amount);

    const grossPay = basicPay.plus(sum(allEarnings.map((item) => item.amount))).toDecimalPlaces(2);

    const employeePension = money(input.pensionEmployeeContribution);
    const disabledExemption = money(input.disabledExemptionAmount);
    const insuranceRelief = money(input.insuranceReliefAmount);

    const taxablePayBeforeReliefs = basicPay.plus(sum(taxableEarnings)).minus(employeePension);
    const taxablePay = max(taxablePayBeforeReliefs.minus(disabledExemption), ZERO).toDecimalPlaces(2);

    const pensionablePay = basicPay.plus(sum(pensionableEarnings)).toDecimalPlaces(2);

    const payeGrossTax = input.applyPaye === false
      ? ZERO
      : this.calculatePayeGrossTax(taxablePay, config);

    const personalRelief =
      input.applyPaye === false || input.residentForTax === false
        ? ZERO
        : config.personalReliefMonthly;

    const paye = input.applyPaye === false
      ? ZERO
      : max(payeGrossTax.minus(personalRelief).minus(insuranceRelief), ZERO).toDecimalPlaces(2);

    const nssf = input.applyNssf === false
      ? this.zeroNssf()
      : this.calculateNssf(pensionablePay, config);

    const sha = input.applySha === false
      ? ZERO
      : max(grossPay.mul(config.shaRate), config.shaMinimumMonthly).toDecimalPlaces(2);

    const housingLevyEmployee = input.applyHousingLevy === false
      ? ZERO
      : grossPay.mul(config.housingLevyEmployeeRate).toDecimalPlaces(2);

    const housingLevyEmployer = input.applyHousingLevy === false
      ? ZERO
      : grossPay.mul(config.housingLevyEmployerRate).toDecimalPlaces(2);

    const nitaEmployer = input.applyNita === false
      ? ZERO
      : config.nitaMonthlyEmployerAmount.toDecimalPlaces(2);

    const totalEmployeeStatutoryDeductions = paye
      .plus(nssf.employeeTotal)
      .plus(sha)
      .plus(housingLevyEmployee)
      .toDecimalPlaces(2);

    const totalEmployerContributions = nssf.employerTotal
      .plus(housingLevyEmployer)
      .plus(nitaEmployer)
      .toDecimalPlaces(2);

    return {
      taxablePay,
      pensionablePay,
      grossPay,

      payeGrossTax,
      personalRelief,
      insuranceRelief,
      paye,

      nssfTier1Employee: nssf.employeeTier1,
      nssfTier2Employee: nssf.employeeTier2,
      nssfEmployee: nssf.employeeTotal,
      nssfTier1Employer: nssf.employerTier1,
      nssfTier2Employer: nssf.employerTier2,
      nssfEmployer: nssf.employerTotal,

      sha,

      housingLevyEmployee,
      housingLevyEmployer,

      nitaEmployer,

      totalEmployeeStatutoryDeductions,
      totalEmployerContributions,

      appliedRates: {
        payeBands: 'KES 24,000@10%, next 8,333@25%, next 467,667@30%, next 300,000@32.5%, balance@35%',
        personalReliefMonthly: config.personalReliefMonthly.toString(),
        nssf: '6% employee + 6% employer; LEL 9,000; UEL 108,000',
        sha: '2.75% gross pay, minimum KES 300',
        housingLevy: '1.5% employee + 1.5% employer on gross pay',
        nita: config.nitaMonthlyEmployerAmount.toString(),
      },
    };
  }

  static calculatePayeGrossTax(
    taxablePay: Prisma.Decimal,
    config: KenyaPayrollStatutoryConfig = this.kenya2026Config,
  ): Prisma.Decimal {
    let remaining = max(taxablePay, ZERO);
    let tax = ZERO;

    for (const band of config.payeBands) {
      if (remaining.lte(0)) break;

      const taxableInBand = band.limit === null ? remaining : min(remaining, band.limit);

      tax = tax.plus(taxableInBand.mul(band.rate));
      remaining = remaining.minus(taxableInBand);
    }

    return tax.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  }

  static calculateNssf(
    pensionablePay: Prisma.Decimal,
    config: KenyaPayrollStatutoryConfig = this.kenya2026Config,
  ) {
    const tier1Base = min(max(pensionablePay, ZERO), config.nssfLowerEarningLimit);
    const tier2Base = min(
      max(pensionablePay.minus(config.nssfLowerEarningLimit), ZERO),
      config.nssfUpperEarningLimit.minus(config.nssfLowerEarningLimit),
    );

    const employeeTier1 = tier1Base.mul(config.nssfEmployeeRate).toDecimalPlaces(2);
    const employeeTier2 = tier2Base.mul(config.nssfEmployeeRate).toDecimalPlaces(2);
    const employerTier1 = tier1Base.mul(config.nssfEmployerRate).toDecimalPlaces(2);
    const employerTier2 = tier2Base.mul(config.nssfEmployerRate).toDecimalPlaces(2);

    return {
      employeeTier1,
      employeeTier2,
      employeeTotal: employeeTier1.plus(employeeTier2).toDecimalPlaces(2),
      employerTier1,
      employerTier2,
      employerTotal: employerTier1.plus(employerTier2).toDecimalPlaces(2),
    };
  }

  static zeroNssf() {
    return {
      employeeTier1: ZERO,
      employeeTier2: ZERO,
      employeeTotal: ZERO,
      employerTier1: ZERO,
      employerTier2: ZERO,
      employerTotal: ZERO,
    };
  }
}

export default StatutoryService;