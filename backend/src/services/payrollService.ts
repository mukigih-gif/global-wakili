import { PrismaClient, Decimal } from "@prisma/client";

const prisma = new PrismaClient();

export class PayrollService {
  private static readonly PERSONAL_RELIEF = 2400.00;
  private static readonly INSURANCE_RELIEF_RATE = 0.15; // 15% of SHIF
  private static readonly NSSF_LEL = 9000.00;   // Tier I
  private static readonly NSSF_UEL = 108000.00; // Tier II

  /**
   * 1. STATUTORY CALCULATION ENGINE
   */
  static calculateMonthlyPayroll(baseSalary: number, commissions: number = 0) {
    const totalGross = baseSalary + commissions;
    
    // NSSF Phase 4
    const nssf = new Decimal((Math.min(totalGross, 9000) * 0.06) + 
                 (Math.max(0, Math.min(totalGross, 108000) - 9000) * 0.06));

    // SHIF & Housing Levy
    const shif = new Decimal(Math.max(totalGross * 0.0275, 300));
    const housingLevy = new Decimal(totalGross * 0.015);

    // Taxable Income (Deducting Statutory first)
    const taxableAmount = totalGross - nssf.toNumber() - shif.toNumber() - housingLevy.toNumber();

    // PAYE Bands 2026
    let paye = 0;
    if (taxableAmount <= 30000) paye = taxableAmount * 0.10;
    else if (taxableAmount <= 50000) paye = 3000 + (taxableAmount - 30000) * 0.25;
    else paye = 3000 + 5000 + (taxableAmount - 50000) * 0.30;

    const finalPaye = new Decimal(Math.max(0, paye - (this.PERSONAL_RELIEF + (shif.toNumber() * 0.15))));
    const netPay = new Decimal(taxableAmount).minus(finalPaye);

    return { grossPay: new Decimal(totalGross), nssf, shif, housingLevy, paye: finalPaye, netPay };
  }

  /**
   * 2. BANK TRANSMISSION & LEDGER INTEGRATION
   */
  static async processAndTransmitPayroll(month: number, year: number) {
    const employees = await prisma.user.findMany();
    
    for (const emp of employees) {
      const results = this.calculateMonthlyPayroll(emp.defaultRate.toNumber());
      
      // Save Payslip
      const payslip = await prisma.payslip.create({
        data: { userId: emp.id, month, year, grossPay: results.grossPay, netPay: results.netPay }
      });

      // Post to General Ledger
      await prisma.journalEntry.create({
        data: {
          reference: `PAY-${emp.id}-${month}-${year}`,
          description: `Salary for ${emp.name}`,
          userId: "SYSTEM",
          lines: {
            create: [
              { accountId: "5000", debit: results.grossPay, credit: 0 }, // Expense
              { accountId: "2000", debit: 0, credit: results.netPay }  // Bank
            ]
          }
        }
      });
    }
  }
}