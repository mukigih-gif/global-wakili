import { Decimal } from '@prisma/client/runtime/library';
import axios from 'axios';
import { withAudit } from '../../utils/audit-wrapper';
import { AuditSeverity } from '../../types/audit';

export class EtimsService {
  /**
   * 🇰🇪 FISCALIZE INVOICE
   * Transmits a FINAL invoice to KRA and updates the DB with the Control Number.
   */
  static async transmit(context: { tenantId: string; req: any }, invoiceId: string) {
    const db = context.req.db;

    return await withAudit(async () => {
      const invoice = await db.invoice.findUnique({
        where: { id: invoiceId },
        include: { timeEntries: true, expenses: true, client: true, tenant: true }
      });

      if (!invoice || invoice.status !== 'FINAL') {
        throw new Error('Only FINAL invoices can be fiscalized.');
      }
      if (invoice.kraControlNumber) {
        return invoice; // Idempotency Check: Already transmitted
      }

      // 1. Map to KRA eTIMS Payload Standard
      const payload = this.buildKraPayload(invoice);

      try {
        // 2. Transmit to VSDC / OSCU API
        const kraApiUrl = process.env.KRA_ETIMS_URL || 'https://vsdc.kra.go.ke/api/invoice';
        const response = await axios.post(kraApiUrl, payload, {
          headers: { 'Authorization': `Bearer ${process.env.KRA_ETIMS_TOKEN}` }
        });

        // 3. Save KRA Response Metadata
        return await db.invoice.update({
          where: { id: invoiceId },
          data: {
            kraControlNumber: response.data.controlNumber,
            kraQrCodeUrl: response.data.qrCodeUrl,
            status: 'ISSUED' // Moved from FINAL to officially ISSUED
          }
        });

      } catch (error: any) {
        throw new Error(`KRA Transmission Failed: ${error.response?.data?.message || error.message}`);
      }
    }, context, { action: 'ETIMS_TRANSMISSION', severity: AuditSeverity.CRITICAL });
  }

  private static buildKraPayload(invoice: any) {
    // Maps Global Wakili data to exact KRA JSON keys
    const items = [];
    
    // Professional Fees (Taxable @ 16% - Tax Class A)
    invoice.timeEntries.forEach((t: any) => {
      items.push({
        itemCode: 'LEGAL-FEE-01',
        itemDescription: t.description,
        unitPrice: t.rate,
        quantity: t.hours,
        taxClass: 'A', // 16%
        taxRate: 16
      });
    });

    // Disbursements (Mixed Taxability)
    invoice.expenses.forEach((e: any) => {
      items.push({
        itemCode: e.category === 'FILING_FEE' ? 'DISB-EXEMPT' : 'DISB-TAXABLE',
        itemDescription: e.description,
        unitPrice: e.amount,
        quantity: 1,
        taxClass: e.isTaxable ? 'A' : 'E', // A = 16%, E = Exempt (0%)
        taxRate: e.isTaxable ? 16 : 0
      });
    });

    return {
      supplierPin: invoice.tenant.kraPin,
      buyerPin: invoice.client.kraPin || 'A000000000Z', // Default non-VAT buyer
      invoiceNumber: `INV-${invoice.id.substring(0,8)}`,
      invoiceDate: invoice.finalizedAt.toISOString(),
      items: items,
      totalTaxAmount: invoice.vatAmount,
      totalInvoiceAmount: invoice.total
    };
  }
}