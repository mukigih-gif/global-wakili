import axios from 'axios';
import { Decimal } from '@prisma/client/runtime/library';
import { withAudit } from '../../utils/audit-wrapper';
import { AuditSeverity } from '../../types/audit';
import { GeneralLedgerService } from './GeneralLedgerService';

export class PaymentService {
  /**
   * 📱 INITIATE M-PESA STK PUSH
   * Requests payment directly on the client's phone.
   */
  static async initiateStkPush(context: { tenantId: string; req: any; actor: any }, params: {
    invoiceId: string;
    phone: string;
    amount: number;
  }) {
    const db = context.req.db;

    return await withAudit(async () => {
      const invoice = await db.invoice.findUnique({ where: { id: params.invoiceId, tenantId: context.tenantId } });
      if (!invoice || invoice.status === 'PAID') throw new Error("Invalid or already paid invoice.");

      const token = await this.getMpesaToken();
      const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
      const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');

      try {
        const { data } = await axios.post(
          "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
          {
            BusinessShortCode: process.env.MPESA_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: Math.ceil(params.amount),
            PartyA: params.phone,
            PartyB: process.env.MPESA_SHORTCODE,
            PhoneNumber: params.phone,
            CallBackURL: `${process.env.BASE_URL}/api/webhooks/mpesa-callback`, // Global Webhook
            AccountReference: invoice.invoiceNumber,
            TransactionDesc: `Legal Fees: ${invoice.invoiceNumber}`
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        return data;
      } catch (error: any) {
        throw new Error(`M-Pesa STK Push failed: ${error.message}`);
      }
    }, context, { action: 'MPESA_STK_PUSH_INITIATED', severity: AuditSeverity.INFO });
  }

  /**
   * 🪝 HANDLE M-PESA WEBHOOK (TENANT-BLIND TO TENANT-AWARE)
   * Processes the Safaricom callback, locates the tenant, and posts to the Ledger.
   */
  static async processMpesaCallback(payload: any, globalDb: any) {
    const isStk = payload.Body?.stkCallback;
    if (isStk && isStk.ResultCode !== 0) return { status: "PAYMENT_FAILED" };

    // Extract Callback Data safely
    let amount, mpesaCode, invoiceNo;
    if (isStk) {
      const meta = isStk.CallbackMetadata.Item;
      amount = meta.find((i: any) => i.Name === "Amount")?.Value;
      mpesaCode = meta.find((i: any) => i.Name === "MpesaReceiptNumber")?.Value;
      // Note: Safaricom doesn't return AccountReference in STK callback, so we usually track CheckoutRequestID.
      // For this implementation, we assume C2B or an injected reference.
    } else {
      amount = payload.TransAmount;
      mpesaCode = payload.TransID;
      invoiceNo = payload.BillRefNumber;
    }

    if (!invoiceNo || !mpesaCode) throw new Error("Malformed M-Pesa Payload");

    // 1. Database Transaction (Tenant is resolved dynamically)
    return await globalDb.$transaction(async (tx: any) => {
      // Find Invoice to resolve Tenant and Matter
      const invoice = await tx.invoice.findUnique({
        where: { invoiceNumber: invoiceNo },
        include: { matter: true, tenant: true } // Resolve multi-tenant context
      });

      if (!invoice) throw new Error(`Invoice ${invoiceNo} not found in system.`);

      // Idempotency Check: Prevent double-processing
      const existingTx = await tx.journalEntry.findUnique({ where: { reference: mpesaCode } });
      if (existingTx) return { status: "ALREADY_PROCESSED" };

      // 2. Resolve Chart of Accounts for the specific Tenant
      const settings = await tx.tenantSettings.findUnique({ where: { tenantId: invoice.tenantId } });

      // 3. GL Posting: Direct Office Payment
      // Debit: Office Bank (Cash In) | Credit: Accounts Receivable (Debt Cleared)
      await GeneralLedgerService.postJournalEntry({
        tenantId: invoice.tenantId,
        date: new Date(),
        reference: mpesaCode,
        description: `M-Pesa Payment for ${invoice.invoiceNumber}`,
        postedById: 'SYSTEM_WEBHOOK',
        entries: [
          { accountId: settings.officeBankId, debit: new Decimal(amount), credit: new Decimal(0), matterId: invoice.matterId },
          { accountId: settings.accountsReceivableId, debit: new Decimal(0), credit: new Decimal(amount), matterId: invoice.matterId }
        ]
      }, tx);

      // 4. Update Invoice Status
      const newAmountPaid = new Decimal(invoice.amountPaid || 0).add(amount);
      const newStatus = newAmountPaid.greaterThanOrEqualTo(invoice.total) ? 'PAID' : 'PARTIALLY_PAID';

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { amountPaid: newAmountPaid, status: newStatus }
      });

      return { status: "SUCCESS", mpesaCode, invoiceId: invoice.id };
    });
  }

  private static async getMpesaToken() {
    const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
    const { data } = await axios.get("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
      headers: { Authorization: `Basic ${auth}` }
    });
    return data.access_token;
  }
}