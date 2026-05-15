// apps/api/src/modules/integrations/etims/eTimsQueueService.ts

import type { Request } from 'express';
import prisma from '../../../config/database';
import { getIntegrationQueue } from '../../queues/queue';
import { ETimsService } from './eTimsService';
import { logAdminAction } from '../../../utils/audit-logger';
import { AuditAction, AuditSeverity } from '../../../types/audit';

function requireTenantId(req: Request): string {
  if (!req.tenantId || !req.tenantId.trim()) {
    throw Object.assign(new Error('Tenant context is required for eTIMS queue operation.'), {
      statusCode: 401,
      code: 'ETIMS_TENANT_CONTEXT_REQUIRED',
    });
  }

  return req.tenantId.trim();
}

function requireJobString(
  value: string | null | undefined,
  fieldName: string,
  code: string,
): string {
  if (!value || !value.trim()) {
    throw Object.assign(new Error(`eTIMS job payload is missing ${fieldName}.`), {
      statusCode: 422,
      code,
      details: {
        fieldName,
      },
    });
  }

  return value.trim();
}

export class ETimsQueueService {
  static async enqueueInvoiceSubmission(
    req: Request,
    params: {
      invoiceId: string;
    },
  ) {
    const tenantId = requireTenantId(req);
    const queue = getIntegrationQueue();

    const job = await queue.add('etims.submit.invoice', {
      tenantId,
      invoiceId: params.invoiceId,
      requestId: req.id,
    });

    await logAdminAction({
      req,
      tenantId,
      action: AuditAction.UPDATE,
      severity: AuditSeverity.INFO,
      entityId: params.invoiceId,
      payload: {
        eventCode: 'ETIMS_SUBMISSION_ENQUEUED',
        invoiceId: params.invoiceId,
        queueJobId: job.id,
        requestId: req.id ?? null,
      },
    });

    return {
      queued: true,
      queueJobId: job.id,
    };
  }

  static async enqueueStatusSync(
    req: Request,
    params: {
      invoiceId: string;
      etimsReference: string;
    },
  ) {
    const tenantId = requireTenantId(req);
    const queue = getIntegrationQueue();

    const job = await queue.add('etims.sync.status', {
      tenantId,
      invoiceId: params.invoiceId,
      etimsReference: params.etimsReference,
      requestId: req.id,
    });

    await logAdminAction({
      req,
      tenantId,
      action: AuditAction.UPDATE,
      severity: AuditSeverity.INFO,
      entityId: params.invoiceId,
      payload: {
        eventCode: 'ETIMS_STATUS_SYNC_ENQUEUED',
        invoiceId: params.invoiceId,
        etimsReference: params.etimsReference,
        queueJobId: job.id,
        requestId: req.id ?? null,
      },
    });

    return {
      queued: true,
      queueJobId: job.id,
    };
  }

  static async handleSubmitJob(payload: {
    tenantId: string;
    invoiceId: string;
    requestId?: string;
  }) {
    const tenantId = requireJobString(payload.tenantId, 'tenantId', 'ETIMS_JOB_TENANT_REQUIRED');
    const invoiceId = requireJobString(payload.invoiceId, 'invoiceId', 'ETIMS_JOB_INVOICE_REQUIRED');

    return ETimsService.submitInvoice(prisma, {
      tenantId,
      invoiceId,
      requestId: payload.requestId ?? null,
    });
  }

  static async handleStatusSyncJob(payload: {
    tenantId: string;
    invoiceId: string;
    etimsReference: string;
    requestId?: string;
  }) {
    const tenantId = requireJobString(payload.tenantId, 'tenantId', 'ETIMS_JOB_TENANT_REQUIRED');
    const invoiceId = requireJobString(payload.invoiceId, 'invoiceId', 'ETIMS_JOB_INVOICE_REQUIRED');
    requireJobString(payload.etimsReference, 'etimsReference', 'ETIMS_JOB_REFERENCE_REQUIRED');

    return ETimsService.syncInvoiceStatus(prisma, {
      tenantId,
      invoiceId,
    });
  }
}

export default ETimsQueueService;