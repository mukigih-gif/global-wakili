import { z } from 'zod';

const decimalLikeSchema = z.union([
  z.string().trim().min(1, 'Value cannot be empty'),
  z.number().finite('Value must be finite'),
]);

export const vendorInputSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.string().trim().email().optional().nullable(),
  phoneNumber: z.string().trim().min(3).max(50).optional().nullable(),
  kraPin: z.string().trim().min(3).max(50).optional().nullable(),
  contactPerson: z.string().trim().max(255).optional().nullable(),
  address: z.string().trim().max(1000).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLACKLISTED']).optional(),
  currency: z.string().trim().length(3).optional().nullable(),
  paymentTermsDays: z.number().int().min(0).max(365).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const vendorBillLineInputSchema = z.object({
  description: z.string().trim().min(1).max(1000),
  quantity: decimalLikeSchema,
  unitPrice: decimalLikeSchema,
  taxRate: decimalLikeSchema.optional().nullable(),
  taxAmount: decimalLikeSchema.optional().nullable(),
  lineTotal: decimalLikeSchema.optional().nullable(),
  expenseAccountId: z.string().trim().min(1).optional().nullable(),
  itemCode: z.string().trim().max(100).optional().nullable(),
});

export const vendorBillInputSchema = z.object({
  vendorId: z.string().trim().min(1),
  billNumber: z.string().trim().min(1).max(100),
  billDate: z.coerce.date(),
  dueDate: z.coerce.date().optional().nullable(),
  currency: z.string().trim().length(3).optional().nullable(),
  subTotal: decimalLikeSchema,
  vatAmount: decimalLikeSchema.optional().nullable(),
  whtRate: decimalLikeSchema.optional().nullable(),
  whtAmount: decimalLikeSchema.optional().nullable(),
  total: decimalLikeSchema,
  notes: z.string().trim().max(4000).optional().nullable(),
  branchId: z.string().trim().min(1).optional().nullable(),
  matterId: z.string().trim().min(1).optional().nullable(),
  lines: z.array(vendorBillLineInputSchema).min(1),
});

export type VendorInputDto = z.infer<typeof vendorInputSchema>;
export type VendorBillInputDto = z.infer<typeof vendorBillInputSchema>;
export type VendorBillLineInputDto = z.infer<typeof vendorBillLineInputSchema>;