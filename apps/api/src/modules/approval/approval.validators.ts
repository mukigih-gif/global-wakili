// apps/api/src/modules/approval/approval.validators.ts

import { z } from 'zod';
import {
  APPROVAL_ACTIONS,
  APPROVAL_LEVELS,
  APPROVAL_MODULES,
  APPROVAL_OPEN_STATUSES,
  APPROVAL_PRIORITIES,
  APPROVAL_STATUSES,
} from './approval.types';

const safeJsonObject = z.record(z.string(), z.unknown());
const isoDateTime = z.string().datetime();

function nullableDateField() {
  return z
    .preprocess((value) => {
      if (value === undefined || value === null || value === '') return null;
      if (value instanceof Date) return value;
      return new Date(String(value));
    }, z.date().nullable())
    .optional();
}

export const approvalActionSchema = z.enum(APPROVAL_ACTIONS);
export const approvalLevelSchema = z.enum(APPROVAL_LEVELS);
export const approvalModuleSchema = z.enum(APPROVAL_MODULES);
export const approvalPrioritySchema = z.enum(APPROVAL_PRIORITIES);
export const approvalStatusSchema = z.enum(APPROVAL_STATUSES);
export const approvalOpenStatusSchema = z.enum(APPROVAL_OPEN_STATUSES);

export const approvalCreateSchema = z
  .object({
    module: approvalModuleSchema,
    approvalKey: z.string().trim().max(150).nullable().optional(),
    entityType: z.string().trim().min(1).max(100),
    entityId: z.string().trim().min(1).max(150),
    currentState: z.string().trim().min(1).max(100),
    nextState: z.string().trim().min(1).max(100),
    action: approvalActionSchema.optional(),
    level: approvalLevelSchema.optional(),
    priority: approvalPrioritySchema.optional(),
    requestedById: z.string().trim().max(150).nullable().optional(),
    assignedApproverId: z.string().trim().max(150).nullable().optional(),
    comment: z.string().trim().max(5000).nullable().optional(),
    decisionReason: z.string().trim().max(5000).nullable().optional(),
    beforeSnapshot: safeJsonObject.nullable().optional(),
    afterSnapshot: safeJsonObject.nullable().optional(),
    metadata: safeJsonObject.nullable().optional(),
    deadlineAt: nullableDateField(),
  })
  .strict();

export const approvalIdParamSchema = z
  .object({
    approvalId: z.string().trim().min(1),
  })
  .strict();

export const approvalDecisionSchema = z
  .object({
    action: z.enum(['APPROVE', 'REJECT', 'REQUEST_CHANGES', 'CANCEL']),
    comment: z.string().trim().max(5000).nullable().optional(),
    rejectionReason: z.string().trim().max(5000).nullable().optional(),
    decisionReason: z.string().trim().max(5000).nullable().optional(),
    afterSnapshot: safeJsonObject.nullable().optional(),
    metadata: safeJsonObject.nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.action === 'REJECT' && !value.rejectionReason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'rejectionReason is required when action is REJECT',
        path: ['rejectionReason'],
      });
    }

    if (
      (value.action === 'REQUEST_CHANGES' || value.action === 'CANCEL') &&
      !value.decisionReason?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'decisionReason is required for REQUEST_CHANGES or CANCEL',
        path: ['decisionReason'],
      });
    }
  });

export const approvalEscalationSchema = z
  .object({
    escalatedToUserId: z.string().trim().min(1).max(150),
    escalationReason: z.string().trim().min(1).max(5000),
    level: approvalLevelSchema.optional(),
    priority: approvalPrioritySchema.optional(),
    metadata: safeJsonObject.nullable().optional(),
  })
  .strict();

export const approvalDelegationSchema = z
  .object({
    delegatedToUserId: z.string().trim().min(1).max(150),
    comment: z.string().trim().max(5000).nullable().optional(),
    metadata: safeJsonObject.nullable().optional(),
  })
  .strict();

export const approvalReassignmentSchema = z
  .object({
    reassignedToUserId: z.string().trim().min(1).max(150),
    comment: z.string().trim().max(5000).nullable().optional(),
    metadata: safeJsonObject.nullable().optional(),
  })
  .strict();

export const approvalSearchQuerySchema = z
  .object({
    module: approvalModuleSchema.optional(),
    status: approvalStatusSchema.optional(),
    level: approvalLevelSchema.optional(),
    priority: approvalPrioritySchema.optional(),
    approvalKey: z.string().trim().max(150).optional(),
    version: z.coerce.number().int().min(1).optional(),
    entityType: z.string().trim().max(100).optional(),
    entityId: z.string().trim().max(150).optional(),
    requestedById: z.string().trim().max(150).optional(),
    assignedApproverId: z.string().trim().max(150).optional(),
    approvedById: z.string().trim().max(150).optional(),
    createdFrom: isoDateTime.optional(),
    createdTo: isoDateTime.optional(),
    deadlineFrom: isoDateTime.optional(),
    deadlineTo: isoDateTime.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.createdFrom &&
      value.createdTo &&
      new Date(value.createdTo).getTime() < new Date(value.createdFrom).getTime()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'createdTo must be after or equal to createdFrom',
        path: ['createdTo'],
      });
    }

    if (
      value.deadlineFrom &&
      value.deadlineTo &&
      new Date(value.deadlineTo).getTime() < new Date(value.deadlineFrom).getTime()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'deadlineTo must be after or equal to deadlineFrom',
        path: ['deadlineTo'],
      });
    }
  });

export type ApprovalCreateDto = z.infer<typeof approvalCreateSchema>;
export type ApprovalDecisionDto = z.infer<typeof approvalDecisionSchema>;
export type ApprovalEscalationDto = z.infer<typeof approvalEscalationSchema>;
export type ApprovalDelegationDto = z.infer<typeof approvalDelegationSchema>;
export type ApprovalReassignmentDto = z.infer<typeof approvalReassignmentSchema>;