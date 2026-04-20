import { z } from 'zod';

export const AuditChangeDataSchema = z.object({
  entityType: z.string(),
  entityId: z.string(),
  changedFields: z.array(z.string()).default([]),
  before: z.record(z.string(), z.unknown()).nullable().optional(),
  after: z.record(z.string(), z.unknown()).nullable().optional(),
  reason: z.string().optional(),
  correlationId: z.string().optional(),
});

export type AuditChangeData = z.infer<typeof AuditChangeDataSchema>;

export const EvidenceAccessLogEntrySchema = z.object({
  userId: z.string(),
  action: z.enum(['VIEW', 'DOWNLOAD', 'PRINT', 'SHARE', 'EXPORT']),
  accessedAt: z.coerce.date(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  reason: z.string().optional(),
});

export type EvidenceAccessLogEntry = z.infer<typeof EvidenceAccessLogEntrySchema>;

export const KycSupportingDataSchema = z.object({
  sourceOfFunds: z.string().optional(),
  sourceOfWealth: z.string().optional(),
  beneficialOwners: z.array(z.record(z.string(), z.unknown())).default([]),
  documents: z.array(z.record(z.string(), z.unknown())).default([]),
  screeningReferences: z.array(z.string()).default([]),
});

export type KycSupportingData = z.infer<typeof KycSupportingDataSchema>;

export const PermissionConstraintsSchema = z.object({
  branchIds: z.array(z.string()).optional(),
  matterTypes: z.array(z.string()).optional(),
  maxAmount: z.number().optional(),
  requiresApproval: z.boolean().optional(),
  restrictedClassifications: z.array(z.string()).optional(),
});

export type PermissionConstraints = z.infer<typeof PermissionConstraintsSchema>;