import { z } from 'zod';

export const RegisterFirmSchema = z.object({
  firmName: z.string().min(2, 'Firm name is required').max(200),
  tenantName: z.string().min(2).max(200).optional(),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain lowercase letters, numbers, and hyphens only')
    .optional(),
  kraPin: z.string().min(6).max(30).optional(),

  adminName: z.string().min(2).max(200),
  adminEmail: z.string().email().transform((value) => value.toLowerCase()),
  adminPassword: z.string().min(8),

  phone: z.string().min(6).max(30).optional(),
  address: z.string().max(500).optional(),

  timezone: z.string().default('Africa/Nairobi'),
  locale: z.string().default('en-KE'),
  currency: z.string().default('KES'),
});

export const LoginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
  tenantId: z.string().optional(),
  tenantSlug: z.string().optional(),
  deviceFingerprint: z.string().optional(),
  mfaCode: z.string().optional(),
});

export type RegisterFirmInput = z.infer<typeof RegisterFirmSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;