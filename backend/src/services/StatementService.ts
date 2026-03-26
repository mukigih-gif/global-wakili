// src/services/StatementService.ts
import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { Response } from 'express';

const prisma = new PrismaClient();

export class StatementService {
  /**
   * GENERATE PDF STATEMENT
   * Fetches all Invoices and Trust Transactions for a Matter and streams a PDF.
   */
  static async generateMatterStatement(matterId: string, clientId: string, res: Response) {
    const matter = await prisma.matter.findFirst({
      where: { id: matterId, clientId: clientId },
      include: {
        client: true,
        invoices: { orderBy: { createdAt: 'asc' } },
        transactions: { orderBy: { createdAt: 'asc' } },
      }
    });

    if (!matter) throw new Error("Matter not found or unauthorized.");

    const doc = new PDFDocument({ margin: 50 });

    // Stream the PDF directly to the Express Response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Statement_${matter.fileNumber}.pdf`);
    doc.pipe(res);

    // --- PDF LAYOUT ---

    // 1. Header & Branding
    doc.fontSize(20).text("GLOBAL WAKILI LLP", { align: 'right' });
    doc.fontSize(10).text("Advocates & Commissioners for Oaths", { align: 'right' });
    doc.moveDown();
    doc.hr = () => doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.hr();
    doc.moveDown();

    // 2. Client & Matter Info
    doc.fontSize(12).font('Helvetica-Bold').text(`CLIENT: ${matter.client.name.toUpperCase()}`);
    doc.font('Helvetica').text(`Matter: ${matter.title}`);
    doc.text(`File Number: ${matter.fileNumber}`);
    doc.text(`Date Generated: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    // 3. Summary Box
    doc.rect(50, doc.y, 500, 50).fillAndStroke('#f1f5f9', '#cbd5e1');
    doc.fillColor('#0f172a').text(`CURRENT TRUST BALANCE: KES ${Number(matter.trustBalance).toLocaleString()}`, 70, doc.y - 35);
    doc.moveDown(2);

    // 4. Ledger Table Header
    doc.fillColor('black').font('Helvetica-Bold');
    doc.text("Date", 50, doc.y);
    doc.text("Description", 150, doc.y);
    doc.text("Amount (KES)", 450, doc.y, { align: 'right' });
    doc.moveDown();
    doc.hr();

    // 5. Combine and Loop through Transactions
    const ledgerItems = [
      ...matter.transactions.map(t => ({ date: t.createdAt, desc: t.description, amt: t.amount, type: 'CR' })),
      ...matter.invoices.filter(i => i.status !== 'DRAFT').map(i => ({ date: i.createdAt, desc: `Invoice ${i.invoiceNumber}`, amt: -Number(i.total), type: 'DR' }))
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    ledgerItems.forEach(item => {
      doc.font('Helvetica').fontSize(10);
      doc.text(item.date.toLocaleDateString(), 50, doc.y);
      doc.text(item.desc, 150, doc.y, { width: 280 });
      doc.text(item.amt.toLocaleString(), 450, doc.y, { align: 'right' });
      doc.moveDown();
    });

    // 6. Footer
    doc.moveDown();
    doc.fontSize(8).text("This is a computer-generated statement. No signature required.", { align: 'center', oblique: true });

    doc.end();
  }
}