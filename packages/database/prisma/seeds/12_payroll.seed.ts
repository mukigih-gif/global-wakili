import { PayrollBatchStatus, Prisma, PrismaClient, StatutoryDeductionType, TenantRole } from '@prisma/client';

/*
 * 12_payroll.seed.ts — Per-tenant payroll layer (CLAUDE.md §12).
 *
 * Seeds one fully-processed monthly payroll run per tenant for three seeded
 * HR users (advocate / associate / clerk), with Kenyan statutory deductions,
 * payslips, and a balanced GL posting — all with raw prisma (idempotent,
 * self-contained, consistent with 10_finance / 11_trust).
 *
 * Seeds per tenant:
 *   - PayrollBatch     : current month, status PAID (PayrollBatchStatus has no
 *                        COMPLETED; a generated→approved→posted→paid run is PAID).
 *   - PayrollRecord    : 1 per employee (gross/net/totalDeductions/employerCost).
 *   - Payslip          : 1 per employee, with dedicated paye/shif/nssf/housingLevy
 *                        columns + taxablePay; net = gross − all deductions.
 *   - StatutoryDeductionRecord : 4 per payslip (PAYE, SHIF, NSSF, HOUSING_LEVY).
 *   - JournalEntry/Line: 1 balanced batch journal —
 *                        DR 5000 Staff Salaries (total gross)
 *                        CR 2200 PAYE / 2210 SHIF / 2220 NSSF / 2230 Housing Levy
 *                        CR 1000 Operating Bank (total net paid).
 *
 * Kenyan statutory model (current regime):
 *   - NSSF        : 6% of gross, capped at KES 2,160 (Tier I+II employee).
 *   - SHIF        : 2.75% of gross.
 *   - Housing Levy: 1.5% of gross.
 *   - PAYE        : taxable = gross − NSSF − SHIF − Housing Levy (all pre-tax
 *                   deductible under the Tax Laws (Amdt) Act 2024); progressive
 *                   bands (10/25/30/32.5/35%); less personal relief 2,400/mo.
 *   - employerCost: gross + employer NSSF match (informational; NOT posted —
 *                   the GL posts the employee-side per the journal spec above).
 *
 * DEMO/FIXTURE data — run only under the master demo-data gate.
 *
 * Policy:
 * - Idempotent: batch upsert(tenantId,month,year,branchId); payslip & record
 *   gated by findFirst(tenantId,batchId,userId); statutory items created with
 *   the payslip; batch journal gated by findFirst(tenantId,reference);
 *   AccountBalance for the 6 touched accounts RECOMPUTED from journal-line sums.
 * - Tenant-scoped. No schema changes, no destructive operations.
 */

type SeedPrisma = PrismaClient;

type EmployeeSeed = {
  tenantRole: TenantRole;
  label: string;
  gross: string; // KES gross monthly, 2dp string
};

export type PayrollSeedResult = {
  status: 'payroll_seed_complete';
  tenantId: string;
  payrollBatches: number;
  payrollRecords: number;
  payslips: number;
  statutoryDeductionRecords: number;
  journalEntries: number;
  journalLines: number;
  glBalanced: boolean;
};

const ZERO = new Prisma.Decimal(0);
const ROUND = Prisma.Decimal.ROUND_HALF_UP;

const SHIF_RATE = new Prisma.Decimal('0.0275');
const HOUSING_LEVY_RATE = new Prisma.Decimal('0.015');
const NSSF_RATE = new Prisma.Decimal('0.06');
const NSSF_CAP = new Prisma.Decimal('2160');
const PERSONAL_RELIEF = new Prisma.Decimal('2400');

/* Monthly PAYE bands (cumulative upper bounds); top band has no ceiling. */
const PAYE_BANDS: { upTo: Prisma.Decimal | null; rate: string }[] = [
  { upTo: new Prisma.Decimal('24000'), rate: '0.10' },
  { upTo: new Prisma.Decimal('32333'), rate: '0.25' },
  { upTo: new Prisma.Decimal('500000'), rate: '0.30' },
  { upTo: new Prisma.Decimal('800000'), rate: '0.325' },
  { upTo: null, rate: '0.35' },
];

/* Gross pay matches v3 test data Section 2.4. */
const EMPLOYEE_SEEDS: EmployeeSeed[] = [
  { tenantRole: TenantRole.ADVOCATE, label: 'Advocate', gross: '120000.00' },
  { tenantRole: TenantRole.ASSOCIATE, label: 'Associate', gross: '85000.00' },
  { tenantRole: TenantRole.CLERK, label: 'Clerk', gross: '65000.00' },
];

/* COA codes seeded by 10_finance (all confirmed present). */
const ACCT = {
  SALARIES: '5000',
  PAYE: '2200',
  SHIF: '2210',
  NSSF: '2220',
  HOUSING_LEVY: '2230',
  BANK: '1000',
} as const;

function round2(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2, ROUND);
}

/* Progressive PAYE over the bands, less personal relief, floored at zero. */
function computePaye(taxable: Prisma.Decimal): Prisma.Decimal {
  let tax = ZERO;
  let prev = ZERO;

  for (const band of PAYE_BANDS) {
    const ceiling = band.upTo === null ? taxable : Prisma.Decimal.min(taxable, band.upTo);
    const slice = ceiling.minus(prev);
    if (slice.gt(ZERO)) {
      tax = tax.plus(slice.times(band.rate));
    }
    if (band.upTo === null || taxable.lte(band.upTo)) {
      break;
    }
    prev = band.upTo;
  }

  const payable = tax.minus(PERSONAL_RELIEF);
  return round2(payable.gt(ZERO) ? payable : ZERO);
}

type PayrollFigures = {
  gross: Prisma.Decimal;
  nssf: Prisma.Decimal;
  shif: Prisma.Decimal;
  housingLevy: Prisma.Decimal;
  taxablePay: Prisma.Decimal;
  paye: Prisma.Decimal;
  totalDeductions: Prisma.Decimal;
  netPay: Prisma.Decimal;
  employerCost: Prisma.Decimal;
};

function computeFigures(grossInput: string): PayrollFigures {
  const gross = round2(new Prisma.Decimal(grossInput));
  const nssf = round2(Prisma.Decimal.min(gross.times(NSSF_RATE), NSSF_CAP));
  const shif = round2(gross.times(SHIF_RATE));
  const housingLevy = round2(gross.times(HOUSING_LEVY_RATE));
  const taxablePay = round2(gross.minus(nssf).minus(shif).minus(housingLevy));
  const paye = computePaye(taxablePay);
  const totalDeductions = round2(paye.plus(shif).plus(nssf).plus(housingLevy));
  const netPay = round2(gross.minus(totalDeductions));
  const employerCost = round2(gross.plus(nssf)); // gross + employer NSSF match (informational)
  return { gross, nssf, shif, housingLevy, taxablePay, paye, totalDeductions, netPay, employerCost };
}

async function resolvePosterId(prisma: SeedPrisma, tenantId: string): Promise<string> {
  const poster =
    (await prisma.user.findFirst({ where: { tenantId, tenantRole: TenantRole.FIRM_ADMIN }, select: { id: true } })) ??
    (await prisma.user.findFirst({ where: { tenantId, status: 'ACTIVE' }, select: { id: true } }));
  if (!poster) {
    throw new Error(`seedPayroll: no user for tenant ${tenantId}. Run 02_users first.`);
  }
  return poster.id;
}

async function resolveAccountByCode(prisma: SeedPrisma, tenantId: string, code: string): Promise<string> {
  const account = await prisma.chartOfAccount.findFirst({
    where: { tenantId, code },
    select: { id: true },
  });
  if (!account) {
    throw new Error(`seedPayroll: account ${code} not configured for tenant ${tenantId}. Run 10_finance first.`);
  }
  return account.id;
}

export async function seedPayroll(prisma: PrismaClient, tenantId: string): Promise<PayrollSeedResult> {
  if (!tenantId || tenantId.trim().length === 0) {
    throw new Error('seedPayroll requires a tenantId.');
  }

  const posterId = await resolvePosterId(prisma, tenantId);
  // branchId is part of the PayrollBatch natural key (tenantId,month,year,branchId);
  // Prisma types that key's branchId as non-nullable, and 05_branches always seeds one.
  const branch = await prisma.branch.findFirst({ where: { tenantId }, select: { id: true } });
  if (!branch) {
    throw new Error(`seedPayroll: no branch for tenant ${tenantId}. Run 05_branches first.`);
  }
  const branchId = branch.id;

  // Period: current month (server UTC), pay date = last day of the month.
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1; // 1-based
  const periodTag = `${year}-${String(month).padStart(2, '0')}`;
  const payDate = new Date(Date.UTC(year, month, 0, 12, 0, 0));

  const accounts = {
    salaries: await resolveAccountByCode(prisma, tenantId, ACCT.SALARIES),
    paye: await resolveAccountByCode(prisma, tenantId, ACCT.PAYE),
    shif: await resolveAccountByCode(prisma, tenantId, ACCT.SHIF),
    nssf: await resolveAccountByCode(prisma, tenantId, ACCT.NSSF),
    housingLevy: await resolveAccountByCode(prisma, tenantId, ACCT.HOUSING_LEVY),
    bank: await resolveAccountByCode(prisma, tenantId, ACCT.BANK),
  };

  // Resolve the three employees from the seeded HR users.
  const employees: { userId: string; employeeProfileId: string | null; figures: PayrollFigures; seed: EmployeeSeed }[] = [];
  for (const seed of EMPLOYEE_SEEDS) {
    const user = await prisma.user.findFirst({
      where: { tenantId, tenantRole: seed.tenantRole },
      select: { id: true },
    });
    // Defensive: 02_users must have run first.
    if (!user) {
      continue;
    }
    const profile = await prisma.employeeProfile.findFirst({
      where: { tenantId, userId: user.id },
      select: { id: true },
    });
    employees.push({
      userId: user.id,
      employeeProfileId: profile?.id ?? null,
      figures: computeFigures(seed.gross),
      seed,
    });
  }

  // 1. PayrollBatch — current month, PAID (upsert on the natural key).
  const batch = await prisma.payrollBatch.upsert({
    where: { tenantId_month_year_branchId: { tenantId, month, year, branchId } },
    update: {
      status: PayrollBatchStatus.PAID,
      generatedById: posterId,
      approvedById: posterId,
      approvedAt: payDate,
      postedAt: payDate,
      paidAt: payDate,
      notes: `Monthly payroll ${periodTag} (seed).`,
    },
    create: {
      tenantId,
      branchId,
      month,
      year,
      status: PayrollBatchStatus.PAID,
      generatedById: posterId,
      approvedById: posterId,
      approvedAt: payDate,
      postedAt: payDate,
      paidAt: payDate,
      notes: `Monthly payroll ${periodTag} (seed).`,
    },
    select: { id: true },
  });

  // 2. Per-employee payslip (+ statutory items) and payroll record.
  for (const emp of employees) {
    const f = emp.figures;

    const existingPayslip = await prisma.payslip.findFirst({
      where: { tenantId, batchId: batch.id, userId: emp.userId },
      select: { id: true },
    });

    const existingRecord = await prisma.payrollRecord.findFirst({
      where: { tenantId, batchId: batch.id, userId: emp.userId },
      select: { id: true },
    });

    await prisma.$transaction(async (tx) => {
      if (!existingPayslip) {
        await tx.payslip.create({
          data: {
            tenantId,
            batchId: batch.id,
            userId: emp.userId,
            employeeProfileId: emp.employeeProfileId,
            grossPay: f.gross,
            taxablePay: f.taxablePay,
            netPay: f.netPay,
            paye: f.paye,
            shif: f.shif,
            nssf: f.nssf,
            housingLevy: f.housingLevy,
            allowances: ZERO,
            deductions: ZERO,
            employerCost: f.employerCost,
            statutoryItems: {
              create: [
                { tenantId, type: StatutoryDeductionType.PAYE, amount: f.paye, reference: `PAYE-${periodTag}` },
                { tenantId, type: StatutoryDeductionType.SHIF, amount: f.shif, reference: `SHIF-${periodTag}` },
                { tenantId, type: StatutoryDeductionType.NSSF, amount: f.nssf, reference: `NSSF-${periodTag}` },
                { tenantId, type: StatutoryDeductionType.HOUSING_LEVY, amount: f.housingLevy, reference: `AHL-${periodTag}` },
              ],
            },
          },
        });
      }

      if (!existingRecord) {
        await tx.payrollRecord.create({
          data: {
            tenantId,
            batchId: batch.id,
            userId: emp.userId,
            employeeProfileId: emp.employeeProfileId,
            grossPay: f.gross,
            netPay: f.netPay,
            totalDeductions: f.totalDeductions,
            employerCost: f.employerCost,
            postedAt: payDate,
          },
        });
      }
    });
  }

  // 3. Balanced batch GL journal — totals are deterministic (gated by reference).
  const totals = employees.reduce(
    (acc, e) => ({
      gross: acc.gross.plus(e.figures.gross),
      paye: acc.paye.plus(e.figures.paye),
      shif: acc.shif.plus(e.figures.shif),
      nssf: acc.nssf.plus(e.figures.nssf),
      housingLevy: acc.housingLevy.plus(e.figures.housingLevy),
      net: acc.net.plus(e.figures.netPay),
    }),
    { gross: ZERO, paye: ZERO, shif: ZERO, nssf: ZERO, housingLevy: ZERO, net: ZERO },
  );

  const totalCredits = round2(totals.paye.plus(totals.shif).plus(totals.nssf).plus(totals.housingLevy).plus(totals.net));
  const glBalanced = round2(totals.gross).equals(totalCredits);

  const payrollRef = `PAYROLL-${periodTag}`;

  if (employees.length > 0) {
    if (!glBalanced) {
      throw new Error(`seedPayroll: batch GL not balanced (DR ${totals.gross.toString()} != CR ${totalCredits.toString()}).`);
    }

    const existingJournal = await prisma.journalEntry.findFirst({
      where: { tenantId, reference: payrollRef },
      select: { id: true },
    });

    if (!existingJournal) {
      const line = (accountId: string, debit: Prisma.Decimal, credit: Prisma.Decimal, description: string) => ({
        tenantId,
        accountId,
        branchId,
        reference: payrollRef,
        description,
        debit,
        credit,
      });

      await prisma.journalEntry.create({
        data: {
          tenantId,
          reference: payrollRef,
          description: `Payroll ${periodTag} — salaries, statutory deductions and net pay (seed).`,
          date: payDate,
          amount: round2(totals.gross),
          currency: 'KES',
          postedById: posterId,
          sourceModule: 'payroll',
          sourceEntityType: 'PayrollBatch',
          sourceEntityId: batch.id,
          lines: {
            create: [
              line(accounts.salaries, round2(totals.gross), ZERO, 'Gross staff salaries'),
              line(accounts.paye, ZERO, round2(totals.paye), 'PAYE payable to KRA'),
              line(accounts.shif, ZERO, round2(totals.shif), 'SHIF payable'),
              line(accounts.nssf, ZERO, round2(totals.nssf), 'NSSF payable'),
              line(accounts.housingLevy, ZERO, round2(totals.housingLevy), 'Affordable Housing Levy payable'),
              line(accounts.bank, ZERO, round2(totals.net), 'Net salaries paid from operating bank'),
            ],
          },
        },
      });
    }
  }

  // 4. Recompute AccountBalance for the 6 touched accounts from ALL journal lines
  //    (idempotent set; keeps the trial balance correct without a rebuild pass).
  for (const accountId of Object.values(accounts)) {
    const agg = await prisma.journalLine.aggregate({
      where: { tenantId, accountId },
      _sum: { debit: true, credit: true },
    });
    const debitBalance = agg._sum.debit ?? ZERO;
    const creditBalance = agg._sum.credit ?? ZERO;
    const netBalance = new Prisma.Decimal(debitBalance).minus(creditBalance);
    await prisma.accountBalance.upsert({
      where: { tenantId_accountId: { tenantId, accountId } },
      update: { debitBalance, creditBalance, netBalance },
      create: { tenantId, accountId, debitBalance, creditBalance, netBalance },
    });
  }

  // Final counts via queries → correct regardless of create-vs-skip on reruns.
  const [
    payrollBatches,
    payrollRecords,
    payslips,
    statutoryDeductionRecords,
    journalEntries,
    journalLines,
  ] = await Promise.all([
    prisma.payrollBatch.count({ where: { tenantId, id: batch.id } }),
    prisma.payrollRecord.count({ where: { tenantId, batchId: batch.id } }),
    prisma.payslip.count({ where: { tenantId, batchId: batch.id } }),
    prisma.statutoryDeductionRecord.count({ where: { tenantId, payslip: { batchId: batch.id } } }),
    prisma.journalEntry.count({ where: { tenantId, reference: payrollRef } }),
    prisma.journalLine.count({ where: { tenantId, reference: payrollRef } }),
  ]);

  return {
    status: 'payroll_seed_complete',
    tenantId,
    payrollBatches,
    payrollRecords,
    payslips,
    statutoryDeductionRecords,
    journalEntries,
    journalLines,
    glBalanced,
  };
}
