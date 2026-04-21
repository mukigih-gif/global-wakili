import { Prisma } from '@global-wakili/database';

function toDecimal(value: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(value);
}

type PAYERow = {
  threshold: Prisma.Decimal;
  rate: Prisma.Decimal;
};

const DEFAULT_PAYE_BANDS: PAYERow[] = [
  { threshold: new Prisma.Decimal(24000), rate: new Prisma.Decimal(0.1) },
  { threshold: new Prisma.Decimal(8333), rate: new Prisma.Decimal(0.25) },
  { threshold: new Prisma.Decimal('999999999'), rate: new Prisma.Decimal(0.3) },
];

export class PAYEService {
  static calculateMonthlyPAYE(
    taxablePay: Prisma.Decimal | string | number,
    personalRelief: Prisma.Decimal | string | number = 2400,
  ) {
    let remaining = toDecimal(taxablePay);
    let tax = new Prisma.Decimal(0);

    for (const band of DEFAULT_PAYE_BANDS) {
      if (remaining.lte(0)) break;

      const bandAmount = Prisma.Decimal.min(remaining, band.threshold);
      tax = tax.plus(bandAmount.mul(band.rate));
      remaining = remaining.minus(bandAmount);
    }

    const relief = toDecimal(personalRelief);
    const netPAYE = tax.minus(relief);

    return {
      grossPAYE: tax,
      personalRelief: relief,
      paye: netPAYE.gt(0) ? netPAYE : new Prisma.Decimal(0),
    };
  }

  static async generatePAYEReturn(
    db: any,
    params: {
      tenantId: string;
      payrollBatchId: string;
    },
  ) {
    const payslips = await db.payslip.findMany({
      where: {
        tenantId: params.tenantId,
        payrollBatchId: params.payrollBatchId,
      },
      select: {
        id: true,
        userId: true,
        grossPay: true,
        taxablePay: true,
        payeAmount: true,
        nssfAmount: true,
        nhifAmount: true,
        netPay: true,
      },
    });

    const totals = payslips.reduce(
      (acc: any, slip: any) => {
        acc.grossPay = acc.grossPay.plus(toDecimal(slip.grossPay));
        acc.taxablePay = acc.taxablePay.plus(toDecimal(slip.taxablePay));
        acc.payeAmount = acc.payeAmount.plus(toDecimal(slip.payeAmount));
        acc.nssfAmount = acc.nssfAmount.plus(toDecimal(slip.nssfAmount));
        acc.nhifAmount = acc.nhifAmount.plus(toDecimal(slip.nhifAmount));
        acc.netPay = acc.netPay.plus(toDecimal(slip.netPay));
        return acc;
      },
      {
        grossPay: new Prisma.Decimal(0),
        taxablePay: new Prisma.Decimal(0),
        payeAmount: new Prisma.Decimal(0),
        nssfAmount: new Prisma.Decimal(0),
        nhifAmount: new Prisma.Decimal(0),
        netPay: new Prisma.Decimal(0),
      },
    );

    return {
      payrollBatchId: params.payrollBatchId,
      employeeCount: payslips.length,
      ...totals,
      rows: payslips,
    };
  }
}