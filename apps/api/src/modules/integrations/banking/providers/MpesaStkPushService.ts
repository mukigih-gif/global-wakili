/**
 * MpesaStkPushService.ts
 *
 * Safaricom Daraja M-PESA STK Push integration.
 *
 * Charter flow (MASTER_EXECUTION_CHARTER.md WIP-006):
 *   Invoice → Payment Request → STK Push → Callback → Receipt → Journal Entry → Audit Event
 *
 * Required env vars (production):
 *   MPESA_CONSUMER_KEY      — Daraja app consumer key
 *   MPESA_CONSUMER_SECRET   — Daraja app consumer secret
 *   MPESA_SHORTCODE         — Business shortcode (paybill/till)
 *   MPESA_PASSKEY           — Lipa na M-PESA Online passkey
 *   MPESA_CALLBACK_URL      — Publicly accessible callback URL for Safaricom push
 *   MPESA_ENV               — 'sandbox' | 'production' (default: sandbox)
 *
 * Without credentials: simulation mode — returns fake transaction IDs.
 *
 * WIP-006 — Gap 010.
 */

import { default as axios } from 'axios';

const DARAJA_SANDBOX    = 'https://sandbox.safaricom.co.ke';
const DARAJA_PRODUCTION = 'https://api.safaricom.co.ke';

export type STKPushInput = {
  tenantId: string;
  invoiceId: string;
  invoiceNumber: string;
  phoneNumber: string;      // E.164 format: +254XXXXXXXXX
  amount: number;           // KES integer
  accountReference: string; // Shown to customer on prompt
  description?: string;
};

export type STKPushResult = {
  success: boolean;
  checkoutRequestId: string | null;
  merchantRequestId: string | null;
  responseCode: string | null;
  responseDescription: string | null;
  simulated: boolean;
  rawResponse?: Record<string, unknown> | null;
};

export type STKCallbackPayload = {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{ Name: string; Value?: unknown }>;
      };
    };
  };
};

export type ParsedCallbackResult = {
  success: boolean;
  checkoutRequestId: string;
  merchantRequestId: string;
  resultCode: number;
  resultDesc: string;
  amount?: number | null;
  mpesaReceiptNumber?: string | null;
  transactionDate?: string | null;
  phoneNumber?: string | null;
};

function getBaseUrl(): string {
  return process.env.MPESA_ENV === 'production' ? DARAJA_PRODUCTION : DARAJA_SANDBOX;
}

function isConfigured(): boolean {
  return Boolean(
    process.env.MPESA_CONSUMER_KEY?.trim() &&
    process.env.MPESA_CONSUMER_SECRET?.trim() &&
    process.env.MPESA_SHORTCODE?.trim() &&
    process.env.MPESA_PASSKEY?.trim(),
  );
}

function normalizePhone(phone: string): string {
  const stripped = phone.replace(/[\s+\-()]/g, '');
  if (stripped.startsWith('0')) return `254${stripped.slice(1)}`;
  if (stripped.startsWith('+254')) return stripped.slice(1);
  return stripped;
}

async function getDarajaAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`,
  ).toString('base64');

  const response = await axios.get(
    `${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: { Authorization: `Basic ${credentials}` },
      timeout: 10_000,
    },
  );

  const token = response.data?.access_token;
  if (!token) throw new Error('Daraja did not return an access_token');
  return token;
}

function buildPassword(): { password: string; timestamp: string } {
  const shortcode = process.env.MPESA_SHORTCODE!;
  const passkey = process.env.MPESA_PASSKEY!;
  const timestamp = new Date()
    .toISOString()
    .replace(/[-T:.Z]/g, '')
    .slice(0, 14);
  const raw = `${shortcode}${passkey}${timestamp}`;
  const password = Buffer.from(raw).toString('base64');
  return { password, timestamp };
}

export class MpesaStkPushService {
  /**
   * Initiates STK Push — sends payment prompt to customer's phone.
   * Customer sees "Confirm payment of KES X to [accountReference]".
   */
  static async initiateStkPush(input: STKPushInput): Promise<STKPushResult> {
    if (!isConfigured()) {
      const checkoutRequestId = `sim-checkout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      console.info('[MPESA] Simulation mode — no Daraja credentials configured', {
        tenantId: input.tenantId,
        amount: input.amount,
        phone: input.phoneNumber,
      });
      return {
        success: true,
        checkoutRequestId,
        merchantRequestId: `sim-merchant-${Date.now()}`,
        responseCode: '0',
        responseDescription: 'Success. Request accepted for processing (SIMULATED)',
        simulated: true,
        rawResponse: { simulated: true },
      };
    }

    const token = await getDarajaAccessToken();
    const { password, timestamp } = buildPassword();
    const callbackUrl = process.env.MPESA_CALLBACK_URL?.trim();

    if (!callbackUrl) {
      throw Object.assign(new Error('MPESA_CALLBACK_URL is required for STK Push'), {
        statusCode: 500,
        code: 'MPESA_CALLBACK_URL_REQUIRED',
      });
    }

    const body = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.ceil(input.amount),
      PartyA: normalizePhone(input.phoneNumber),
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: normalizePhone(input.phoneNumber),
      CallBackURL: callbackUrl,
      AccountReference: input.accountReference.slice(0, 12),
      TransactionDesc: (input.description ?? `Invoice ${input.invoiceNumber}`).slice(0, 20),
    };

    try {
      const response = await axios.post(
        `${getBaseUrl()}/mpesa/stkpush/v1/processrequest`,
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 20_000,
        },
      );

      const data = response.data ?? {};
      console.info('[MPESA] STK Push initiated', {
        tenantId: input.tenantId,
        invoiceId: input.invoiceId,
        checkoutRequestId: data.CheckoutRequestID,
      });

      return {
        success: data.ResponseCode === '0',
        checkoutRequestId: data.CheckoutRequestID ?? null,
        merchantRequestId: data.MerchantRequestID ?? null,
        responseCode: data.ResponseCode ?? null,
        responseDescription: data.ResponseDescription ?? null,
        simulated: false,
        rawResponse: data,
      };
    } catch (error: unknown) {
      const msg = axios.isAxiosError(error) ? error.response?.data ?? error.message : String(error);
      console.error('[MPESA] STK Push failed', { tenantId: input.tenantId, error: msg });
      return {
        success: false,
        checkoutRequestId: null,
        merchantRequestId: null,
        responseCode: null,
        responseDescription: String(msg),
        simulated: false,
        rawResponse: { error: msg },
      };
    }
  }

  /**
   * Parses the Safaricom STK Push callback payload.
   * Call this from the POST /mpesa/callback route.
   */
  static parseCallback(raw: STKCallbackPayload): ParsedCallbackResult {
    const cb = raw?.Body?.stkCallback;
    if (!cb) {
      throw Object.assign(new Error('Invalid M-PESA callback payload'), {
        statusCode: 400,
        code: 'MPESA_CALLBACK_INVALID',
      });
    }

    const metadata = cb.CallbackMetadata?.Item ?? [];
    const getItem = (name: string) =>
      metadata.find((item) => item.Name === name)?.Value ?? null;

    return {
      success: cb.ResultCode === 0,
      checkoutRequestId: cb.CheckoutRequestID,
      merchantRequestId: cb.MerchantRequestID,
      resultCode: cb.ResultCode,
      resultDesc: cb.ResultDesc,
      amount: cb.ResultCode === 0 ? Number(getItem('Amount')) || null : null,
      mpesaReceiptNumber: cb.ResultCode === 0 ? String(getItem('MpesaReceiptNumber') ?? '') || null : null,
      transactionDate: cb.ResultCode === 0 ? String(getItem('TransactionDate') ?? '') || null : null,
      phoneNumber: cb.ResultCode === 0 ? String(getItem('PhoneNumber') ?? '') || null : null,
    };
  }

  /**
   * Validates the callback came from Safaricom.
   * In production, Safaricom IPs should be allowlisted at the load balancer.
   * This method provides an additional application-layer check.
   */
  static validateCallbackOrigin(ip: string): boolean {
    // Safaricom Daraja production callback IPs (as of 2026)
    const ALLOWED_IPS = new Set([
      '196.201.214.200',
      '196.201.214.206',
      '196.201.213.114',
      '196.201.214.207',
      '196.201.214.208',
      '196.201.213.44',
    ]);
    if (process.env.MPESA_ENV !== 'production') return true; // Allow all in sandbox
    return ALLOWED_IPS.has(ip);
  }
}
