import { PrismaClient } from '@prisma/client';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const prisma = new PrismaClient();

async function generateCEOReport() {
  console.log("📄 Aggregating firm data for the Executive Report...");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // 1. Unified Data Fetch
  const [matters, timeEntries, staff] = await Promise.all([
    prisma.matter.findMany({ include: { timeEntries: true } }),
    prisma.timeEntry.findMany({ 
      where: { date: { gte: startOfMonth } },
      include: { advocate: true }
    }),
    prisma.user.findMany({ include: { timeEntries: true } })
  ]);

  // 2. Metrics Calculation
  const feesCollected = timeEntries.reduce((sum, e) => sum + (e.totalValue || 0), 0);
  const target = 1000000; // Monthly Target: KES 1M
  
  // Categorizing Matters
  const closedMatters = matters.filter(m => (m as any).status === 'CLOSED').length;
  const newClients = matters.filter(m => (m as any).createdAt >= startOfMonth).length;
  
  // Tasks Logic
  const completedTasks = timeEntries.filter(e => e.isBilled).length;
  const pendingTasks = timeEntries.filter(e => !e.isBilled).length;

  // 3. PDF Initialization
  const doc = new jsPDF();
  const title = `EXECUTIVE PERFORMANCE REPORT - ${now.toLocaleString('default', { month: 'long', year: 'numeric' })}`;

  // Styles & Header
  doc.setFontSize(20);
  doc.setTextColor(40);
  doc.text("GLOBAL WAKILI: MANAGEMENT OVERSIGHT", 14, 22);
  doc.setFontSize(10);
  doc.text(title, 14, 30);
  doc.line(14, 35, 196, 35);

  // SECTION I: FINANCIALS & GROWTH
  doc.setFontSize(14);
  doc.text("I. Financials & Market Growth", 14, 45);
  
  autoTable(doc, {
    startY: 50,
    head: [['Metric', 'Current Value', 'Target/Context']],
    body: [
      ['Monthly Fee Collections', `KES ${feesCollected.toLocaleString()}`, `Goal: KES ${target.toLocaleString()}`],
      ['Collection Achievement', `${((feesCollected / target) * 100).toFixed(1)}%`, feesCollected >= target ? '✅ EXCEEDED' : '⏳ ONGOING'],
      ['Matters Closed This Month', closedMatters.toString(), 'Efficiency Metric'],
      ['New Clients Onboarded', newClients.toString(), 'Growth Metric'],
      ['Est. Office Expenditure', 'KES 150,000', 'Target: < KES 200k'],
    ],
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] }
  });

  // SECTION II: OPERATIONAL TASKS
  const finalY = (doc as any).lastAutoTable.finalY;
  doc.text("II. Task & Compliance Metrics", 14, finalY + 15);
  
  autoTable(doc, {
    startY: finalY + 20,
    head: [['Status', 'Count', 'Description']],
    body: [
      ['Completed Tasks', completedTasks.toString(), 'Verified and ready for invoicing'],
      ['Pending/WIP Tasks', pendingTasks.toString(), 'Work in progress'],
    ],
    headStyles: { fillColor: [39, 174, 96] }
  });

  // SECTION III: STAFF LEADERBOARD
  const staffY = (doc as any).lastAutoTable.finalY;
  doc.text("III. Individual Staff Productivity", 14, staffY + 15);

  const staffData = staff.map(s => {
    const revenue = s.timeEntries.reduce((sum, e) => sum + e.totalValue, 0);
    return [s.name, s.timeEntries.length.toString(), `KES ${revenue.toLocaleString()}`];
  });

  autoTable(doc, {
    startY: staffY + 20,
    head: [['Staff Name', 'Total Tasks', 'Revenue Generated']],
    body: staffData,
    headStyles: { fillColor: [142, 68, 173] }
  });

  // 4. Save
  const fileName = `Global_Wakili_CEO_Report_${now.getMonth() + 1}_2026.pdf`;
  doc.save(fileName);
  
  console.log(`\n✅ SUCCESS: Executive report generated as ${fileName}`);
}

generateCEOReport()
  .catch(e => console.error("❌ ERROR generating report:", e))
  .finally(() => prisma.$disconnect());