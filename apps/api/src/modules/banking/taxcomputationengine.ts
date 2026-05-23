import { Prisma } from '@global-wakili/database';

type DecimalInput = Prisma.Decimal | number | string;

function decimal(value: DecimalInput): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

export class TaxComputationEngine {
  static calculateVAT(amount: DecimalInput): Prisma.Decimal {
    return decimal(amount).mul(0.16).toDecimalPlaces(2);
  }

  static calculateWithholdingTax(
    amount: DecimalInput,
    category: 'CONSULTANCY' | 'MANAGEMENT',
  ): Prisma.Decimal {
    const rate = category === 'CONSULTANCY' ? 0.05 : 0.03;

    return decimal(amount).mul(rate).toDecimalPlaces(2);
  }

  static calculatePAYE(taxableIncome: number): number {
    if (!Number.isFinite(taxableIncome) || taxableIncome <= 0) {
      return 0;
    }

    if (taxableIncome <= 24000) {
      return taxableIncome * 0.1;
    }

    if (taxableIncome <= 32333) {
      return 2400 + (taxableIncome - 24000) * 0.25;
    }

    if (taxableIncome <= 500000) {
      return 2400 + 2083.25 + (taxableIncome - 32333) * 0.3;
    }

    if (taxableIncome <= 800000) {
      return 2400 + 2083.25 + 140300.1 + (taxableIncome - 500000) * 0.325;
    }

    return 2400 + 2083.25 + 140300.1 + 97500 + (taxableIncome - 800000) * 0.35;
  }
}

export default TaxComputationEngine;
