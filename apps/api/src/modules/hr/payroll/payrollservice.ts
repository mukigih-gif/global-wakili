import { prisma } from '../../config/database';
import { Decimal } from '@prisma/client/runtime/library';
import { GeneralLedgerService } from '../finance/GeneralLedgerService';
import { pushRealtimeFinance } from '../reports/realtime.service';
import { runFraudMonitor } from '../fraud/fraud-monitor.service';
import { AppError } from '../../utils/AppError';

export class PayrollService {
  private static readonly PERSONAL_RELIEF = new Decimal(2400);
  private static readonly INSURANCE_RELIEF_RATE = new Decimal(0.15);

  /**
   * 🔐 ENTERPRISE PAYROLL CALCULATION ENGINE (DECIMAL SAFE)
   */
  static calculatePayslip(params: {
    baseSalary: Decimal;
    taxableAllowances: Decimal;
    nonTaxableAllowances: Decimal;
    customDeductions: Decimal;
    daysWorked: number;
    totalWorkingDays: number;
  }) {
    const prorationFactor = new Decimal(params.daysWorked).div(params.totalWorkingDays);

    const proratedBase = params.baseSalary.mul(prorationFactor);

    const totalTaxableGross = proratedBase.add(params.taxableAllowances);
    const totalGross = totalTaxableGross.add(params.nonTaxableAllowances);

    // NSSF
    const tier1 = Decimal.min(totalTaxableGross, new Decimal(9000)).mul(0.06);
    const tier2 = Decimal.max(
      new Decimal(0),
      Decimal.min(totalTaxableGross, new Decimal(108000)).minus(9000)
    ).mul(0.06);

    const totalNssf = tier1.add(tier2);
    const employerNssf = totalNssf;

    // SHIF + Housing
    const shif = Decimal.max(totalGross.mul(0.0275), new Decimal(300));
    const housingLevy = totalGross.mul(0.015);
    const employerHousingLevy = housingLevy;

    // Taxable Income
    const kraTaxable = totalTaxableGross
      .minus(totalNssf)
      .minus(shif)
      .minus(housingLevy);

    // PAYE
    let paye = new Decimal(0);

    if (kraTaxable.lte(30000)) {
      paye = kraTaxable.mul(0.1);
    } else if (kraTaxable.lte(50000)) {
      paye = new Decimal(3000).add(kraTaxable.minus(30000).mul(0.25));
    } else {
      paye = new Decimal(8000).add(kraTaxable.minus(50000).mul(0.3));
    }

    const relief = this.PERSONAL_RELIEF.add(shif.mul(this.INSURANCE_RELIEF_RATE));
    const finalPaye = Decimal.max(new Decimal(0), paye.minus(relief));

    const totalStatutory = totalNssf.add(shif).add(housingLevy).add(finalPaye);

    const netPay = totalGross.minus(totalStatutory).minus(params.customDeductions);

    const firmCost = totalGross.add(employerNssf).add(employerHousingLevy);

    return {
      grossPay: totalGross,
      netPay,
      employeeDeductions: {
        nssf: totalNssf,
        shif,
        housingLevy,
        paye: finalPaye,
        custom: params.customDeductions
      },
      employerLiabilities: {
        nssf: employerNssf,
        housingLevy: employerHousingLevy
      },
      firmCost
    };
  }

  /**
   * 🏦 FULL PAYROLL BATCH ENGINE (HARDENED)
   */
  static async draftMonthlyPayroll(
    tenantId: string,
    month: number,
    year: number,
    generatedBy: string
  ) {
    return prisma.$transaction(async (tx) => {
      // 🔒 IDEMPOTENCY CHECK
      const existingBatch = await tx.payrollBatch.findFirst({
        where: { tenantId, month, year }
      });

      if (existingBatch) return existingBatch;

      const employees = await tx.user.findMany({
        where: { tenantId, status: 'ACTIVE' },
        include: { salaryComponents: true }
      });

      // 🔐 LOAD CHART OF ACCOUNTS (DB DRIVEN)
      const coa = await this.getTenantCoA(tx, tenantId);

      const batch = await tx.payrollBatch.create({
        data: {
          tenantId,
          month,
          year,
          status: 'DRAFT',
          generatedById: generatedBy
        }
      });

      const journalEntries: any[] = [];

      for (const emp of employees) {
        // 🚨 COMPLIANCE CHECKS
        if (!emp.kraPin) throw new Error(`Employee ${emp.id} missing KRA PIN`);
        if (!emp.nssfNumber) throw new Error(`Employee ${emp.id} missing NSSF`);
        if (!emp.shifNumber) throw new Error(`Employee ${emp.id} missing SHIF`);

        const result = this.calculatePayslip({
          baseSalary: new Decimal(emp.defaultRate),
          taxableAllowances: new Decimal(0),
          nonTaxableAllowances: new Decimal(0),
          customDeductions: new Decimal(0),
          daysWorked: 21,
          totalWorkingDays: 21
        });

        await tx.payslip.create({
          data: {
            tenantId,
            batchId: batch.id,
            userId: emp.id,
            grossPay: result.grossPay,
            netPay: result.netPay,
            nssf: result.employeeDeductions.nssf,
            shif: result.employeeDeductions.shif,
            paye: result.employeeDeductions.paye,
            housingLevy: result.employeeDeductions.housingLevy
          }
        });

        // DEBITS
        journalEntries.push(
          { accountId: coa.salaryExpenseId, debit: result.grossPay, credit: new Decimal(0) },
          { accountId: coa.nssfExpenseId, debit: result.employerLiabilities.nssf, credit: new Decimal(0) },
          { accountId: coa.levyExpenseId, debit: result.employerLiabilities.housingLevy, credit: new Decimal(0) }
        );

        // CREDITS
        journalEntries.push(
          { accountId: coa.salaryPayableId, debit: new Decimal(0), credit: result.netPay },
          { accountId: coa.payeLiabilityId, debit: new Decimal(0), credit: result.employeeDeductions.paye },
          { accountId: coa.shifLiabilityId, debit: new Decimal(0), credit: result.employeeDeductions.shif },
          {
            accountId: coa.nssfLiabilityId,
            debit: new Decimal(0),
            credit: result.employeeDeductions.nssf.add(result.employerLiabilities.nssf)
          },
          {
            accountId: coa.levyLiabilityId,
            debit: new Decimal(0),
            credit: result.employeeDeductions.housingLevy.add(result.employerLiabilities.housingLevy)
          }
        );
      }

      // ⚖️ BALANCE VALIDATION
      const totalDebit = journalEntries.reduce((acc, e) => acc.add(e.debit), new Decimal(0));
      const totalCredit = journalEntries.reduce((acc, e) => acc.add(e.credit), new Decimal(0));

      if (!totalDebit.equals(totalCredit)) {
        throw new Error('🚨 Payroll journal is not balanced');
      }

      // 📒 POST TO LEDGER (IDEMPOTENT)
      await GeneralLedgerService.postJournalEntry({
        tenantId,
        date: new Date(year, month - 1, 28),
        reference: `PAYROLL-${tenantId}-${month}-${year}`,
        description: `Payroll for ${month}/${year}`,
        entries: journalEntries,
        postedById: generatedBy
      });

      // ⚡ REALTIME + FRAUD
      await pushRealtimeFinance(tenantId);
      await runFraudMonitor(tenantId);

      return batch;
    });
  }

  /**
   * 🔐 DYNAMIC CHART OF ACCOUNTS LOADER
   */
  private static async getTenantCoA(tx: any, tenantId: string) {
    const accounts = await tx.chartOfAccount.findMany({
      where: { tenantId }
    });

    const find = (code: string) => {
      const acc = accounts.find((a: any) => a.code === code);
      if (!acc) throw new Error(`Missing CoA: ${code}`);
      return acc.id;
    };

    return {
      salaryExpenseId: find('SALARY_EXPENSE'),
      nssfExpenseId: find('NSSF_EXPENSE'),
      levyExpenseId: find('HOUSING_LEVY_EXPENSE'),
      salaryPayableId: find('SALARY_PAYABLE'),
      payeLiabilityId: find('PAYE_LIABILITY'),
      shifLiabilityId: find('SHIF_LIABILITY'),
      nssfLiabilityId: find('NSSF_LIABILITY'),
      levyLiabilityId: find('HOUSING_LEVY_LIABILITY')
    };
  }
}