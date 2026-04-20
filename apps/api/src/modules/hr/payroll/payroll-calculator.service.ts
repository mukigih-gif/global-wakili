import { Decimal } from '@prisma/client/runtime/library';

export class PayrollCalculator {
  private static readonly PERSONAL_RELIEF = new Decimal(2400);
  private static readonly SHIF_RATE = 0.0275;
  private static readonly HOUSING_LEVY_RATE = 0.015;

  static calculate(input: {
    baseSalary: Decimal;
    commissions: Decimal;
    loanRepayment: Decimal;
    otherDeductions: Decimal;
  }) {
    const grossTaxable = input.baseSalary.add(input.commissions);

    // 1. Statutory Deductions
    const nssf = Decimal.min(grossTaxable.mul(0.06), 2160);
    const shif = grossTaxable.mul(this.SHIF_RATE);
    const housingLevy = grossTaxable.mul(this.HOUSING_LEVY_RATE);
    
    // 2. Taxable Pay (Kenya: NSSF/Pension is tax-exempt)
    const taxablePay = grossTaxable.minus(nssf).minus(shif);

    // 3. Graduated PAYE (2024 Scale)
    let paye = new Decimal(0);
    const amt = taxablePay.toNumber();
    if (amt > 24000) {
      if (amt <= 32333) paye = taxablePay.minus(24000).mul(0.1);
      else if (amt <= 500000) paye = new Decimal(833.3).add(taxablePay.minus(32333).mul(0.25));
      else if (amt <= 800000) paye = new Decimal(125250).add(taxablePay.minus(500000).mul(0.30));
      else paye = new Decimal(215250).add(taxablePay.minus(800000).mul(0.35));
    }
    const finalPaye = Decimal.max(paye.minus(this.PERSONAL_RELIEF), 0);

    return {
      grossTaxable,
      netPay: grossTaxable.minus(nssf).minus(shif).minus(housingLevy).minus(finalPaye).minus(input.loanRepayment).minus(input.otherDeductions),
      breakdown: { nssf, shif, housingLevy, paye: finalPaye }
    };
  }
}