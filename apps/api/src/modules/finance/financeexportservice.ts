import { FinanceAnalyticsService } from './FinanceAnalyticsService';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Response } from 'express';

export class FinanceExportService {
  private static analytics = new FinanceAnalyticsService();

  /**
   * 📗 EXCEL: DETAILED AUDIT TRAIL
   * Best for the Chief Accountant and CFO to verify line-item expenses.
   */
  static async exportLiquidityExcel(tenantId: string, res: Response) {
    const data = await this.analytics.getCfoLiquidityDashboard(tenantId);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Liquidity Report');

    sheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Amount (KES)', key: 'amount', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    sheet.addRows([
      { metric: 'Firm Office Liquidity', amount: data.firmLiquidity, status: 'OPERATIONAL' },
      { metric: 'Client Trust Liability', amount: data.clientTrustLiability, status: 'RESTRICTED' },
      { metric: 'Net Working Capital', amount: data.netWorkingCapital, status: 'AVAILABLE' },
    ]);

    // Apply strict formatting to Trust Liability to warn if Firm Liquidity is lower
    if (data.firmLiquidity.lessThan(data.clientTrustLiability)) {
      sheet.getRow(3).getCell(2).fill = {
        type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' }
      };
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Liquidity_Report_${tenantId}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * 📕 PDF: PARTNER PROFITABILITY REPORT
   * Formal layout with a "Four-Eyes" sign-off section for the CFO and Partner.
   */
  static async exportProfitabilityPDF(tenantId: string, range: { start: Date; end: Date }, res: Response) {
    const data = await this.analytics.getPartnerProfitability(tenantId, range.start, range.end);
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Profitability_Report.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('Global Wakili: Monthly Profitability Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Reporting Period: ${range.start.toLocaleDateString()} - ${range.end.toLocaleDateString()}`, { align: 'right' });
    doc.moveDown();

    // Financial Table
    doc.fontSize(12).text('Summary of Operations', { underline: true });
    doc.moveDown(0.5);
    doc.text(`Gross Revenue: KES ${data.pnl.grossRevenue.toLocaleString()}`);
    doc.text(`Operating Expenses: KES ${data.pnl.operatingExpenses.toLocaleString()}`);
    doc.fontSize(14).fillColor('green').text(`Net Profit: KES ${data.pnl.netProfit.toLocaleString()}`);
    doc.fillColor('black').moveDown();

    // Statutory Liability Section
    doc.fontSize(12).text('Statutory Tax Obligations (SHIF / PAYE / Housing Levy)', { underline: true });
    doc.text(`Total Current Liability: KES ${data.taxCompliance.unpaidStatutoryLiabilities.toLocaleString()}`);
    doc.moveDown();

    // Approval Footer (The "Checkmate" Signatures)
    doc.moveDown(4);
    doc.fontSize(10).text('Verified by Chief Accountant: ____________________', { align: 'left' });
    doc.moveDown();
    doc.text('Approved by CFO: ____________________', { align: 'left' });
    doc.moveDown();
    doc.text('Authorized by Senior Partner: ____________________', { align: 'left' });

    doc.end();
  }
}