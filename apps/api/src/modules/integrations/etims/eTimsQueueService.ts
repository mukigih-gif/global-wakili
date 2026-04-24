import type { Request } from 'express';
import prisma from '../../../config/database';
import { getIntegrationQueue } from '../../queues/queue';
import { ETimsService } from './eTimsService';
import { logAdminAction } from '../../../utils/audit-logger';
import { AuditSeverity } from '../../../types/audit';

export class ETimsQueueService {
  static async enqueueInvoiceSubmission(
    req: Request,
    params: {
      invoiceId: string;
    },
  ) {
    const queue = getIntegrationQueue();

    const job = await queue.add('etims.submit.invoice', {
      tenantId: req.tenantId!,
      invoiceId: params.invoiceId,
      requestId: req.id,
    });

    await logAdminAction({
      req,
      tenantId: req.tenantId!,
      action: 'ETIMS_SUBMISSION_ENQUEUED',
      severity: AuditSeverity.INFO,
      entityId: params.invoiceId,
      payload: {
        invoiceId: params.invoiceId,
        queueJobId: job.id,
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
    const queue = getIntegrationQueue();

    const job = await queue.add('etims.sync.status', {
      tenantId: req.tenantId!,
      invoiceId: params.invoiceId,
      etimsReference: params.etimsReference,
      requestId: req.id,
    });

    await logAdminAction({
      req,
      tenantId: req.tenantId!,
      action: 'ETIMS_STATUS_SYNC_ENQUEUED',
      severity: AuditSeverity.INFO,
      entityId: params.invoiceId,
      payload: {
        invoiceId: params.invoiceId,
        etimsReference: params.etimsReference,
        queueJobId: job.id,
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
    return ETimsService.submitInvoice(prisma, {
      tenantId: payload.tenantId,
      invoiceId: payload.invoiceId,
      requestId: payload.requestId ?? null,
    });
  }

  static async handleStatusSyncJob(payload: {
    tenantId: string;
    invoiceId: string;
    etimsReference: string;
    requestId?: string;
  }) {
    return ETimsService.syncInvoiceStatus(prisma, {
      tenantId: payload.tenantId,
      invoiceId: payload.invoiceId,
    });
  }
}