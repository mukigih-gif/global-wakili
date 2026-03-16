import { PrismaClient } from '@prisma/client';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';

const prisma = new PrismaClient();
const chartCanvas = new ChartJSNodeCanvas({ width: 600, height: 400 });

async function generateGlobalReport() {
  console.log("📊 Generating Legal Intelligence Report (Gold Standard)...");

  // 1. DATA AGGREGATION (Mirroring Clio's Firm Insights)
  const target = 1000000; // Monthly Revenue Goal: KES 1M
  const [matters, timeEntries, staff] = await Promise.all([
    prisma.matter.findMany(),
    prisma.timeEntry.findMany({ include: { advocate: true } }),
    prisma.user.findMany({ include: { timeEntries: true } })
  ]);

  const totalRevenue = timeEntries.reduce((sum, e) => sum + (e.totalValue || 0), 0);
  const billedTasks = timeEntries.filter(e => e.isBilled).length;
  const pendingTasks = timeEntries.filter(e => !e.isBilled).length;

  // 2. VISUALIZATION ENGINE
  const renderChart = (config: any) => chartCanvas.renderToBuffer(config);

  // Chart A: STAFF UTILIZATION (Leaderboard)
  const staffChart = await renderChart({
    type: 'bar',
    data: {
      labels: staff.map(s => s.name),
      datasets: [{
        label: 'Revenue Generated (KES)',
        data: staff.map(s => s.timeEntries.reduce((sum, e) => sum + e.totalValue, 0)),
        backgroundColor: '#34495e'
      }]
    },
    options: { plugins: { title: { display: true, text: 'Attorney/Staff Revenue Attribution' } } }
  });

  // Chart B: TARGET PROGRESS (Realization Rate)
  const targetChart = await renderChart({
    type: 'doughnut',
    data: {
      labels: ['Collected', 'Gap to Target'],
      datasets: [{
        data: [totalRevenue, Math.max(0, target - totalRevenue)],
        backgroundColor: ['#27ae60', '#ecf0f1'],
        borderWidth: 0
      }]
    },
    options: { plugins: { title: { display: true, text: 'Monthly Billing Goal' } } }
  });

  // Chart C: MATTER STATUS (Velocity)
  const statusChart = await renderChart({
    type: 'pie',
    data: {
      labels: ['Open', 'Closed', 'On Hold'],
      datasets: [{
        data: [
          matters.filter(m => (m as any).status === 'OPEN' || !(m as any).status).length,
          matters.filter(m => (m as any).status === 'CLOSED').length,
          matters.filter(m => (m as any).status === 'HOLD').length
        ],
        backgroundColor: ['#2980b9', '#95a5a6', '#f1c40f']
      }]
    }
  });

  // 3. PDF CONSTRUCTION (The "Executive Summary" Layout)
  const doc = new jsPDF() as any;
  const now = new Date();

  // Branding & Header
  doc.setFillColor(44, 62, 80);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text("GLOBAL WAKILI: EXECUTIVE INSIGHTS", 14, 20);
  
  doc.setTextColor(44, 62, 80);
  doc.setFontSize(10);
  doc.text(`Generated: ${now.toLocaleDateString()} | Strategy for Global Sites Ltd`, 14, 38);
  doc.line(14, 40, 196, 40);

  // Row 1: Charts
  doc.setFontSize(12);
  doc.text("Firm Realization Rate", 14, 50);
  doc.addImage(targetChart, 'PNG', 10, 55, 90, 60);
  
  doc.text("Matter Lifecycle Status", 110, 50);
  doc.addImage(statusChart, 'PNG', 110, 55, 80, 60);

  // Row 2: Staff Chart
  doc.text("Revenue Attribution by Staff", 14, 125);
  doc.addImage(staffChart, 'PNG', 14, 130, 180, 70);

  // Detailed Financial KPI Table (Clio-Style)
  autoTable(doc, {
    startY: 210,
    head: [['Key Performance Indicator', 'Value', 'Status']],
    body: [
      ['Gross Logged Revenue', `KES ${totalRevenue.toLocaleString()}`, totalRevenue >= target ? '🎯 TARGET REACHED' : '📈 IN PROGRESS'],
      ['Utilization Rate (Billable vs Total)', `${((billedTasks / (billedTasks + pendingTasks || 1)) * 100).toFixed(1)}%`, 'Efficiency Metric'],
      ['New Growth (Recent 30 Days)', matters.filter(m => (m as any).createdAt > new Date(Date.now() - 30*24*60*60*1000)).length.toString(), 'Pipeline Strength'],
      ['Office Expenditure (Projected)', 'KES 150,000', 'Budget Control']
    ],
    theme: 'striped',
    headStyles: { fillColor: [52, 73, 94] }
  });

  // 4. EXPORT
  const fileName = `Global_Wakili_Analytics_Report_${now.getMonth() + 1}_2026.pdf`;
  doc.save(fileName);

  console.log(`\n✅ REPORT COMPLETE: ${fileName}`);
}

generateGlobalReport()
  .catch(e => console.error("❌ Analytics Failure:", e))
  .finally(() => prisma.$disconnect());