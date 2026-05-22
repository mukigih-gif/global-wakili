import { z } from 'zod';

export const vendorStatusSchema = z.enum([
  'ACTIVE',
  'INACTIVE',
  'BLACKLISTED',
]);

export const vendorInputSchema = z.object({
  name: z.string().trim().min(1).max(255),
  kraPin: z.string().trim().min(1).max(50),
  etimsId: z.string().trim().max(100).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  phoneNumber: z.string().trim().min(3).max(50).optional().nullable(),
  contactPerson: z.string().trim().max(255).optional().nullable(),
  address: z.string().trim().max(1000).optional().nullable(),
  status: vendorStatusSchema.optional(),
  currency: z.string().trim().length(3).optional().nullable(),
  paymentTermsDays: z.coerce.number().int().min(0).max(365).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const vendorUpdateSchema = vendorInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: 'At least one vendor field must be supplied for update.',
  },
);

export const vendorListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(200).optional(),
  status: vendorStatusSchema.optional(),
});

export const vendorStatusUpdateSchema = z.object({
  status: vendorStatusSchema,
});

export type VendorInputDto = z.infer<typeof vendorInputSchema>;
export type VendorUpdateDto = z.infer<typeof vendorUpdateSchema>;
export type VendorListQueryDto = z.infer<typeof vendorListQuerySchema>;
export type VendorStatusUpdateDto = z.infer<typeof vendorStatusUpdateSchema>;
