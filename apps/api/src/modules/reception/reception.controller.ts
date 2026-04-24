// apps/api/src/modules/reception/reception.controller.ts

import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { ReceptionLogService } from './ReceptionLogService';
import { ReceptionDashboardService } from './ReceptionDashboardService';
import { ReceptionCapabilityService } from './ReceptionCapabilityService';
import { ReceptionHandoffBridgeService } from './ReceptionHandoffBridgeService';
import { ReceptionAuditService } from './ReceptionAuditService';

export const createVisitorLog = asyncHandler(async (req: Request, res: Response) => {
  const log = await ReceptionLogService.createLog(req.db, {
    tenantId: req.tenantId!,
    type: 'VISITOR',
    subject: req.body.subject,
    description: req.body.description ?? null,
    timestamp: req.body.timestamp ?? null,
    receivedById: req.user!.sub,
    matterId: req.body.matterId ?? null,
    isUrgent: req.body.isUrgent === true,
    personMeeting: req.body.personMeeting ?? null,
    durationMinutes: req.body.durationMinutes ?? null,
    isPlanned: req.body.isPlanned !== false,
  });

  await ReceptionAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    logId: log.id,
    matterId: log.matterId ?? null,
    action: 'VISITOR_LOGGED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
  });

  res.status(201).json(log);
});

export const createCallLog = asyncHandler(async (req: Request, res: Response) => {
  const log = await ReceptionLogService.createLog(req.db, {
    tenantId: req.tenantId!,
    type: 'CALL_LOG',
    subject: req.body.subject,
    description: req.body.description ?? null,
    timestamp: req.body.timestamp ?? null,
    receivedById: req.user!.sub,
    matterId: req.body.matterId ?? null,
    isUrgent: req.body.isUrgent === true,
    personMeeting: req.body.personMeeting ?? null,
    durationMinutes: req.body.durationMinutes ?? null,
    isPlanned: req.body.isPlanned !== false,
  });

  await ReceptionAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    logId: log.id,
    matterId: log.matterId ?? null,
    action: 'CALL_LOGGED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
  });

  res.status(201).json(log);
});

export const createFileReceipt = asyncHandler(async (req: Request, res: Response) => {
  const log = await ReceptionLogService.createLog(req.db, {
    tenantId: req.tenantId!,
    type: 'VISITOR',
    subject: req.body.subject,
    description: req.body.description ?? null,
    timestamp: req.body.timestamp ?? null,
    receivedById: req.user!.sub,
    matterId: req.body.matterId ?? null,
    isUrgent: req.body.isUrgent === true,
    deliveryMethod: req.body.deliveryMethod ?? null,
    trackingNumber: req.body.trackingNumber ?? null,
    digitalCopyUrl: req.body.digitalCopyUrl ?? null,
    personMeeting: req.body.personMeeting ?? null,
    isPlanned: req.body.isPlanned !== false,
  });

  await ReceptionAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    logId: log.id,
    matterId: log.matterId ?? null,
    action: 'FILE_RECEIPT_LOGGED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    metadata: {
      deliveryMethod: log.deliveryMethod ?? null,
      trackingNumber: log.trackingNumber ?? null,
      digitalCopyUrlPresent: Boolean(log.digitalCopyUrl),
    },
  });

  res.status(201).json(log);
});

export const getReceptionLog = asyncHandler(async (req: Request, res: Response) => {
  const log = await ReceptionLogService.getLog(req.db, {
    tenantId: req.tenantId!,
    logId: req.params.logId,
  });

  await ReceptionAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    logId: log.id,
    matterId: log.matterId ?? null,
    action: 'VIEWED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
  });

  res.status(200).json(log);
});

export const searchReceptionLogs = asyncHandler(async (req: Request, res: Response) => {
  const result = await ReceptionLogService.searchLogs(req.db, {
    tenantId: req.tenantId!,
    query: req.query.query ? String(req.query.query) : null,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    filters: {
      type: req.query.type ? (String(req.query.type) as any) : null,
      matterId: req.query.matterId ? String(req.query.matterId) : null,
      receivedById: req.query.receivedById ? String(req.query.receivedById) : null,
      isUrgent:
        req.query.isUrgent !== undefined ? String(req.query.isUrgent) === 'true' : null,
      isPlanned:
        req.query.isPlanned !== undefined ? String(req.query.isPlanned) === 'true' : null,
      timestampFrom: req.query.timestampFrom ? String(req.query.timestampFrom) : null,
      timestampTo: req.query.timestampTo ? String(req.query.timestampTo) : null,
    },
  });

  await ReceptionAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    action: 'SEARCHED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    metadata: {
      query: req.query.query ?? null,
      resultCount: result.meta.total,
    },
  });

  res.status(200).json(result);
});

export const getReceptionDashboard = asyncHandler(async (req: Request, res: Response) => {
  const dashboard = await ReceptionDashboardService.getDashboard(req.db, {
    tenantId: req.tenantId!,
    matterId: req.query.matterId ? String(req.query.matterId) : null,
    from: req.query.from ? String(req.query.from) : null,
    to: req.query.to ? String(req.query.to) : null,
  });

  await ReceptionAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    action: 'DASHBOARD_VIEWED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
  });

  res.status(200).json(dashboard);
});

export const getReceptionCapabilities = asyncHandler(async (req: Request, res: Response) => {
  const result = ReceptionCapabilityService.getSummary();

  await ReceptionAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    action: 'CAPABILITY_VIEWED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    metadata: {
      active: result.active,
      pendingSchema: result.pendingSchema,
      pendingCrossModule: result.pendingCrossModule,
    },
  });

  res.status(200).json(result);
});

export const requestReceptionHandoff = asyncHandler(async (req: Request, res: Response) => {
  await ReceptionHandoffBridgeService.requestHandoff(req.db, {
    tenantId: req.tenantId!,
    logId: req.params.logId,
    actorId: req.user!.sub,
    type: req.params.type as any,
    reason: req.body.reason ?? null,
    notes: req.body.notes ?? null,
    requestId: req.id,
  });

  res.status(202).json({ success: true });
});