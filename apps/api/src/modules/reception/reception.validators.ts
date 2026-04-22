// apps/api/src/modules/reception/reception.validators.ts

import { z } from 'zod';

const optionalDate = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value instanceof Date) return value;
  return new Date(String(value));
}, z.date());

export const receptionLogTypeSchema = z.enum(['VISITOR', 'CALL_LOG']);

export const visitorLogSchema = z.object({
  subject: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).nullable().optional(),
  timestamp: optionalDate.nullable().optional(),
  matterId: z.string().trim().min(1).nullable().optional(),
  isUrgent: z.boolean().optional(),
  personMeeting: z.string().trim().max(255).nullable().optional(),
  durationMinutes: z.coerce.number().int().min(0).max(1440).nullable().optional(),
  isPlanned: z.boolean().optional(),
});

export const callLogSchema = z.object({
  subject: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).nullable().optional(),
  timestamp: optionalDate.nullable().optional(),
  matterId: z.string().trim().min(1).nullable().optional(),
  isUrgent: z.boolean().optional(),
  personMeeting: z.string().trim().max(255).nullable().optional(),
  durationMinutes: z.coerce.number().int().min(0).max(1440).nullable().optional(),
  isPlanned: z.boolean().optional(),
});

export const fileReceiptSchema = z.object({
  subject: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).nullable().optional(),
  timestamp: optionalDate.nullable().optional(),
  matterId: z.string().trim().min(1).nullable().optional(),
  isUrgent: z.boolean().optional(),
  deliveryMethod: z.string().trim().max(100).nullable().optional(),
  trackingNumber: z.string().trim().max(150).nullable().optional(),
  digitalCopyUrl: z.string().trim().max(1000).nullable().optional(),
  personMeeting: z.string().trim().max(255).nullable().optional(),
  isPlanned: z.boolean().optional(),
});

export const receptionSearchQuerySchema = z.object({
  query: z.string().trim().max(500).optional(),
  type: receptionLogTypeSchema.optional(),
  matterId: z.string().trim().min(1).optional(),
  receivedById: z.string().trim().min(1).optional(),
  isUrgent: z.enum(['true', 'false']).optional(),
  isPlanned: z.enum(['true', 'false']).optional(),
  timestampFrom: z.string().datetime().optional(),
  timestampTo: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const receptionDashboardQuerySchema = z.object({
  matterId: z.string().trim().min(1).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const receptionIdParamSchema = z.object({
  logId: z.string().trim().min(1),
});

export const receptionHandoffSchema = z.object({
  reason: z.string().trim().max(1000).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export type VisitorLogDto = z.infer<typeof visitorLogSchema>;
export type CallLogDto = z.infer<typeof callLogSchema>;
export type FileReceiptDto = z.infer<typeof fileReceiptSchema>;
export type ReceptionSearchQueryDto = z.infer<typeof receptionSearchQuerySchema>;