import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

export class PayrollReportService {
  /**
   * Generates a branded Law Firm Payroll Report
   */
  static generateExecutiveReport(data: any, type: 'PARTNER' | 'CFO' | 'ACCOUNTANT') {
    const doc = new jsPDF();
    const dateStr = format(new Date(), 'dd-MM-yyyy');

    // 1. Branding Header
    doc.setFontSize(20);
    doc.setTextColor(44, 62, 80); // Professional Navy
    doc.text("GLOBAL WAKILI ERP", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Report Type: ${type} SUMMARY`, 14, 28);
    doc.text(`Date Generated: ${dateStr}`, 14, 33);
    doc.line(14, 36, 196, 36);

    // 2. Specialized Content Logic
    if (type === 'PARTNER') {
      this.addPartnerSection(doc, data);
    } else if (type === 'CFO') {
      this.addCFOSection(doc, data);
    }

    // 3. Save the File
    doc.save(`GlobalWakili_${type}_${dateStr}.pdf`);
  }

  private static addPartnerSection(doc: any, data: any) {
    doc.setFontSize(14);
    doc.text("Firm Profitability & Commission Insights", 14, 45);
    
    // @ts-ignore
    doc.autoTable({
      startY: 50,
      head: [['Lawyer Name', 'Base Pay', 'Finders Fees', 'Total Cost']],
      body: data.entries.map((e: any) => [
        `${e.employee.firstName} ${e.employee.lastName}`,
        e.basePay,
        e.commissions,
        (Number(e.grossPay) + Number(e.nssfEmployer) + Number(e.levyEmployer)).toFixed(2)
      ]),
      theme: 'striped',
      headStyles: { fillColor: [44, 62, 80] }
    });
  }

  private static addCFOSection(doc: any, data: any) {
    doc.setFontSize(14);
    doc.text("Statutory Liability & Cash Flow Forecast", 14, 45);
    
    // @ts-ignore
    doc.autoTable({
      startY: 50,
      head: [['Category', 'Total Amount (KES)', 'Due Date']],
      body: [
        ['Net Salary (Bank/M-Pesa)', data.summary.totalNetPay, 'As Per Contract'],
        ['KRA (PAYE + Housing Levy)', (data.summary.totalPAYE + data.summary.totalHousingLevy_Combined), '9th of Month'],
        ['NSSF (Tier I & II)', data.summary.totalNSSF_Combined, '9th of Month'],
        ['SHIF (Medical)', data.summary.totalSHIF, '9th of Month']
      ],
      theme: 'grid'
    });
  }
}