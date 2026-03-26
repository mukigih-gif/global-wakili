import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { NotificationService } from './NotificationService';

const prisma = new PrismaClient();

export class MpesaService {
  /**
   * 1. GET ACCESS TOKEN
   * OAuth2 handshake with Safaricom.
   */
  private static async getAccessToken() {
    const auth = Buffer.from(
      `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString('base64');
    
    try {
      const { data } = await axios.get(
        "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", 
        { headers: { Authorization: `Basic ${auth}` } }
      );
      return data.access_token;
    } catch (error) {
      throw new Error("M-Pesa Authentication failed.");
    }
  }

  /**
   * 2. INITIATE STK PUSH (Express)
   * The "USER" triggers this from the dashboard to the client's phone.
   */
  static async initiateStkPush(amount: number, phone: string, invoiceNumber: string) {
    const token = await this.getAccessToken();
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64');

    try {
      const { data } = await axios.post(
        "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
        {
          BusinessShortCode: process.env.MPESA_SHORTCODE,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: Math.ceil(amount), 
          PartyA: phone,
          PartyB: process.env.MPESA_SHORTCODE,
          PhoneNumber: phone,
          CallBackURL: `${process.env.BASE_URL}/api/webhooks/mpesa-callback`,
          AccountReference: invoiceNumber, 
          TransactionDesc: `Legal Fees: ${invoiceNumber}`
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return data;
    } catch (error: any) {
      throw new Error("M-Pesa STK Push failed.");
    }
  }

  /**
   * 3. MASTER WEBHOOK HANDLER (STK + C2B Unified)
   * This is the "Full Loop" that validates the payment and updates the GL.
   */
  static async handleCallback(payload: any) {
    // Determine if it's STK Push (nested Body) or C2B (flat payload)
    const isStk = payload.Body?.stkCallback;
    const resultCode = isStk ? isStk.ResultCode : 0; // C2B is always assumed success if received

    if (resultCode !== 0) return { status: "CANCELLED" };

    // Extract Data Points based on Payload Type
    let amount, mpesaCode, phone, invoiceNo;

    if (isStk) {
      const meta = isStk.CallbackMetadata.Item;
      amount = meta.find((i: any) => i.Name === "Amount")?.Value;
      mpesaCode = meta.find((i: any) => i.Name === "MpesaReceiptNumber")?.Value;
      phone = meta.find((i: any) => i.Name === "PhoneNumber")?.Value;
      // Note: We use the AccountReference sent during initiation or lookup by amount
    } else {
      // C2B Structure
      amount = payload.TransAmount;
      mpesaCode = payload.TransID;
      phone = payload.MSISDN;
      invoiceNo = payload.BillRefNumber;
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Find Invoice (Lookup by Ref or Amount/Status)
      const invoice = await tx.invoice.findFirst({
        where: invoiceNo ? { invoiceNumber: invoiceNo } : { total: amount, status: 'ISSUED' },
        include: { matter: { include: { client: true } } }
      });

      if (!invoice) throw new Error(`[M-PESA] No matching invoice found for ${amount}`);

      // 2. Update Invoice to PAID
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { 
          status: 'FULLY_PAID',
          mpesaReceipt: mpesaCode // Saved for audit trail
        }
      });

      // 3. ATOMIC LEDGER ENTRY (The Accounting "Double Entry")
      const journal = await tx.journalEntry.create({
        data: {
          reference: mpesaCode,
          description: `M-Pesa Payment: ${invoice.invoiceNumber}`,
          userId: 'SYSTEM', // Automated system entry
          matterId: invoice.matterId,
          lines: {
            create: [
              { accountId: '1000', debit: amount, credit: 0 }, // Bank (Increase Asset)
              { accountId: '4000', debit: 0, credit: amount }  // Revenue (Increase Income)
            ]
          }
        }
      });

      // 4. TRIGGER NOTIFICATION
      await NotificationService.sendPaymentReceipt({
        phone: String(phone),
        clientName: invoice.matter.client.name,
        amount: Number(amount),
        invoiceNumber: invoice.invoiceNumber,
        mpesaCode: mpesaCode
      });

      return { status: "SUCCESS", journalId: journal.id };
    });
  }
}