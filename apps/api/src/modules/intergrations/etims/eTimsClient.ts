import crypto from 'crypto';
import { env } from '../../../config/env';

export type ETimsInvoiceLine = {
  itemCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
};

export type ETimsInvoicePayload = {
  tenantId: string;
  invoiceId: string;
  invoiceNumber: string;
  issueDate: string;
  currency: string;
  customerName: string;
  customerPin?: string | null;
  subTotal: number;
  taxAmount: number;
  total: number;
  lines: ETimsInvoiceLine[];
};

export type ETimsSubmissionResult = {
  success: boolean;
  submissionId: string | null;
  receiptNumber: string | null;
  status: 'QUEUED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'FAILED';
  rawResponse?: Record<string, unknown> | null;
};

export type ETimsStatusResult = {
  success: boolean;
  submissionId: string;
  status: 'QUEUED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'FAILED';
  receiptNumber?: string | null;
  rejectionReason?: string | null;
  rawResponse?: Record<string, unknown> | null;
};

type ETimsTenantConfig = {
  baseUrl?: string | null;
  deviceId?: string | null;
  taxpayerPin?: string | null;
  apiKey?: string | null;
  apiSecret?: string | null;
};

function assertConfigured(config: ETimsTenantConfig): void {
  if (!config.baseUrl || !config.deviceId || !config.taxpayerPin) {
    throw Object.assign(new Error('eTIMS tenant configuration is incomplete'), {
      statusCode: 500,
      code: 'ETIMS_CONFIGURATION_INCOMPLETE',
    });
  }
}

function signPayload(payload: unknown, secret?: string | null): string {
  const body = JSON.stringify(payload);
  const key = secret || env.JWT_SECRET;
  return crypto.createHmac('sha256', key).update(body).digest('hex');
}

export class ETimsClient {
  static async submitInvoice(
    config: ETimsTenantConfig,
    payload: ETimsInvoicePayload,
  ): Promise<ETimsSubmissionResult> {
    assertConfigured(config);

    const signature = signPayload(payload, config.apiSecret);

    console.info('[ETIMS_SUBMIT_ATTEMPT]', {
      tenantId: payload.tenantId,
      invoiceId: payload.invoiceId,
      invoiceNumber: payload.invoiceNumber,
      deviceId: config.deviceId,
      taxpayerPin: config.taxpayerPin,
      signature,
    });

    return {
      success: true,
      submissionId: `etims-sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      receiptNumber: null,
      status: 'SUBMITTED',
      rawResponse: {
        simulated: true,
        endpoint: `${config.baseUrl}/invoice/submit`,
      },
    };
  }

  static async getSubmissionStatus(
    config: ETimsTenantConfig,
    submissionId: string,
  ): Promise<ETimsStatusResult> {
    assertConfigured(config);

    console.info('[ETIMS_STATUS_CHECK]', {
      submissionId,
      deviceId: config.deviceId,
      taxpayerPin: config.taxpayerPin,
    });

    return {
      success: true,
      submissionId,
      status: 'ACCEPTED',
      receiptNumber: `etims-rcpt-${submissionId.slice(-6)}`,
      rejectionReason: null,
      rawResponse: {
        simulated: true,
        endpoint: `${config.baseUrl}/invoice/status`,
      },
    };
  }
}