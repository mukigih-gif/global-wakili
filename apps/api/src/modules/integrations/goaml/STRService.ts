// apps/api/src/modules/integrations/goaml/STRService.ts

import type { Request } from 'express';
import { Prisma } from '@global-wakili/database';
import { GoAMLClient, type GoAMLSTRPayload } from './goAMLClient';
import { logAdminAction } from '../../../utils/audit-logger';
import { AuditAction, AuditSeverity } from '../../../types/audit';
import { NotificationService } from '../../notifications/NotificationService';

function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function requireTenantId(req: Request): string {
  if (!req.tenantId || !req.tenantId.trim()) {
    throw Object.assign(new Error('Tenant context is required for goAML operation.'), {
      statusCode: 401,
      code: 'GOAML_TENANT_CONTEXT_REQUIRED',
    });
  }

  return req.tenantId.trim();
}

function extractRegulatorAck(rawResponse: Record<string, unknown> | null | undefined): string | null {
  if (!rawResponse || typeof rawResponse !== 'object') return null;

  const candidates = [
    rawResponse.regulatorAck,
    rawResponse.acknowledgement,
    rawResponse.acknowledgment,
    rawResponse.ack,
    rawResponse.reference,
  ];

  const match = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);

  return typeof match === 'string' ? match : null;
}

type TenantGoAMLConfig = {
  baseUrl?: string | null;
  institutionCode?: string | null;
  username?: string | null;
  apiKey?: string | null;
  apiSecret?: string | null;
};

type CompliancePayload = {
  narrative?: string;
  suspicionReason?: string;
  subject?: {
    fullName?: string;
    idNumber?: string | null;
    passportNumber?: string | null;
    kraPin?: string | null;
    nationality?: string | null;
    phoneNumber?: string | null;
    email?: string | null;
    address?: string | null;
  };
  transaction?: {
    transactionDate?: string;
    amount?: number;
    currency?: string;
    reference?: string | null;
    channel?: string | null;
    sourceOfFunds?: string | null;
    destinationOfFunds?: string | null;
  };
  goaml?: {
    submissionReference?: string | null;
    gatewayStatus?: string | null;
    rejectionReason?: string | null;
    lastSyncedAt?: string | null;
    regulatorAck?: string | null;
    rawSubmitResponse?: Record<string, unknown> | null;
    rawStatusResponse?: Record<string, unknown> | null;
  };
};

type NotificationUser = {
  id: string;
  email: string | null;
  name: string | null;
};

function mapGatewayStatusToAmlStatus(gatewayStatus: string): string {
  switch (gatewayStatus) {
    case 'SUBMITTED':
    case 'ACCEPTED':
      return 'SUBMITTED';
    case 'REJECTED':
    case 'FAILED':
      return 'REJECTED';
    case 'QUEUED':
    default:
      return 'DRAFT';
  }
}

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
      select: {
        id: true,
        reportType: true,
        payload: true,
      },
    });

    if (!report) {
      throw Object.assign(new Error('Compliance report not found'), {
        statusCode: 404,
        code: 'COMPLIANCE_REPORT_NOT_FOUND',
      });
    }

    const payload = (report.payload ?? {}) as CompliancePayload;

    if (!payload.narrative || !payload.suspicionReason) {
      throw Object.assign(
        new Error('Compliance report payload is missing narrative or suspicionReason'),
        {
          statusCode: 422,
          code: 'COMPLIANCE_REPORT_PAYLOAD_INVALID',
        },
      );
    }

    if (!payload.subject?.fullName) {
      throw Object.assign(
        new Error('Compliance report payload is missing subject.fullName'),
        {
          statusCode: 422,
          code: 'COMPLIANCE_REPORT_PAYLOAD_INVALID',
        },
      );
    }

    if (!payload.transaction?.transactionDate) {
      throw Object.assign(
        new Error('Compliance report payload is missing transaction.transactionDate'),
        {
          statusCode: 422,
          code: 'COMPLIANCE_REPORT_PAYLOAD_INVALID',
        },
      );
    }

    return {
      tenantId: params.tenantId,
      reportId: report.id,
      reportType: report.reportType === 'STR' ? 'STR' : 'SAR',
      narrative: payload.narrative,
      suspicionReason: payload.suspicionReason,
      subject: {
        fullName: payload.subject.fullName,
        idNumber: payload.subject.idNumber ?? null,
        passportNumber: payload.subject.passportNumber ?? null,
        kraPin: payload.subject.kraPin ?? null,
        nationality: payload.subject.nationality ?? null,
        phoneNumber: payload.subject.phoneNumber ?? null,
        email: payload.subject.email ?? null,
        address: payload.subject.address ?? null,
      },
      transaction: {
        transactionDate: payload.transaction.transactionDate,
        amount: toNumber(payload.transaction.amount ?? 0),
        currency: payload.transaction.currency ?? 'KES',
        reference: payload.transaction.reference ?? null,
        channel: payload.transaction.channel ?? null,
        sourceOfFunds: payload.transaction.sourceOfFunds ?? null,
        destinationOfFunds: payload.transaction.destinationOfFunds ?? null,
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
    const submissionPayload = await this.buildPayload(db, params);

    const result = await GoAMLClient.submitSTR(config, submissionPayload);

    const report = await db.complianceReport.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.complianceReportId,
      },
      select: {
        id: true,
        payload: true,
      },
    });

    if (!report) {
      throw Object.assign(new Error('Compliance report not found'), {
        statusCode: 404,
        code: 'COMPLIANCE_REPORT_NOT_FOUND',
      });
    }

    const existingPayload = (report.payload ?? {}) as CompliancePayload;
    const regulatorAck = extractRegulatorAck(result.rawResponse ?? null);

    await db.complianceReport.update({
      where: { id: params.complianceReportId },
      data: {
        referenceNumber: result.submissionReference,
        status: mapGatewayStatusToAmlStatus(result.status),
        submittedAt: new Date(),
        regulatorAck,
        payload: {
          ...existingPayload,
          goaml: {
            ...(existingPayload.goaml ?? {}),
            submissionReference: result.submissionReference,
            gatewayStatus: result.status,
            rejectionReason: null,
            regulatorAck,
            lastSyncedAt: new Date().toISOString(),
            rawSubmitResponse: result.rawResponse ?? null,
          },
        },
      },
    });

    return {
      ...result,
      regulatorAck,
    };
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
        reportType: true,
        referenceNumber: true,
        regulatorAck: true,
        payload: true,
      },
    });

    if (!report) {
      throw Object.assign(new Error('Compliance report not found'), {
        statusCode: 404,
        code: 'COMPLIANCE_REPORT_NOT_FOUND',
      });
    }

    if (!report.referenceNumber) {
      throw Object.assign(new Error('Compliance report has no referenceNumber'), {
        statusCode: 409,
        code: 'GOAML_REFERENCE_MISSING',
      });
    }

    const result = await GoAMLClient.getSubmissionStatus(config, report.referenceNumber);
    const existingPayload = (report.payload ?? {}) as CompliancePayload;
    const regulatorAck =
      extractRegulatorAck(result.rawResponse ?? null) ?? report.regulatorAck ?? null;

    await db.complianceReport.update({
      where: { id: report.id },
      data: {
        status: mapGatewayStatusToAmlStatus(result.status),
        regulatorAck,
        payload: {
          ...existingPayload,
          goaml: {
            ...(existingPayload.goaml ?? {}),
            submissionReference: result.submissionReference,
            gatewayStatus: result.status,
            rejectionReason: result.rejectionReason ?? null,
            regulatorAck,
            lastSyncedAt: new Date().toISOString(),
            rawStatusResponse: result.rawResponse ?? null,
          },
        },
      },
    });

    return {
      complianceReportId: report.id,
      reportType: report.reportType,
      ...result,
      regulatorAck,
    };
  }

  static async submitReportFromRequest(req: Request, complianceReportId: string) {
    const tenantId = requireTenantId(req);

    const result = await this.submitReport(req.db, {
      tenantId,
      complianceReportId,
      requestId: req.id,
    });

    await logAdminAction({
      req,
      tenantId,
      action: AuditAction.UPDATE,
      severity: result.success ? AuditSeverity.INFO : AuditSeverity.HIGH,
      entityId: complianceReportId,
      payload: {
        eventCode: 'GOAML_REPORT_SUBMITTED',
        complianceReportId,
        submissionReference: result.submissionReference,
        status: result.status,
        regulatorAck: result.regulatorAck ?? null,
        requestId: req.id ?? null,
      },
    });

    return result;
  }

  static async syncReportStatusFromRequest(req: Request, complianceReportId: string) {
    const tenantId = requireTenantId(req);

    const result = await this.syncReportStatus(req.db, {
      tenantId,
      complianceReportId,
    });

    await logAdminAction({
      req,
      tenantId,
      action: AuditAction.UPDATE,
      severity:
        result.status === 'REJECTED' || result.status === 'FAILED'
          ? AuditSeverity.HIGH
          : AuditSeverity.INFO,
      entityId: complianceReportId,
      payload: {
        eventCode: 'GOAML_STATUS_SYNCED',
        complianceReportId,
        submissionReference: result.submissionReference,
        status: result.status,
        rejectionReason: result.rejectionReason ?? null,
        regulatorAck: result.regulatorAck ?? null,
        requestId: req.id ?? null,
      },
    });

    if (result.status === 'REJECTED' || result.status === 'FAILED') {
      try {
        const complianceUsers: NotificationUser[] = await req.db.user.findMany({
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
            name: true,
          },
        });

        if (complianceUsers.length) {
          await NotificationService.dispatch(req.db, {
            tenantId,
            category: 'compliance',
            priority: 'critical',
            channels: ['email', 'portal'],
            recipients: complianceUsers.map((user) => ({
              recipientId: user.id,
              email: user.email ?? null,
              phoneNumber: null,
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
            metadata: {
              requestId: req.id ?? null,
              goamlStatus: result.status,
              submissionReference: result.submissionReference,
              rejectionReason: result.rejectionReason ?? null,
              regulatorAck: result.regulatorAck ?? null,
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

export default STRService;