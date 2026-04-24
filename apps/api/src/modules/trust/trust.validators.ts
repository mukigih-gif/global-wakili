import { z } from 'zod';

const decimalLikeSchema = z.union([
  z.string().trim().min(1, 'Value cannot be empty'),
  z.number().finite('Value must be a finite number'),
]);

const TRUST_TRANSACTION_TYPES = [
  'DEPOSIT',
  'WITHDRAWAL',
  'TRANSFER_TO_OFFICE',
  'REVERSAL',
  'INTEREST',
  'ADJUSTMENT',
] as const;

export const trustTransactionInputSchema = z.object({
  trustAccountId: z.string().trim().min(1, 'trustAccountId is required'),
  clientId: z.string().trim().min(1, 'clientId is required'),
  matterId: z.string().trim().min(1).optional().nullable(),
  transactionDate: z.coerce.date(),
  transactionType: z.enum(TRUST_TRANSACTION_TYPES),
  amount: decimalLikeSchema,
  currency: z.string().trim().length(3).optional().nullable(),
  reference: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  bankTransactionId: z.string().trim().min(1).optional().nullable(),
  invoiceId: z.string().trim().min(1).optional().nullable(),
  drnId: z.string().trim().min(1).optional().nullable(),
});

export const trustTransferInputSchema = z.object({
  trustAccountId: z.string().trim().min(1, 'trustAccountId is required'),
  clientId: z.string().trim().min(1, 'clientId is required'),
  matterId: z.string().trim().min(1, 'matterId is required'),
  amount: decimalLikeSchema,
  reference: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(1000),
  transactionDate: z.coerce.date(),
  invoiceId: z.string().trim().min(1).optional().nullable(),
  disbursementId: z.string().trim().min(1).optional().nullable(),
  drnId: z.string().trim().min(1).optional().nullable(),
});

export type TrustTransactionInputDto = z.infer<typeof trustTransactionInputSchema>;
export type TrustTransferInputDto = z.infer<typeof trustTransferInputSchema>;