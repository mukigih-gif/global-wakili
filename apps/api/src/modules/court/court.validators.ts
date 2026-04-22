// apps/api/src/modules/court/court.validators.ts

import { z } from 'zod';

const optionalDate = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value instanceof Date) return value;
  return new Date(String(value));
}, z.date());

export const courtHearingTypeSchema = z.enum([
  'MENTION',
  'DIRECTIONS',
  'HEARING',
  'JUDGMENT',
  'RULING',
  'TAXATION',
  'APPLICATION',
  'OTHER',
]);

export const courtHearingStatusSchema = z.enum([
  'SCHEDULED',
  'ADJOURNED',
  'COMPLETED',
  'CANCELLED',
  'MISSED',
]);

export const courtHearingCreateSchema = z.object({
  matterId: z.string().trim().min(1),
  calendarEventId: z.string().trim().min(1).nullable().optional(),
  title: z.string().trim().min(1).max(255),
  caseNumber: z.string().trim().max(150).nullable().optional(),
  courtName: z.string().trim().max(255).nullable().optional(),
  courtStation: z.string().trim().max(255).nullable().optional(),
  courtroom: z.string().trim().max(150).nullable().optional(),
  judge: z.string().trim().max(255).nullable().optional(),
  hearingType: courtHearingTypeSchema.optional(),
  status: courtHearingStatusSchema.optional(),
  hearingDate: optionalDate,
  startTime: optionalDate.nullable().optional(),
  endTime: optionalDate.nullable().optional(),
  outcome: z.string().trim().max(5000).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const courtHearingUpdateSchema = z.object({
  calendarEventId: z.string().trim().min(1).nullable().optional(),
  title: z.string().trim().min(1).max(255).optional(),
  caseNumber: z.string().trim().max(150).nullable().optional(),
  courtName: z.string().trim().max(255).nullable().optional(),
  courtStation: z.string().trim().max(255).nullable().optional(),
  courtroom: z.string().trim().max(150).nullable().optional(),
  judge: z.string().trim().max(255).nullable().optional(),
  hearingType: courtHearingTypeSchema.optional(),
  status: courtHearingStatusSchema.optional(),
  hearingDate: optionalDate.optional(),
  startTime: optionalDate.nullable().optional(),
  endTime: optionalDate.nullable().optional(),
  outcome: z.string().trim().max(5000).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const courtHearingStatusUpdateSchema = z.object({
  status: courtHearingStatusSchema,
  outcome: z.string().trim().max(5000).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  reason: z.string().trim().max(1000).nullable().optional(),
});

export const courtOutcomeSchema = z.object({
  outcome: z.string().trim().min(1).max(5000),
  notes: z.string().trim().max(5000).nullable().optional(),
});

export const courtSearchQuerySchema = z.object({
  query: z.string().trim().max(500).optional(),
  matterId: z.string().trim().min(1).optional(),
  calendarEventId: z.string().trim().min(1).optional(),
  caseNumber: z.string().trim().max(150).optional(),
  courtName: z.string().trim().max(255).optional(),
  courtStation: z.string().trim().max(255).optional(),
  judge: z.string().trim().max(255).optional(),
  hearingType: courtHearingTypeSchema.optional(),
  status: courtHearingStatusSchema.optional(),
  hearingFrom: z.string().datetime().optional(),
  hearingTo: z.string().datetime().optional(),
  upcomingOnly: z.enum(['true', 'false']).optional(),
  overdueOnly: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const courtDashboardQuerySchema = z.object({
  matterId: z.string().trim().min(1).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const courtHearingIdParamSchema = z.object({
  hearingId: z.string().trim().min(1),
});

export const courtBridgeRequestSchema = z.object({
  reason: z.string().trim().max(1000).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export type CourtHearingCreateDto = z.infer<typeof courtHearingCreateSchema>;
export type CourtHearingUpdateDto = z.infer<typeof courtHearingUpdateSchema>;
export type CourtSearchQueryDto = z.infer<typeof courtSearchQuerySchema>;