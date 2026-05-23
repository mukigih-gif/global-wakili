// apps/api/src/modules/task/task.controller.ts

import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { TaskService } from './TaskService';
import { TaskCommentService } from './TaskCommentService';
import { TaskDashboardService } from './TaskDashboardService';
import { TaskCapabilityService } from './TaskCapabilityService';
import { TaskReminderBridgeService } from './TaskReminderBridgeService';
import { TaskCalendarBridgeService } from './TaskCalendarBridgeService';
import { TaskAuditService } from './TaskAuditService';
import type { LegalTaskPriority, LegalTaskStatus } from './task.types';
import {
  getRequestId,
  getRequestIp,
  getRequestUserAgent,
  getRequestUserId,
  requireRequestUserId,
  requireTenantId,
} from '../../utils/request-identity';

function getTenantId(req: Request): string {
  return requireTenantId(req);
}

function getUserId(req: Request): string {
  return requireRequestUserId(req);
}

function getOptionalUserId(req: Request): string | null {
  return getRequestUserId(req);
}

function requestMeta(req: Request) {
  return {
    requestId: getRequestId(req),
    ipAddress: getRequestIp(req),
    userAgent: getRequestUserAgent(req),
  };
}

function parseTaskStatus(value: unknown): LegalTaskStatus | null {
  if (typeof value !== 'string') {
    return null;
  }

  switch (value.trim().toUpperCase()) {
    case 'TODO':
      return 'TODO';
    case 'IN_PROGRESS':
      return 'IN_PROGRESS';
    case 'BLOCKED':
      return 'BLOCKED';
    case 'DONE':
      return 'DONE';
    case 'CANCELLED':
      return 'CANCELLED';
    default:
      return null;
  }
}

function parseTaskPriority(value: unknown): LegalTaskPriority | null {
  if (typeof value !== 'string') {
    return null;
  }

  switch (value.trim().toUpperCase()) {
    case 'LOW':
      return 'LOW';
    case 'NORMAL':
      return 'NORMAL';
    case 'HIGH':
      return 'HIGH';
    case 'URGENT':
      return 'URGENT';
    default:
      return null;
  }
}

export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await TaskService.createTask(req.db, {
    tenantId: getTenantId(req),
    matterId: req.body.matterId,
    title: req.body.title,
    description: req.body.description ?? null,
    status: req.body.status ?? 'TODO',
    priority: req.body.priority ?? 'NORMAL',
    assignedTo: req.body.assignedTo ?? null,
    dueDate: req.body.dueDate ?? null,
    createdById: getUserId(req),
  });

  await TaskAuditService.logAction(req.db, {
    tenantId: getTenantId(req),
    userId: getOptionalUserId(req),
    taskId: task.id,
    matterId: task.matterId,
    action: 'CREATED',
    ...requestMeta(req),
    metadata: {
      assignedTo: task.assignedTo ?? null,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ?? null,
    },
  });

  res.status(201).json(task);
});

export const getTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await TaskService.getTask(req.db, {
    tenantId: getTenantId(req),
    taskId: req.params.taskId,
    userId: getUserId(req),
  });

  await TaskAuditService.logAction(req.db, {
    tenantId: getTenantId(req),
    userId: getOptionalUserId(req),
    taskId: task.id,
    matterId: task.matterId,
    action: 'VIEWED',
    ...requestMeta(req),
  });

  res.status(200).json(task);
});

export const searchTasks = asyncHandler(async (req: Request, res: Response) => {
  const result = await TaskService.searchTasks(req.db, {
    tenantId: getTenantId(req),
    userId: getUserId(req),
    query: req.query.query ? String(req.query.query) : null,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    filters: {
      matterId: req.query.matterId ? String(req.query.matterId) : null,
      clientId: req.query.clientId ? String(req.query.clientId) : null,
      assignedTo: req.query.assignedTo ? String(req.query.assignedTo) : null,
      createdById: req.query.createdById ? String(req.query.createdById) : null,
      status: parseTaskStatus(req.query.status),
      priority: parseTaskPriority(req.query.priority),
      dueFrom: req.query.dueFrom ? String(req.query.dueFrom) : null,
      dueTo: req.query.dueTo ? String(req.query.dueTo) : null,
      overdueOnly:
        req.query.overdueOnly !== undefined
          ? String(req.query.overdueOnly) === 'true'
          : null,
    },
  });

  await TaskAuditService.logAction(req.db, {
    tenantId: getTenantId(req),
    userId: getOptionalUserId(req),
    action: 'SEARCHED',
    ...requestMeta(req),
    metadata: {
      query: req.query.query ?? null,
      resultCount: result.meta.total,
    },
  });

  res.status(200).json(result);
});

export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await TaskService.updateTask(req.db, {
    tenantId: getTenantId(req),
    taskId: req.params.taskId,
    actorId: getUserId(req),
    title: req.body.title,
    description: req.body.description,
    status: req.body.status,
    priority: req.body.priority,
    assignedTo: req.body.assignedTo,
    dueDate: req.body.dueDate,
  });

  await TaskAuditService.logAction(req.db, {
    tenantId: getTenantId(req),
    userId: getOptionalUserId(req),
    taskId: task.id,
    matterId: task.matterId,
    action: 'UPDATED',
    ...requestMeta(req),
    metadata: {
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignedTo ?? null,
      dueDate: task.dueDate ?? null,
    },
  });

  res.status(200).json(task);
});

export const updateTaskStatus = asyncHandler(async (req: Request, res: Response) => {
  const task = await TaskService.setStatus(req.db, {
    tenantId: getTenantId(req),
    taskId: req.params.taskId,
    actorId: getUserId(req),
    status: req.body.status,
  });

  await TaskAuditService.logAction(req.db, {
    tenantId: getTenantId(req),
    userId: getOptionalUserId(req),
    taskId: task.id,
    matterId: task.matterId,
    action: task.status === 'DONE' ? 'COMPLETED' : 'STATUS_CHANGED',
    ...requestMeta(req),
    metadata: {
      status: task.status,
      reason: req.body.reason ?? null,
    },
  });

  res.status(200).json(task);
});

export const completeTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await TaskService.completeTask(req.db, {
    tenantId: getTenantId(req),
    taskId: req.params.taskId,
    actorId: getUserId(req),
  });

  await TaskAuditService.logAction(req.db, {
    tenantId: getTenantId(req),
    userId: getOptionalUserId(req),
    taskId: task.id,
    matterId: task.matterId,
    action: 'COMPLETED',
    ...requestMeta(req),
  });

  res.status(200).json(task);
});

export const cancelTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await TaskService.cancelTask(req.db, {
    tenantId: getTenantId(req),
    taskId: req.params.taskId,
    actorId: getUserId(req),
  });

  await TaskAuditService.logAction(req.db, {
    tenantId: getTenantId(req),
    userId: getOptionalUserId(req),
    taskId: task.id,
    matterId: task.matterId,
    action: 'CANCELLED',
    ...requestMeta(req),
    metadata: {
      reason: req.body?.reason ?? null,
    },
  });

  res.status(200).json(task);
});

export const addTaskComment = asyncHandler(async (req: Request, res: Response) => {
  const result = await TaskCommentService.addComment(req.db, {
    tenantId: getTenantId(req),
    taskId: req.params.taskId,
    userId: getUserId(req),
    message: req.body.message,
  });

  await TaskAuditService.logAction(req.db, {
    tenantId: getTenantId(req),
    userId: getOptionalUserId(req),
    taskId: req.params.taskId,
    matterId: result.task.matterId,
    action: 'COMMENT_ADDED',
    ...requestMeta(req),
  });

  res.status(201).json(result.comment);
});

export const listTaskComments = asyncHandler(async (req: Request, res: Response) => {
  const result = await TaskCommentService.listComments(req.db, {
    tenantId: getTenantId(req),
    taskId: req.params.taskId,
    userId: getUserId(req),
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });

  await TaskAuditService.logAction(req.db, {
    tenantId: getTenantId(req),
    userId: getOptionalUserId(req),
    taskId: req.params.taskId,
    action: 'COMMENTS_VIEWED',
    ...requestMeta(req),
    metadata: {
      resultCount: result.meta.total,
    },
  });

  res.status(200).json(result);
});

export const getTaskDashboard = asyncHandler(async (req: Request, res: Response) => {
  const dashboard = await TaskDashboardService.getDashboard(req.db, {
    tenantId: getTenantId(req),
    userId: getUserId(req),
    matterId: req.query.matterId ? String(req.query.matterId) : null,
    from: req.query.from ? String(req.query.from) : null,
    to: req.query.to ? String(req.query.to) : null,
  });

  await TaskAuditService.logAction(req.db, {
    tenantId: getTenantId(req),
    userId: getOptionalUserId(req),
    action: 'DASHBOARD_VIEWED',
    ...requestMeta(req),
  });

  res.status(200).json(dashboard);
});

export const getTaskCapabilities = asyncHandler(async (req: Request, res: Response) => {
  const result = TaskCapabilityService.getSummary();

  await TaskAuditService.logAction(req.db, {
    tenantId: getTenantId(req),
    userId: getOptionalUserId(req),
    action: 'CAPABILITY_VIEWED',
    ...requestMeta(req),
    metadata: {
      active: result.active,
      pendingSchema: result.pendingSchema,
      pendingCrossModule: result.pendingCrossModule,
    },
  });

  res.status(200).json(result);
});

export const requestTaskReminder = asyncHandler(async (req: Request, res: Response) => {
  await TaskReminderBridgeService.requestReminder(req.db, {
    tenantId: getTenantId(req),
    taskId: req.params.taskId,
    actorId: getUserId(req),
    remindAt: req.body.remindAt,
    channel: req.body.channel ?? 'IN_APP',
    message: req.body.message ?? null,
    requestId: req.id,
  });

  res.status(202).json({
    success: true,
  });
});

export const requestTaskCalendarLink = asyncHandler(async (req: Request, res: Response) => {
  await TaskCalendarBridgeService.requestCalendarLink(req.db, {
    tenantId: getTenantId(req),
    taskId: req.params.taskId,
    actorId: getUserId(req),
    title: req.body.title ?? null,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    description: req.body.description ?? null,
    requestId: req.id,
  });

  res.status(202).json({
    success: true,
  });
});

