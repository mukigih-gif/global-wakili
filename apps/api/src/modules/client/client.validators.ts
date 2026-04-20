import { z } from 'zod';

const KRA_PIN_REGEX = /^[AP][0-9]{9}[A-Z]$/i;

export const clientInputSchema = z.object({
  clientCode: z.string().trim().max(50).optional().nullable(),
  type: z.enum(['INDIVIDUAL', 'CORPORATE', 'STATE_AGENCY', 'OTHER']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PROSPECT', 'BLACKLISTED']).optional(),

  name: z.string().trim().min(1).max(255),
  email: z.string().trim().email().optional().nullable(),
  phoneNumber: z.string().trim().max(50).optional().nullable(),
  kraPin: z
    .string()
    .trim()
    .regex(KRA_PIN_REGEX, 'Invalid KRA PIN format')
    .optional()
    .nullable(),
  idNumber: z.string().trim().max(100).optional().nullable(),
  registrationNumber: z.string().trim().max(100).optional().nullable(),
  taxExempt: z.boolean().optional(),
  address: z.string().trim().max(2000).optional().nullable(),
  postalAddress: z.string().trim().max(1000).optional().nullable(),
  currency: z.string().trim().length(3).optional().nullable(),
  branchId: z.string().trim().min(1).optional().nullable(),

  primaryContactName: z.string().trim().max(255).optional().nullable(),
  primaryContactEmail: z.string().trim().email().optional().nullable(),
  primaryContactPhone: z.string().trim().max(50).optional().nullable(),
  portalUserId: z.string().trim().min(1).optional().nullable(),

  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export type ClientInputDto = z.infer<typeof clientInputSchema>;