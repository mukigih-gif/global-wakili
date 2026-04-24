import { z } from 'zod';

const decimalLikeSchema = z.union([
  z.string().trim().min(1, 'Value cannot be empty'),
  z.number().finite('Value must be finite'),
]);

export const matterBillingConfigSchema = z.object({
  model: z.enum(['HOURLY', 'FIXED_FEE', 'CONTINGENCY', 'CAPPED_FEE']).optional(),
  rate: decimalLikeSchema.optional().nullable(),
  capAmount: decimalLikeSchema.optional().nullable(),
  retainerAmount: decimalLikeSchema.optional().nullable(),
  billingNotes: z.string().trim().max(2000).optional().nullable(),
});

export const matterDocumentConfigSchema = z.object({
  folderId: z.string().trim().max(255).optional().nullable(),
  documentCount: z.number().int().min(0).optional().nullable(),
  requiredDocuments: z.array(z.string().trim().min(1)).optional().nullable(),
});

export const matterCalendarConfigSchema = z.object({
  nextKeyDate: z.string().datetime().optional().nullable(),
  nextCourtDate: z.string().datetime().optional().nullable(),
  reminderMode: z.enum(['NONE', 'EMAIL', 'SMS', 'BOTH']).optional().nullable(),
});

export const matterInvoiceConfigSchema = z.object({
  invoiceCycle: z.enum(['AD_HOC', 'MONTHLY', 'MILESTONE']).optional().nullable(),
  lastInvoiceDate: z.string().datetime().optional().nullable(),
  unbilledTimeValue: decimalLikeSchema.optional().nullable(),
});

export const matterReportConfigSchema = z.object({
  clientReportingFrequency: z.enum(['NONE', 'WEEKLY', 'MONTHLY', 'ON_DEMAND']).optional().nullable(),
  internalReportingFrequency: z.enum(['NONE', 'WEEKLY', 'MONTHLY', 'QUARTERLY']).optional().nullable(),
});

export const matterInputSchema = z.object({
  matterCode: z.string().trim().max(50).optional().nullable(),
  matterReference: z.string().trim().max(100).optional().nullable(),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(4000).optional().nullable(),
  clientId: z.string().trim().min(1),
  branchId: z.string().trim().min(1).optional().nullable(),

  status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CLOSED', 'ARCHIVED']).optional(),
  billingModel: z.enum(['HOURLY', 'FIXED_FEE', 'CONTINGENCY', 'CAPPED_FEE']).optional(),
  currency: z.string().trim().length(3).optional().nullable(),
  openedDate: z.coerce.date().optional().nullable(),
  closeDate: z.coerce.date().optional().nullable(),

  originatorId: z.string().trim().min(1).optional().nullable(),
  partnerId: z.string().trim().min(1).optional().nullable(),
  assigneeId: z.string().trim().min(1).optional().nullable(),

  estimatedValue: decimalLikeSchema.optional().nullable(),
  progressPercent: z.number().min(0).max(100).optional().nullable(),
  progressStage: z
    .enum(['INTAKE', 'OPENED', 'IN_PROGRESS', 'AWAITING_CLIENT', 'AWAITING_COURT', 'BILLING', 'COMPLETED', 'CLOSED'])
    .optional()
    .nullable(),

  billing: matterBillingConfigSchema.optional().nullable(),
  documents: matterDocumentConfigSchema.optional().nullable(),
  calendar: matterCalendarConfigSchema.optional().nullable(),
  invoice: matterInvoiceConfigSchema.optional().nullable(),
  reports: matterReportConfigSchema.optional().nullable(),

  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export type MatterInputDto = z.infer<typeof matterInputSchema>;