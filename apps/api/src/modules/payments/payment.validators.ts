import { z } from 'zod';
import {
  PaymentMethod,
  PaymentReceiptStatus,
} from '@global-wakili/database';

const decimalString = z
  .string()
  .trim()
  .regex(/^(0|[1-9]\d*)(\.\d{1,6})?$/, 'Value must be a non-negative decimal string');

const positiveDecimalString = decimalString.refine(
  (value) => value !== '0' && !/^0(\.0+)?$/.test(value),
  'Value must be greater than zero',
);

const optionalDate = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value instanceof Date) return value;
  return new Date(String(value));
}, z.date());

export const paymentReceiptIdParamSchema = z.object({
  paymentReceiptId: z.string().min(1),
});

export const paymentIdParamSchema = z.object({
  id: z.string().min(1),
});

export const refundIdParamSchema = z.object({
  refundId: z.string().min(1),
});

export const paymentAllocationSchema = z.object({
  invoiceId: z.string().min(1),
  amountApplied: positiveDecimalString,
  allocationType: z.enum(['CASH', 'WHT_CERTIFICATE']).optional(),
  withholdingTaxCertificateId: z.string().min(1).nullable().optional(),
});

export const createPaymentReceiptSchema = z.object({
  clientId: z.string().min(1).nullable().optional(),
  matterId: z.string().min(1).nullable().optional(),
  invoiceId: z.string().min(1).nullable().optional(),
  amount: positiveDecimalString,
  currency: z.string().trim().min(3).max(8).optional(),
  exchangeRate: positiveDecimalString.optional(),
  method: z.nativeEnum(PaymentMethod),
  reference: z.string().trim().min(1).max(200).nullable().optional(),
  description: z.string().trim().min(1).max(1000).nullable().optional(),
  receivedAt: optionalDate.optional(),
  allocations: z.array(paymentAllocationSchema).max(100).optional(),
});

export const allocatePaymentSchema = z.object({
  allocations: z.array(paymentAllocationSchema).min(1).max(100),
});

export const reversePaymentReceiptSchema = z.object({
  reason: z.string().trim().min(5).max(1000),
});

export const listPaymentReceiptsQuerySchema = z.object({
  clientId: z.string().min(1).optional(),
  matterId: z.string().min(1).optional(),
  invoiceId: z.string().min(1).optional(),
  status: z.nativeEnum(PaymentReceiptStatus).optional(),
  method: z.nativeEnum(PaymentMethod).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  receivedFrom: optionalDate.optional(),
  receivedTo: optionalDate.optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

export const paymentReceiptNumberPreviewQuerySchema = z.object({
  receivedAt: optionalDate.optional(),
  prefix: z.string().trim().min(1).max(12).optional(),
});

export const createRefundSchema = z.object({
  amount: positiveDecimalString,
  reason: z.string().trim().min(5).max(1000),
});

export const approveRefundSchema = z.object({});

export const payRefundSchema = z.object({
  bankReference: z.string().trim().min(1).max(200).nullable().optional(),
});

export const rejectRefundSchema = z.object({
  reason: z.string().trim().min(5).max(1000),
});

export type CreatePaymentReceiptDto = z.infer<typeof createPaymentReceiptSchema>;
export type AllocatePaymentDto = z.infer<typeof allocatePaymentSchema>;
export type ReversePaymentReceiptDto = z.infer<typeof reversePaymentReceiptSchema>;
export type ListPaymentReceiptsQueryDto = z.infer<typeof listPaymentReceiptsQuerySchema>;
export type CreateRefundDto = z.infer<typeof createRefundSchema>;
export type PayRefundDto = z.infer<typeof payRefundSchema>;
export type RejectRefundDto = z.infer<typeof rejectRefundSchema>;