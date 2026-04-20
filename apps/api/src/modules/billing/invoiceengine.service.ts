import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export class InvoiceEngineService {
  /**
   * 🏗️ GENERATE PRO-FORMA
   * Aggregates TimeEntries and Disbursements but DOES NOT post to the Ledger.
   */
  static async generateProforma(tenantId: string, matterId: string) {
    const [timeEntries, disbursements] = await Promise.all([
      prisma.timeEntry.findMany({ 
        where: { matterId, tenantId, status: 'APPROVED', invoiceId: null } 
      }),
      prisma.procurement.findMany({ 
        where: { matterId, tenantId, status: 'PAID', invoiceId: null } 
      })
    ]);

    const subTotalTime = timeEntries.reduce((sum, e) => 
      sum.plus(new Decimal(e.durationSeconds / 3600).mul(e.hourlyRate)), new Decimal(0));
    
    const subTotalDisbursements = disbursements.reduce((sum, d) => 
      sum.plus(new Decimal(d.amount)), new Decimal(0));

    // Create Draft Invoice
    return await prisma.invoice.create({
      data: {
        tenantId,
        matterId,
        status: 'DRAFT', // Pro-forma stage
        totalAmount: subTotalTime.plus(subTotalDisbursements),
        taxAmount: subTotalTime.mul(0.16), // VAT on Professional Fees only
        currency: 'KES'
      }
    });
  }

  /**
   * 🚀 FINALIZE & E-TIMS QUEUE
   * Locks the invoice and queues it for KRA submission.
   */
  static async finalizeAndSubmit(invoiceId: string) {
    return await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: 'SUBMITTED', finalizedAt: new Date() }
      });

      // Add to External Job Queue for Async Worker to handle KRA API
      await tx.externalJobQueue.create({
        data: {
          tenantId: invoice.tenantId,
          serviceType: 'ETIMS_INVOICE_SUBMISSION',
          payload: { invoiceId: invoice.id }
        }
      });

      return invoice;
    });
  }
}