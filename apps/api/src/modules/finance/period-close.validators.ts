import { z } from 'zod';

export const periodIdentifierSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(3000),
});

export const closePeriodBodySchema = periodIdentifierSchema.extend({
  reason: z.string().trim().max(1000).optional(),
});

export const listPeriodsQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(3000).optional(),
  status: z.enum(['OPEN', 'CLOSED', 'LOCKED']).optional(),
});

export type PeriodIdentifierDto = z.infer<typeof periodIdentifierSchema>;
export type ClosePeriodBodyDto = z.infer<typeof closePeriodBodySchema>;
export type ListPeriodsQueryDto = z.infer<typeof listPeriodsQuerySchema>;