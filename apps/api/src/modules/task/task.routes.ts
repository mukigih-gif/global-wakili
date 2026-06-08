// apps/api/src/modules/task/task.routes.ts

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requirePermissions } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { PERMISSIONS } from '../../config/permissions';
import {
  addTaskComment,
  cancelTask,
  completeTask,
  createTask,
  getTask,
  getTaskCapabilities,
  getTaskDashboard,
  listTaskComments,
  requestTaskCalendarLink,
  requestTaskReminder,
  searchTasks,
  updateTask,
  updateTaskStatus,
} from './task.controller';
import {
  taskCalendarLinkSchema,
  taskCommentCreateSchema,
  taskCreateSchema,
  taskReminderRequestSchema,
  taskSearchQuerySchema,
  taskStatusUpdateSchema,
  taskUpdateSchema,
} from './task.validators';

const router = Router();

const dashboardQuerySchema = z.object({
  matterId: z.string().trim().min(1).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const commentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const cancelTaskSchema = z.object({
  reason: z.string().trim().max(1000).nullable().optional(),
});

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'task',
    status: 'mounted',
    service: 'global-wakili-api',
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

router.post(
  '/',
  requirePermissions(PERMISSIONS.task.createTask),
  validate({ body: taskCreateSchema }),
  createTask,
);

router.get(
  '/search',
  requirePermissions(PERMISSIONS.task.searchTask),
  validate({ query: taskSearchQuerySchema }),
  searchTasks,
);

router.get(
  '/dashboard',
  requirePermissions(PERMISSIONS.task.viewDashboard),
  validate({ query: dashboardQuerySchema }),
  getTaskDashboard,
);

router.get(
  '/capabilities',
  requirePermissions(PERMISSIONS.task.viewDashboard),
  getTaskCapabilities,
);

router.get(
  '/:taskId',
  requirePermissions(PERMISSIONS.task.viewTask),
  getTask,
);

router.patch(
  '/:taskId',
  requirePermissions(PERMISSIONS.task.updateTask),
  validate({ body: taskUpdateSchema }),
  updateTask,
);

router.post(
  '/:taskId/status',
  requirePermissions(PERMISSIONS.task.updateTask),
  validate({ body: taskStatusUpdateSchema }),
  updateTaskStatus,
);

router.post(
  '/:taskId/complete',
  requirePermissions(PERMISSIONS.task.completeTask),
  completeTask,
);

router.delete(
  '/:taskId',
  requirePermissions(PERMISSIONS.task.cancelTask),
  validate({ body: cancelTaskSchema }),
  cancelTask,
);

router.post(
  '/:taskId/comments',
  requirePermissions(PERMISSIONS.task.commentTask),
  validate({ body: taskCommentCreateSchema }),
  addTaskComment,
);

router.get(
  '/:taskId/comments',
  requirePermissions(PERMISSIONS.task.viewTask),
  validate({ query: commentsQuerySchema }),
  listTaskComments,
);

router.post(
  '/:taskId/reminders',
  requirePermissions(PERMISSIONS.task.manageReminders),
  validate({ body: taskReminderRequestSchema }),
  requestTaskReminder,
);

router.post(
  '/:taskId/calendar-link',
  requirePermissions(PERMISSIONS.task.linkCalendar),
  validate({ body: taskCalendarLinkSchema }),
  requestTaskCalendarLink,
);

// ── Labels (stored in PlatformGlobalSetting per tenant) ──────────────────────

async function getTaskLabels(db: any, tenantId: string, taskId: string): Promise<string[]> {
  const setting = await db.platformGlobalSetting.findFirst({
    where: { key: `labels:assignments:task`, targetTenantId: tenantId },
    select: { currentValue: true },
  });
  const assignments = (setting?.currentValue as Record<string, string[]>) ?? {};
  return assignments[taskId] ?? [];
}

async function setTaskLabels(db: any, tenantId: string, taskId: string, labels: string[]): Promise<void> {
  const existing = await db.platformGlobalSetting.findFirst({
    where: { key: `labels:assignments:task`, targetTenantId: tenantId },
    select: { id: true, currentValue: true },
  });
  const assignments = (existing?.currentValue as Record<string, string[]>) ?? {};
  assignments[taskId] = labels;
  if (existing?.id) {
    await db.platformGlobalSetting.update({
      where: { id: existing.id },
      data: { currentValue: assignments, updatedAt: new Date() },
    });
  } else {
    await db.platformGlobalSetting.create({
      data: {
        key: `labels:assignments:task`,
        name: 'Task Label Assignments',
        scope: 'TENANT',
        targetTenantId: tenantId,
        currentValue: assignments,
      },
    });
  }
}

router.get(
  '/:taskId/labels',
  requirePermissions(PERMISSIONS.task.viewTask),
  async (req: Request, res: Response) => {
    try {
      const labels = await getTaskLabels(req.db, req.tenantId!, req.params.taskId);
      res.json({ success: true, data: labels });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  }
);

router.patch(
  '/:taskId/labels',
  requirePermissions(PERMISSIONS.task.updateTask),
  async (req: Request, res: Response) => {
    try {
      const labels: string[] = Array.isArray(req.body.labels) ? req.body.labels : [];
      await setTaskLabels(req.db, req.tenantId!, req.params.taskId, labels);
      res.json({ success: true, data: labels });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  }
);

export default router;