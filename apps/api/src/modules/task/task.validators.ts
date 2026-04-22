// apps/api/src/modules/task/task.validators.ts

import { z } from 'zod';

const optionalDate = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value instanceof Date) return value;
  return new Date(String(value));
}, z.date());

export const taskStatusSchema = z.enum([
  'TODO',
  'IN_PROGRESS',
  'BLOCKED',
  'DONE',
  'CANCELLED',
]);

export const taskPrioritySchema = z.enum([
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT',
]);

export const taskCreateSchema = z.object({
  matterId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).nullable().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assignedTo: z.string().trim().min(1).nullable().optional(),
  dueDate: optionalDate.nullable().optional(),
});

export const taskUpdateSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assignedTo: z.string().trim().min(1).nullable().optional(),
  dueDate: optionalDate.nullable().optional(),
});

export const taskStatusUpdateSchema = z.object({
  status: taskStatusSchema,
  reason: z.string().trim().max(1000).nullable().optional(),
});

export const taskSearchQuerySchema = z.object({
  query: z.string().trim().max(500).optional(),
  matterId: z.string().trim().min(1).optional(),
  clientId: z.string().trim().min(1).optional(),
  assignedTo: z.string().trim().min(1).optional(),
  createdById: z.string().trim().min(1).optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  dueFrom: z.string().datetime().optional(),
  dueTo: z.string().datetime().optional(),
  overdueOnly: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const taskIdParamSchema = z.object({
  taskId: z.string().trim().min(1),
});

export const taskCommentCreateSchema = z.object({
  message: z.string().trim().min(1).max(5000),
});

export const taskReminderRequestSchema = z.object({
  remindAt: z.string().datetime(),
  channel: z.enum(['IN_APP', 'EMAIL', 'SMS']).optional(),
  message: z.string().trim().max(1000).nullable().optional(),
});

export const taskCalendarLinkSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  description: z.string().trim().max(2000).nullable().optional(),
});

export type TaskCreateDto = z.infer<typeof taskCreateSchema>;
export type TaskUpdateDto = z.infer<typeof taskUpdateSchema>;
export type TaskSearchQueryDto = z.infer<typeof taskSearchQuerySchema>;
export type TaskCommentCreateDto = z.infer<typeof taskCommentCreateSchema>;