// apps/api/src/modules/integrations/goaml/goAMLClient.ts

import crypto from 'crypto';
import { env } from '../../../config/env';

export type GoAMLSubject = {
  fullName: string;
  idNumber?: string | null;
  passportNumber?: string | null;
  kraPin?: string | null;
  nationality?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  address?: string | null;
};

export type GoAMLTransaction = {
  transactionDate: string;
  amount: number;
  currency: string;
  reference?: string | null;
  channel?: string | null;
  sourceOfFunds?: string | null;
  destinationOfFunds?: string | null;
};

export type GoAMLSTRPayload = {
  tenantId: string;
  reportId: string;
  reportType: 'STR' | 'SAR';
  narrative: string;
  suspicionReason: string;
  subject: GoAMLSubject;
  transaction: GoAMLTransaction;
};

export type GoAMLSubmissionResult = {
  success: boolean;
  submissionReference: string;
  status: 'QUEUED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'FAILED';
  rejectionReason?: string | null;
  rawResponse?: Record<string, unknown> | null;
};

export type GoAMLStatusResult = {
  success: boolean;
  submissionReference: string;
  status: 'QUEUED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'FAILED';
  rejectionReason?: string | null;
  rawResponse?: Record<string, unknown> | null;
};

type GoAMLTenantConfig = {
  baseUrl?: string | null;
  institutionCode?: string | null;
  username?: string | null;
  apiKey?: string | null;
  apiSecret?: string | null;
};

function assertConfigured(config: GoAMLTenantConfig): void {
  if (!config.baseUrl || !config.institutionCode || !config.username || !config.apiKey) {
    throw Object.assign(new Error('goAML tenant configuration is incomplete'), {
      statusCode: 500,
      code: 'GOAML_CONFIGURATION_INCOMPLETE',
      details: {
        hasBaseUrl: Boolean(config.baseUrl),
        hasInstitutionCode: Boolean(config.institutionCode),
        hasUsername: Boolean(config.username),
        hasApiKey: Boolean(config.apiKey),
      },
    });
  }
}

function signPayload(payload: unknown, secret?: string | null): string {
  const body = JSON.stringify(payload);
  const key = secret || env.JWT_SECRET;

  return crypto.createHmac('sha256', key).update(body).digest('hex');
}

export class GoAMLClient {
  static async submitSTR(
    config: GoAMLTenantConfig,
    payload: GoAMLSTRPayload,
  ): Promise<GoAMLSubmissionResult> {
    assertConfigured(config);

    const signature = signPayload(payload, config.apiSecret);

    console.info('[GOAML_STR_SUBMIT]', {
      tenantId: payload.tenantId,
      reportId: payload.reportId,
      reportType: payload.reportType,
      institutionCode: config.institutionCode,
      username: config.username,
      endpoint: `${config.baseUrl}/reports/submit`,
      signaturePresent: Boolean(signature),
    });

    return {
      success: true,
      submissionReference: `goaml-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      status: 'SUBMITTED',
      rejectionReason: null,
      rawResponse: {
        simulated: true,
        provider: 'goAML',
        endpoint: `${config.baseUrl}/reports/submit`,
      },
    };
  }

  static async getSubmissionStatus(
    config: GoAMLTenantConfig,
    submissionReference: string,
  ): Promise<GoAMLStatusResult> {
    assertConfigured(config);

    console.info('[GOAML_STATUS_CHECK]', {
      submissionReference,
      institutionCode: config.institutionCode,
      username: config.username,
      endpoint: `${config.baseUrl}/reports/status`,
    });

    return {
      success: true,
      submissionReference,
      status: 'ACCEPTED',
      rejectionReason: null,
      rawResponse: {
        simulated: true,
        provider: 'goAML',
        endpoint: `${config.baseUrl}/reports/status`,
      },
    };
  }
}

export default GoAMLClient;