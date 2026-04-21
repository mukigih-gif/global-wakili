apps/api/src/modules/integrations/goaml/goAMLClient.ts
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
  submissionReference: string | null;
  status: 'QUEUED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'FAILED';
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
  if (!config.baseUrl || !config.institutionCode || !config.username) {
    throw Object.assign(new Error('goAML tenant configuration is incomplete'), {
      statusCode: 500,
      code: 'GOAML_CONFIGURATION_INCOMPLETE',
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
      signature,
    });

    return {
      success: true,
      submissionReference: `goaml-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: 'SUBMITTED',
      rawResponse: {
        simulated: true,
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
    });

    return {
      success: true,
      submissionReference,
      status: 'ACCEPTED',
      rejectionReason: null,
      rawResponse: {
        simulated: true,
        endpoint: `${config.baseUrl}/reports/status`,
      },
    };
  }
}
apps/api/src/modules/integrations/goaml/STRService.ts
import type { Request } from 'express';
import { Prisma } from '@global-wakili/database';
import { GoAMLClient, type GoAMLSTRPayload } from './goAMLClient';
import { logAdminAction } from '../../../utils/audit-logger';
import { AuditSeverity } from '../../../types/audit';
import { NotificationService } from '../notifications/NotificationService';

function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

type TenantGoAMLConfig = {
  baseUrl?: string | null;
  institutionCode?: string | null;
  username?: string | null;
  apiKey?: string | null;
  apiSecret?: string | null;
};

export class STRService {
  static async getTenantConfig(db: any, tenantId: string): Promise<TenantGoAMLConfig> {
    const tenant = await db.tenant.findFirst({
      where: { id: tenantId },
      select: {
        settings: true,
      },
    });

    const settings = (tenant?.settings ?? {}) as Record<string, unknown>;
    const goaml = (settings.goaml ?? {}) as Record<string, unknown>;

    return {
      baseUrl: typeof goaml.baseUrl === 'string' ? goaml.baseUrl : null,
      institutionCode: typeof goaml.institutionCode === 'string' ? goaml.institutionCode : null,
      username: typeof goaml.username === 'string' ? goaml.username : null,
      apiKey: typeof goaml.apiKey === 'string' ? goaml.apiKey : null,
      apiSecret: typeof goaml.apiSecret === 'string' ? goaml.apiSecret : null,
    };
  }

  static async buildPayload(
    db: any,
    params: {
      tenantId: string;
      complianceReportId: string;
    },
  ): Promise<GoAMLSTRPayload> {
    const report = await db.complianceReport.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.complianceReportId,
      },
      include: {
        client: true,
        matter: true,
        trustTransaction: true,
      },
    });

    if (!report) {
      throw Object.assign(new Error('Compliance report not found'), {
        statusCode: 404,
        code: 'COMPLIANCE_REPORT_NOT_FOUND',
      });
    }

    const subject = {
      fullName:
        report.client?.name ||
        report.subjectName ||
        'Unknown Subject',
      idNumber: report.subjectIdNumber ?? null,
      passportNumber: report.subjectPassportNumber ?? null,
      kraPin: report.client?.kraPin ?? report.subjectKraPin ?? null,
      nationality: report.subjectNationality ?? null,
      phoneNumber: report.client?.phoneNumber ?? null,
      email: report.client?.email ?? null,
      address: report.subjectAddress ?? null,
    };

    const txDate =
      report.trustTransaction?.transactionDate ||
      report.transactionDate ||
      report.createdAt;

    const amount =
      report.trustTransaction?.amount ||
      report.transactionAmount ||
      0;

    return {
      tenantId: params.tenantId,
      reportId: report.id,
      reportType: report.reportType === 'STR' ? 'STR' : 'SAR',
      narrative: report.narrative,
      suspicionReason: report.suspicionReason,
      subject,
      transaction: {
        transactionDate: txDate.toISOString(),
        amount: toNumber(amount),
        currency: report.currency ?? 'KES',
        reference:
          report.trustTransaction?.reference ??
          report.transactionReference ??
          null,
        channel: report.transactionChannel ?? null,
        sourceOfFunds: report.sourceOfFunds ?? null,
        destinationOfFunds: report.destinationOfFunds ?? null,
      },
    };
  }

  static async submitReport(
    db: any,
    params: {
      tenantId: string;
      complianceReportId: string;
      requestId?: string | null;
    },
  ) {
    const config = await this.getTenantConfig(db, params.tenantId);
    const payload = await this.buildPayload(db, params);

    const result = await GoAMLClient.submitSTR(config, payload);

    await db.complianceReport.update({
      where: { id: params.complianceReportId },
      data: {
        submissionReference: result.submissionReference,
        submissionStatus: result.status,
        submittedAt: new Date(),
      },
    });

    return result;
  }

  static async syncReportStatus(
    db: any,
    params: {
      tenantId: string;
      complianceReportId: string;
    },
  ) {
    const config = await this.getTenantConfig(db, params.tenantId);

    const report = await db.complianceReport.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.complianceReportId,
      },
      select: {
        id: true,
        submissionReference: true,
        reportType: true,
        matterId: true,
      },
    });

    if (!report) {
      throw Object.assign(new Error('Compliance report not found'), {
        statusCode: 404,
        code: 'COMPLIANCE_REPORT_NOT_FOUND',
      });
    }

    if (!report.submissionReference) {
      throw Object.assign(new Error('Compliance report has no submission reference'), {
        statusCode: 409,
        code: 'GOAML_REFERENCE_MISSING',
      });
    }

    const result = await GoAMLClient.getSubmissionStatus(config, report.submissionReference);

    await db.complianceReport.update({
      where: { id: report.id },
      data: {
        submissionStatus: result.status,
        rejectionReason: result.rejectionReason ?? null,
        lastSyncedAt: new Date(),
      },
    });

    return {
      complianceReportId: report.id,
      reportType: report.reportType,
      ...result,
    };
  }

  static async submitReportFromRequest(req: Request, complianceReportId: string) {
    const tenantId = req.tenantId!;

    const result = await this.submitReport(req.db, {
      tenantId,
      complianceReportId,
      requestId: req.id,
    });

    await logAdminAction({
      req,
      tenantId,
      action: 'GOAML_REPORT_SUBMITTED',
      severity: result.success ? AuditSeverity.INFO : AuditSeverity.HIGH,
      entityId: complianceReportId,
      payload: {
        complianceReportId,
        submissionReference: result.submissionReference,
        status: result.status,
      },
    });

    return result;
  }

  static async syncReportStatusFromRequest(req: Request, complianceReportId: string) {
    const tenantId = req.tenantId!;

    const result = await this.syncReportStatus(req.db, {
      tenantId,
      complianceReportId,
    });

    await logAdminAction({
      req,
      tenantId,
      action: 'GOAML_STATUS_SYNCED',
      severity:
        result.status === 'REJECTED' || result.status === 'FAILED'
          ? AuditSeverity.HIGH
          : AuditSeverity.INFO,
      entityId: complianceReportId,
      payload: {
        complianceReportId,
        submissionReference: result.submissionReference,
        status: result.status,
        rejectionReason: result.rejectionReason ?? null,
      },
    });

    if (result.status === 'REJECTED' || result.status === 'FAILED') {
      try {
        const complianceUsers = await req.db.user.findMany({
          where: {
            tenantId,
            status: 'ACTIVE',
            roles: {
              some: {
                name: { in: ['Compliance', 'Partner', 'Managing Partner'] },
              },
            },
          },
          select: {
            id: true,
            email: true,
            phoneNumber: true,
            name: true,
          },
        });

        if (complianceUsers.length) {
          await NotificationService.dispatch(req.db, {
            tenantId,
            category: 'compliance',
            priority: 'critical',
            channels: ['email', 'portal'],
            recipients: complianceUsers.map((user: any) => ({
              recipientId: user.id,
              email: user.email ?? null,
              phoneNumber: user.phoneNumber ?? null,
              name: user.name ?? null,
            })),
            template: {
              templateKey: 'COMPLIANCE_ALERT',
              subject: 'goAML reporting issue',
              textBody: `Compliance report ${complianceReportId} has goAML status ${result.status}.`,
              htmlBody: `<p>Compliance report <strong>${complianceReportId}</strong> has goAML status <strong>${result.status}</strong>.</p>`,
              variables: {},
            },
            entityType: 'ComplianceReport',
            entityId: complianceReportId,
            requestId: req.id,
            metadata: {
              goamlStatus: result.status,
              submissionReference: result.submissionReference,
              rejectionReason: result.rejectionReason ?? null,
            },
          });
        }
      } catch (notificationError) {
        console.error('[GOAML_NOTIFICATION_FAIL]', notificationError);
      }
    }

    return result;
  }
}