// apps/api/src/modules/queues/queue.validators.ts

import { z } from 'zod';

export const externalJobProviderSchema = z.enum([
  'ETIMS',
  'BANKING',
  'GOAML',
  'NOTIFICATIONS',
  'OUTLOOK',
  'GOOGLE',
]);

export const externalJobStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'RETRYING',
  'COMPLETED',
  'FAILED',
  'DEAD_LETTER',
]);

export const queueCreateJobSchema = z.object({
  provider: externalJobProviderSchema,
  jobType: z.string().trim().min(1).max(150),
  entityType: z.string().trim().max(100).nullable().optional(),
  entityId: z.string().trim().max(150).nullable().optional(),
  payload: z.record(z.string(), z.unknown()),
  maxAttempts: z.coerce.number().int().min(1).max(20).nullable().optional(),
});

export const queueSearchQuerySchema = z.object({
  provider: externalJobProviderSchema.optional(),
  status: externalJobStatusSchema.optional(),
  jobType: z.string().trim().max(150).optional(),
  entityType: z.string().trim().max(100).optional(),
  entityId: z.string().trim().max(150).optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  nextRetryFrom: z.string().datetime().optional(),
  nextRetryTo: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const queueDashboardQuerySchema = z.object({
  provider: externalJobProviderSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const queueJobIdParamSchema = z.object({
  jobId: z.string().trim().min(1),
});

export const queueFailJobSchema = z.object({
  error: z.string().trim().min(1).max(5000),
  retry: z.boolean().optional(),
});

export const queueCompleteJobSchema = z.object({
  result: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type QueueCreateJobDto = z.infer<typeof queueCreateJobSchema>;
export type QueueSearchQueryDto = z.infer<typeof queueSearchQuerySchema>;