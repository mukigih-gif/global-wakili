/**
 * eTimsClient.ts
 *
 * KRA eTIMS HTTP client — real invoice submission and status check.
 *
 * Production flow (MASTER_EXECUTION_CHARTER.md):
 *   Invoice Finalization → Submission → Control Number → QR Code → PDF Stamping → Audit Event
 *
 * Activation:
 *   Set ETIMS_BASE_URL (e.g. https://etims-api.kra.go.ke/etims-api/1.0)
 *   Per-tenant: tenant.settings.etims.deviceId, .taxpayerPin, .apiKey, .apiSecret
 *
 * Sandbox:
 *   ETIMS_BASE_URL=https://etims-sbx.kra.go.ke/etims-api/1.0
 *   Per-tenant sandbox credentials from KRA Developer Portal.
 *
 * Without credentials: simulation mode (logs to console, returns plausible fake data).
 *
 * WIP-006 — Gap 011.
 */

import crypto from 'crypto';
import { default as axios } from 'axios';
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
  controlNumber?: string | null;
  qrCode?: string | null;
  status: 'QUEUED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'FAILED';
  rawResponse?: Record<string, unknown> | null;
};

export type ETimsStatusResult = {
  success: boolean;
  submissionId: string;
  status: 'QUEUED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'FAILED';
  receiptNumber?: string | null;
  controlNumber?: string | null;
  qrCode?: string | null;
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
  if (!config.deviceId || !config.taxpayerPin) {
    throw Object.assign(new Error('eTIMS tenant configuration is incomplete (deviceId and taxpayerPin required)'), {
      statusCode: 500,
      code: 'ETIMS_CONFIGURATION_INCOMPLETE',
    });
  }
}

function resolveBaseUrl(config: ETimsTenantConfig): string {
  return config.baseUrl?.trim() ||
    process.env.ETIMS_BASE_URL?.trim() ||
    'https://etims-sbx.kra.go.ke/etims-api/1.0';
}

function signPayload(payload: unknown, secret?: string | null): string {
  const body = JSON.stringify(payload);
  const key = secret || process.env.ETIMS_SIGNING_SECRET || env.JWT_SECRET;
  return crypto.createHmac('sha256', key).update(body).digest('hex');
}

function isConfigured(config: ETimsTenantConfig): boolean {
  return Boolean(config.deviceId?.trim() && config.taxpayerPin?.trim());
}

function buildInvoiceRequest(config: ETimsTenantConfig, payload: ETimsInvoicePayload) {
  return {
    deviceId: config.deviceId,
    taxpayerPin: config.taxpayerPin,
    invoice: {
      invoiceNumber: payload.invoiceNumber,
      issueDate: payload.issueDate,
      currency: payload.currency,
      customer: {
        name: payload.customerName,
        pin: payload.customerPin ?? null,
      },
      subTotal: payload.subTotal,
      taxAmount: payload.taxAmount,
      total: payload.total,
      lines: payload.lines.map((line) => ({
        itemCode: line.itemCode,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
        taxAmount: line.taxAmount,
        lineTotal: line.lineTotal,
      })),
    },
  };
}

export class ETimsClient {
  static async submitInvoice(
    config: ETimsTenantConfig,
    payload: ETimsInvoicePayload,
  ): Promise<ETimsSubmissionResult> {
    assertConfigured(config);

    const baseUrl = resolveBaseUrl(config);
    const requestBody = buildInvoiceRequest(config, payload);
    const signature = signPayload(requestBody, config.apiSecret);

    if (!isConfigured(config) || !process.env.ETIMS_BASE_URL && !config.baseUrl) {
      // Simulation fallback
      console.info('[ETIMS] Simulation mode — no baseUrl configured', {
        tenantId: payload.tenantId,
        invoiceNumber: payload.invoiceNumber,
      });
      return {
        success: true,
        submissionId: `etims-sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        receiptNumber: null,
        controlNumber: null,
        qrCode: null,
        status: 'SUBMITTED',
        rawResponse: { simulated: true, endpoint: `${baseUrl}/invoice/submit` },
      };
    }

    try {
      const response = await axios.post(
        `${baseUrl}/invoice/submit`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Device-Id': config.deviceId!,
            'X-Taxpayer-Pin': config.taxpayerPin!,
            'X-Signature': signature,
            ...(config.apiKey ? { 'X-Api-Key': config.apiKey } : {}),
          },
          timeout: 30_000,
        },
      );

      const data = response.data ?? {};
      console.info('[ETIMS] Invoice submitted', {
        tenantId: payload.tenantId,
        invoiceNumber: payload.invoiceNumber,
        status: data.status,
        submissionId: data.submissionId,
      });

      return {
        success: true,
        submissionId: data.submissionId ?? null,
        receiptNumber: data.receiptNumber ?? null,
        controlNumber: data.controlNumber ?? null,
        qrCode: data.qrCode ?? null,
        status: data.status ?? 'SUBMITTED',
        rawResponse: data,
      };
    } catch (error: unknown) {
      const msg = axios.isAxiosError(error) ? error.response?.data ?? error.message : String(error);
      console.error('[ETIMS] Submission failed', { tenantId: payload.tenantId, error: msg });
      return {
        success: false,
        submissionId: null,
        receiptNumber: null,
        status: 'FAILED',
        rawResponse: { error: msg },
      };
    }
  }

  static async getSubmissionStatus(
    config: ETimsTenantConfig,
    submissionId: string,
  ): Promise<ETimsStatusResult> {
    assertConfigured(config);

    const baseUrl = resolveBaseUrl(config);

    if (!process.env.ETIMS_BASE_URL && !config.baseUrl) {
      // Simulation fallback
      return {
        success: true,
        submissionId,
        status: 'ACCEPTED',
        receiptNumber: `etims-rcpt-${submissionId.slice(-6)}`,
        controlNumber: `KRA-${Date.now()}`,
        qrCode: `https://etims.kra.go.ke/verify/${submissionId}`,
        rawResponse: { simulated: true },
      };
    }

    try {
      const response = await axios.get(
        `${baseUrl}/invoice/status/${submissionId}`,
        {
          headers: {
            'X-Device-Id': config.deviceId!,
            'X-Taxpayer-Pin': config.taxpayerPin!,
            ...(config.apiKey ? { 'X-Api-Key': config.apiKey } : {}),
          },
          timeout: 15_000,
        },
      );

      const data = response.data ?? {};
      return {
        success: true,
        submissionId,
        status: data.status ?? 'SUBMITTED',
        receiptNumber: data.receiptNumber ?? null,
        controlNumber: data.controlNumber ?? null,
        qrCode: data.qrCode ?? null,
        rejectionReason: data.rejectionReason ?? null,
        rawResponse: data,
      };
    } catch (error: unknown) {
      const msg = axios.isAxiosError(error) ? error.response?.data ?? error.message : String(error);
      console.error('[ETIMS] Status check failed', { submissionId, error: msg });
      return {
        success: false,
        submissionId,
        status: 'FAILED',
        rejectionReason: String(msg),
        rawResponse: { error: msg },
      };
    }
  }
}
