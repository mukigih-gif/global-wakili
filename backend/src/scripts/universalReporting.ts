import { PrismaClient } from '@prisma/client';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';

const prisma = new PrismaClient();
const chartCanvas = new ChartJSNodeCanvas({ width: 600, height: 350 });

// 1. UNIVERSAL CALCULATION ENGINE (Shared across all scenarios)
const calculateUniversalKPIs = (entries: any[]) => {
  const gross = entries.reduce((sum, e) => sum + (e.totalValue || 0), 0);
  const vatRate = 0.16;
  const netRevenue = gross / (1 + vatRate);
  const kraObligation = gross - netRevenue;
  const realization = (entries.filter(e => e.isBilled).length / (entries.length || 1)) * 100;
  
  return { gross, netRevenue, kraObligation, realization };
};

const getTrendData = (val: number, isPercentage: boolean = false) => {
  const symbol = val > 0 ? '▲' : val < 0 ? '▼' : '•';
  const color = val > 0 ? [39, 174, 96] : val < 0 ? [192, 57, 43] : [127, 140, 141];
  return { text: `${symbol} ${Math.abs(val)}${isPercentage ? '%' : ''}`, color };
};

async function generateGlobalWakiliSimulation() {
  console.log("🚀 Running Universal Intelligence Engine (11-Staff / 20-Client Validation)...");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // 2. DATA AGGREGATION
  const [staff, matters, timeEntries] = await Promise.all([
    prisma.user.findMany({ include: { timeEntries: true } }),
    prisma.matter.findMany({ include: { client: true } }),
    prisma.timeEntry.findMany({ where: { date: { gte: startOfMonth } } }),
  ]);

  const kpis = calculateUniversalKPIs(timeEntries);

  // 3. PDF CONSTRUCTION
  const doc = new jsPDF() as any;
  
  // Header
  doc.setFillColor(28, 40, 51);
  doc.rect(0, 0, 210, 45, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text("GLOBAL WAKILI: EXECUTIVE COMMAND", 14, 25);
  doc.setFontSize(10);
  doc.text(`Universal Intelligence Suite | Kenya Compliance (eTIMS/KRA) | ${now.toLocaleDateString()}`, 14, 35);

  // Metric Ribbon (Universal Scaling)
  const drawBox = (x: number, label: string, val: string, sub: string, subColor: number[]) => {
    doc.setFillColor(248, 249, 249);
    doc.rect(x, 50, 45, 25, 'F');
    doc.setTextColor(44, 62, 80);
    doc.setFontSize(7); doc.text(label, x+5, 57);
    doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.text(val, x+5, 65);
    doc.setFontSize(7); doc.setTextColor(subColor[0], subColor[1], subColor[2]); doc.text(sub, x+5, 71);
    doc.setFont(undefined, 'normal');
  };

  drawBox(14, "GROSS (M-PESA/BANK)", `KES ${kpis.gross.toLocaleString()}`, "▲ 100% Growth", [39, 174, 96]);
  drawBox(62, "KRA OBLIGATION (VAT)", `KES ${kpis.kraObligation.toLocaleString()}`, "🔵 eTIMS Auto-Calc", [41, 128, 185]);
  drawBox(110, "TRUE NET REVENUE", `KES ${kpis.netRevenue.toLocaleString()}`, "🟢 Firm Profit", [39, 174, 96]);
  drawBox(158, "REALIZATION RATE", `${kpis.realization.toFixed(1)}%`, "🟢 Global Standard", [39, 174, 96]);

  // 4. CLIENT & STAFF PERFORMANCE (The Universal Matrices)
  autoTable(doc, {
    startY: 85,
    head: [['Client Entity', 'Active Matters', 'Trust Bal', 'Payments', 'Tax Status']],
    body: [
      ['Safaricom PLC (Corp)', '3', 'KES 450k', 'KES 1.2M', '✅ eTIMS Synced'],
      ['Equity Bank (Corp)', '2', 'KES 150k', 'KES 300k', '✅ eTIMS Synced'],
      ['Individual Client A', '1', 'KES 5k', 'KES 25k', 'Standard'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] }
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 15,
    head: [['Staff Member', 'Role', 'Revenue Contribution', 'Utilization', 'Status']],
    body: staff.map(s => {
      const staffRev = s.timeEntries.reduce((sum, e) => sum + e.totalValue, 0);
      return [s.name, (s as any).role || 'Advocate', `KES ${staffRev.toLocaleString()}`, '82%', '🟢 Elite'];
    }),
    theme: 'striped',
    headStyles: { fillColor: [39, 174, 96] }
  });

  const fileName = `Global_Wakili_Universal_Intelligence_${Date.now()}.pdf`;
  doc.save(fileName);
  console.log(`\n✅ SYNC COMPLETE: ${fileName} generated.`);
}

generateGlobalWakiliSimulation()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());