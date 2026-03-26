// src/scripts/financeAudit.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function runEndMonthAudit() {
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  console.log("--- STARTING FINANCIAL AUDIT ---");

  const [staleInvoices, unbilledTime, unbilledExpenses] = await Promise.all([
    // 1. STALE INVOICES: Issued > 60 days ago and not fully paid
    prisma.invoice.findMany({
      where: {
        status: 'ISSUED',
        createdAt: { lt: sixtyDaysAgo }
      },
      include: { client: true, matter: true }
    }),

    // 2. UNBILLED TIME (WIP): Time logged but not attached to an invoice
    prisma.timeEntry.findMany({
      where: { status: 'UNBILLED' },
      include: { matter: { include: { client: true } }, user: true }
    }),

    // 3. UNBILLED EXPENSES/DISBURSEMENTS: Costs incurred but not recovered
    // Assuming you have an ExpenseEntry model linked to Matters
    prisma.expenseEntry.findMany({
      where: { status: 'UNBILLED' },
      include: { matter: { include: { client: true } } }
    })
  ]);

  // --- REPORT GENERATION ---

  const report = {
    staleTotal: staleInvoices.reduce((sum, inv) => sum + Number(inv.total), 0),
    wipTotal: unbilledTime.reduce((sum, t) => sum + (t.duration * Number(t.rate)), 0),
    expenseTotal: unbilledExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
  };

  console.log(`[ALERT] Found ${staleInvoices.length} Stale Invoices worth KES ${report.staleTotal.toLocaleString()}`);
  console.log(`[WIP] Found KES ${report.wipTotal.toLocaleString()} in Unbilled Time`);
  console.log(`[RECOVERY] Found KES ${report.expenseTotal.toLocaleString()} in Unbilled Expenses`);

  return {
    staleInvoices,
    unbilledTime,
    unbilledExpenses,
    totals: report
  };
}