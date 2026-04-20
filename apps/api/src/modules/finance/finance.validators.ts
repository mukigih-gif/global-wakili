import { z } from 'zod';

const decimalLikeSchema = z.union([
  z.string().trim().min(1, 'Value cannot be empty'),
  z.number().finite('Value must be a finite number'),
]);

export const journalLineInputSchema = z.object({
  accountId: z.string().trim().min(1, 'accountId is required'),
  debit: decimalLikeSchema,
  credit: decimalLikeSchema,
  description: z.string().trim().max(500).optional().nullable(),
  clientId: z.string().trim().min(1).optional().nullable(),
  matterId: z.string().trim().min(1).optional().nullable(),
  branchId: z.string().trim().min(1).optional().nullable(),
  reference: z.string().trim().max(100).optional().nullable(),
});

export const journalPostingInputSchema = z.object({
  reference: z
    .string()
    .trim()
    .min(1, 'reference is required')
    .max(100, 'reference must not exceed 100 characters'),
  description: z
    .string()
    .trim()
    .min(1, 'description is required')
    .max(1000, 'description must not exceed 1000 characters'),
  date: z.coerce.date(),
  currency: z.string().trim().length(3).optional().nullable(),
  exchangeRate: decimalLikeSchema.optional().nullable(),
  sourceModule: z.string().trim().max(100).optional().nullable(),
  sourceEntityType: z.string().trim().max(100).optional().nullable(),
  sourceEntityId: z.string().trim().max(100).optional().nullable(),
  reversalOfId: z.string().trim().min(1).optional().nullable(),
  lines: z.array(journalLineInputSchema).min(1, 'At least one journal line is required'),
});

export const financeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  search: z.string().trim().max(200).optional(),
});

export const periodCloseInputSchema = z.object({
  periodId: z.string().trim().min(1, 'periodId is required'),
  closeReason: z.string().trim().min(1).max(1000).optional(),
});

export type JournalLineInputDto = z.infer<typeof journalLineInputSchema>;
export type JournalPostingInputDto = z.infer<typeof journalPostingInputSchema>;
export type FinanceListQueryDto = z.infer<typeof financeListQuerySchema>;
export type PeriodCloseInputDto = z.infer<typeof periodCloseInputSchema>;