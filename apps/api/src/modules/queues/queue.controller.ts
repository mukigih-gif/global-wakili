// apps/api/src/modules/queues/queue.controller.ts

import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { QueueAuditService } from './QueueAuditService';
import { QueueCapabilityService } from './QueueCapabilityService';
import { QueueDashboardService } from './QueueDashboardService';
import { QueueDispatchService } from './QueueDispatchService';
import { QueuePersistenceService } from './QueuePersistenceService';
import { QueueRegistryService } from './QueueRegistryService';
import { QueueReportService } from './QueueReportService';

export const createQueueJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await QueuePersistenceService.createJob(req.db, {
    tenantId: req.tenantId ?? null,
    provider: req.body.provider,
    jobType: req.body.jobType,
    entityType: req.body.entityType ?? null,
    entityId: req.body.entityId ?? null,
    payload: req.body.payload,
    maxAttempts: req.body.maxAttempts ?? null,
  });

  await QueueAuditService.logAction(req.db, {
    tenantId: req.tenantId ?? null,
    userId: req.user?.sub ?? null,
    jobId: job.id,
    action: 'JOB_CREATED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    metadata: {
      provider: job.provider,
      jobType: job.jobType,
      status: job.status,
    },
  });

  res.status(201).json(job);
});

export const enqueueQueueJob = asyncHandler(async (req: Request, res: Response) => {
  const result = await QueueDispatchService.enqueuePersistedJob(req.db, {
    jobId: req.params.jobId,
    tenantId: req.tenantId ?? null,
  });

  await QueueAuditService.logAction(req.db, {
    tenantId: req.tenantId ?? null,
    userId: req.user?.sub ?? null,
    jobId: req.params.jobId,
    action: 'JOB_ENQUEUED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    metadata: result,
  });

  res.status(202).json(result);
});

export const createAndEnqueueQueueJob = asyncHandler(async (req: Request, res: Response) => {
  const result = await QueueDispatchService.createAndEnqueue(req.db, {
    tenantId: req.tenantId ?? null,
    provider: req.body.provider,
    jobType: req.body.jobType,
    entityType: req.body.entityType ?? null,
    entityId: req.body.entityId ?? null,
    payload: req.body.payload,
    maxAttempts: req.body.maxAttempts ?? null,
  });

  await QueueAuditService.logAction(req.db, {
    tenantId: req.tenantId ?? null,
    userId: req.user?.sub ?? null,
    jobId: result.job.id,
    action: 'JOB_ENQUEUED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    metadata: {
      provider: result.job.provider,
      jobType: result.job.jobType,
      queued: result.queued,
    },
  });

  res.status(202).json(result);
});

export const getQueueJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await QueuePersistenceService.getJob(req.db, {
    jobId: req.params.jobId,
    tenantId: req.tenantId ?? null,
  });

  await QueueAuditService.logAction(req.db, {
    tenantId: req.tenantId ?? null,
    userId: req.user?.sub ?? null,
    jobId: job.id,
    action: 'JOB_VIEWED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
  });

  res.status(200).json(job);
});

export const searchQueueJobs = asyncHandler(async (req: Request, res: Response) => {
  const result = await QueueReportService.search(req.db, {
    tenantId: req.tenantId ?? null,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    filters: {
      provider: req.query.provider ? (String(req.query.provider) as any) : null,
      status: req.query.status ? (String(req.query.status) as any) : null,
      jobType: req.query.jobType ? String(req.query.jobType) : null,
      entityType: req.query.entityType ? String(req.query.entityType) : null,
      entityId: req.query.entityId ? String(req.query.entityId) : null,
      createdFrom: req.query.createdFrom ? String(req.query.createdFrom) : null,
      createdTo: req.query.createdTo ? String(req.query.createdTo) : null,
      nextRetryFrom: req.query.nextRetryFrom ? String(req.query.nextRetryFrom) : null,
      nextRetryTo: req.query.nextRetryTo ? String(req.query.nextRetryTo) : null,
    },
  });

  await QueueAuditService.logAction(req.db, {
    tenantId: req.tenantId ?? null,
    userId: req.user?.sub ?? null,
    action: 'JOB_SEARCHED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    metadata: {
      resultCount: result.meta.total,
    },
  });

  res.status(200).json(result);
});

export const markQueueJobProcessing = asyncHandler(async (req: Request, res: Response) => {
  const job = await QueuePersistenceService.markProcessing(req.db, {
    jobId: req.params.jobId,
    tenantId: req.tenantId ?? null,
  });

  await QueueAuditService.logAction(req.db, {
    tenantId: req.tenantId ?? null,
    userId: req.user?.sub ?? null,
    jobId: job.id,
    action: 'JOB_PROCESSING',
    requestId: req.id,
  });

  res.status(200).json(job);
});

export const markQueueJobCompleted = asyncHandler(async (req: Request, res: Response) => {
  const job = await QueuePersistenceService.markCompleted(req.db, {
    jobId: req.params.jobId,
    tenantId: req.tenantId ?? null,
    result: req.body.result ?? null,
  });

  await QueueAuditService.logAction(req.db, {
    tenantId: req.tenantId ?? null,
    userId: req.user?.sub ?? null,
    jobId: job.id,
    action: 'JOB_COMPLETED',
    requestId: req.id,
  });

  res.status(200).json(job);
});

export const markQueueJobFailed = asyncHandler(async (req: Request, res: Response) => {
  const job = await QueuePersistenceService.markFailed(req.db, {
    tenantId: req.tenantId ?? null,
    jobId: req.params.jobId,
    error: req.body.error,
    retry: req.body.retry,
  });

  await QueueAuditService.logAction(req.db, {
    tenantId: req.tenantId ?? null,
    userId: req.user?.sub ?? null,
    jobId: job.id,
    action: job.status === 'DEAD_LETTER' ? 'JOB_DEAD_LETTERED' : 'JOB_FAILED',
    requestId: req.id,
    metadata: {
      status: job.status,
      lastError: job.lastError,
      nextRetryAt: job.nextRetryAt,
    },
  });

  res.status(200).json(job);
});

export const retryQueueJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await QueuePersistenceService.retryJob(req.db, {
    jobId: req.params.jobId,
    tenantId: req.tenantId ?? null,
  });

  await QueueAuditService.logAction(req.db, {
    tenantId: req.tenantId ?? null,
    userId: req.user?.sub ?? null,
    jobId: job.id,
    action: 'JOB_RETRIED',
    requestId: req.id,
  });

  res.status(200).json(job);
});

export const getQueueDashboard = asyncHandler(async (req: Request, res: Response) => {
  const dashboard = await QueueDashboardService.getDashboard(req.db, {
    tenantId: req.tenantId ?? null,
    provider: req.query.provider ? String(req.query.provider) : null,
    from: req.query.from ? String(req.query.from) : null,
    to: req.query.to ? String(req.query.to) : null,
  });

  await QueueAuditService.logAction(req.db, {
    tenantId: req.tenantId ?? null,
    userId: req.user?.sub ?? null,
    action: 'DASHBOARD_VIEWED',
    requestId: req.id,
  });

  res.status(200).json(dashboard);
});

export const getQueueReportSummary = asyncHandler(async (req: Request, res: Response) => {
  const report = await QueueReportService.getSummary(req.db, {
    tenantId: req.tenantId ?? null,
    provider: req.query.provider ? String(req.query.provider) : null,
    from: req.query.from ? String(req.query.from) : null,
    to: req.query.to ? String(req.query.to) : null,
  });

  await QueueAuditService.logAction(req.db, {
    tenantId: req.tenantId ?? null,
    userId: req.user?.sub ?? null,
    action: 'REPORT_VIEWED',
    requestId: req.id,
  });

  res.status(200).json(report);
});

export const getQueueCapabilities = asyncHandler(async (req: Request, res: Response) => {
  const result = QueueCapabilityService.getSummary();

  await QueueAuditService.logAction(req.db, {
    tenantId: req.tenantId ?? null,
    userId: req.user?.sub ?? null,
    action: 'CAPABILITY_VIEWED',
    requestId: req.id,
    metadata: {
      active: result.active,
      pendingWorker: result.pendingWorker,
      pendingPlatform: result.pendingPlatform,
      pendingProvider: result.pendingProvider,
    },
  });

  res.status(200).json(result);
});

export const getRegisteredQueueJobs = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json({
    jobs: QueueRegistryService.listRegisteredJobs(),
  });
});