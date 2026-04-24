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

export default router;