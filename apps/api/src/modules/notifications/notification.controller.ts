// apps/api/src/modules/notifications/notification.controller.ts

import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { NotificationDeliveryService } from './NotificationDeliveryService';
import { NotificationQueueService } from './NotificationQueueService';
import { NotificationDashboardService } from './NotificationDashboardService';
import { NotificationReportService } from './NotificationReportService';
import { NotificationCapabilityService } from './NotificationCapabilityService';
import { NotificationAuditService } from './NotificationAuditService';

export const sendNotification = asyncHandler(async (req: Request, res: Response) => {
  const result = await NotificationDeliveryService.sendNow(req.db, {
    tenantId: req.tenantId!,
    recipients: req.body.recipients,
    channels: req.body.channels,
    category: req.body.category ?? 'system_alert',
    priority: req.body.priority ?? 'normal',
    template: req.body.template,
    entityType: req.body.entityType ?? null,
    entityId: req.body.entityId ?? null,
    debounceKey: req.body.debounceKey ?? null,
    metadata: req.body.metadata ?? {},
    senderEmail: req.body.senderEmail ?? null,
    smsSenderId: req.body.smsSenderId ?? null,
  });

  await NotificationAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    action: 'SEND_REQUESTED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    metadata: {
      resultCount: result.results.length,
      deliveryOrder: result.deliveryOrder,
    },
  });

  res.status(200).json(result);
});

export const queueNotification = asyncHandler(async (req: Request, res: Response) => {
  const result = await NotificationQueueService.enqueue({
    tenantId: req.tenantId!,
    recipients: req.body.recipients,
    channels: req.body.channels,
    category: req.body.category ?? 'system_alert',
    priority: req.body.priority ?? 'normal',
    template: req.body.template,
    entityType: req.body.entityType ?? null,
    entityId: req.body.entityId ?? null,
    debounceKey: req.body.debounceKey ?? null,
    metadata: req.body.metadata ?? {},
    senderEmail: req.body.senderEmail ?? null,
    smsSenderId: req.body.smsSenderId ?? null,
  });

  await NotificationAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    action: 'QUEUE_REQUESTED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    metadata: result,
  });

  res.status(202).json(result);
});

export const searchNotifications = asyncHandler(async (req: Request, res: Response) => {
  const result = await NotificationReportService.search(req.db, {
    tenantId: req.tenantId!,
    query: req.query.query ? String(req.query.query) : null,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    filters: {
      userId: req.query.userId ? String(req.query.userId) : null,
      channel: req.query.channel ? (String(req.query.channel) as any) : null,
      status: req.query.status ? (String(req.query.status) as any) : null,
      category: req.query.category ? String(req.query.category) : null,
      priority: req.query.priority ? String(req.query.priority) : null,
      entityType: req.query.entityType ? String(req.query.entityType) : null,
      entityId: req.query.entityId ? String(req.query.entityId) : null,
      createdFrom: req.query.createdFrom ? String(req.query.createdFrom) : null,
      createdTo: req.query.createdTo ? String(req.query.createdTo) : null,
    },
  });

  await NotificationAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    action: 'SEARCHED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    metadata: {
      resultCount: result.meta.total,
    },
  });

  res.status(200).json(result);
});

export const getNotificationDashboard = asyncHandler(async (req: Request, res: Response) => {
  const dashboard = await NotificationDashboardService.getDashboard(req.db, {
    tenantId: req.tenantId!,
    from: req.query.from ? String(req.query.from) : null,
    to: req.query.to ? String(req.query.to) : null,
  });

  await NotificationAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    action: 'DASHBOARD_VIEWED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
  });

  res.status(200).json(dashboard);
});

export const getNotificationReportSummary = asyncHandler(async (req: Request, res: Response) => {
  const report = await NotificationReportService.getSummary(req.db, {
    tenantId: req.tenantId!,
    from: req.query.from ? String(req.query.from) : null,
    to: req.query.to ? String(req.query.to) : null,
  });

  await NotificationAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    action: 'REPORT_VIEWED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
  });

  res.status(200).json(report);
});

export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  const result = await NotificationDeliveryService.markRead(req.db, {
    tenantId: req.tenantId!,
    notificationId: req.params.notificationId,
    userId: req.user?.sub ?? null,
  });

  await NotificationAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    notificationId: req.params.notificationId,
    action: 'READ',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
  });

  res.status(200).json(result);
});

export const updateProviderWebhookStatus = asyncHandler(async (req: Request, res: Response) => {
  const result = await NotificationDeliveryService.updateProviderStatus(req.db, {
    providerMessageId: req.body.providerMessageId,
    provider: req.body.provider ?? null,
    status: req.body.status,
    metadata: req.body.metadata ?? {},
  });

  await NotificationAuditService.logAction(req.db, {
    tenantId: result.tenantId,
    userId: req.user?.sub ?? null,
    notificationId: result.id,
    action: 'WEBHOOK_STATUS_UPDATED',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    metadata: {
      status: result.status,
      provider: result.provider ?? null,
    },
  });

  res.status(200).json(result);
});

export const getNotificationCapabilities = asyncHandler(async (req: Request, res: Response) => {
  const result = NotificationCapabilityService.getSummary();

  await NotificationAuditService.logAction(req.db, {
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
      pendingProvider: result.pendingProvider,
    },
  });

  res.status(200).json(result);
});