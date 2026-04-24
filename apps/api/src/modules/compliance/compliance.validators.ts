// apps/api/src/modules/compliance/compliance.validators.ts

import { z } from 'zod';

const optionalDate = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value instanceof Date) return value;
  return new Date(String(value));
}, z.date());

export const amlReportTypeSchema = z.enum([
  'STR',
  'CTR',
  'KYC_EXCEPTION',
  'AML_REVIEW',
]);

export const amlStatusSchema = z.enum([
  'DRAFT',
  'PENDING_REVIEW',
  'SUBMITTED',
  'ACKNOWLEDGED',
  'REJECTED',
]);

export const complianceCheckTypeSchema = z.enum([
  'KYC',
  'PEP',
  'SANCTIONS',
  'RISK',
]);

export const riskBandSchema = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
]);

export const complianceReviewSchema = z.object({
  clientId: z.string().trim().min(1),
  performKyc: z.boolean().optional(),
  performPepCheck: z.boolean().optional(),
  performSanctionsCheck: z.boolean().optional(),
  persistResult: z.boolean().optional(),
});

export const complianceReportCreateSchema = z.object({
  reportType: amlReportTypeSchema,
  status: amlStatusSchema.optional(),
  periodStart: optionalDate.nullable().optional(),
  periodEnd: optionalDate.nullable().optional(),
  referenceNumber: z.string().trim().max(255).nullable().optional(),
  regulatorAck: z.string().trim().max(2000).nullable().optional(),
  submittedAt: optionalDate.nullable().optional(),
  clientId: z.string().trim().min(1).nullable().optional(),
  payload: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const complianceReportUpdateSchema = z.object({
  status: amlStatusSchema.optional(),
  referenceNumber: z.string().trim().max(255).nullable().optional(),
  regulatorAck: z.string().trim().max(2000).nullable().optional(),
  submittedAt: optionalDate.nullable().optional(),
  payload: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const complianceReportSearchQuerySchema = z.object({
  query: z.string().trim().max(500).optional(),
  reportType: amlReportTypeSchema.optional(),
  status: amlStatusSchema.optional(),
  clientId: z.string().trim().min(1).optional(),
  periodStartFrom: z.string().datetime().optional(),
  periodStartTo: z.string().datetime().optional(),
  periodEndFrom: z.string().datetime().optional(),
  periodEndTo: z.string().datetime().optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const complianceCheckSearchQuerySchema = z.object({
  clientId: z.string().trim().min(1).optional(),
  checkType: complianceCheckTypeSchema.optional(),
  riskBand: riskBandSchema.optional(),
  checkedFrom: z.string().datetime().optional(),
  checkedTo: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const complianceDashboardQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const complianceCalendarQuerySchema = z.object({
  reviewWindowDays: z.coerce.number().int().min(1).max(365).optional(),
  kycReviewAgeDays: z.coerce.number().int().min(30).max(1095).optional(),
  screeningReviewAgeDays: z.coerce.number().int().min(30).max(1095).optional(),
});

export const complianceReportIdParamSchema = z.object({
  reportId: z.string().trim().min(1),
});

export const complianceClientIdParamSchema = z.object({
  clientId: z.string().trim().min(1),
});

export type ComplianceReviewDto = z.infer<typeof complianceReviewSchema>;
export type ComplianceReportCreateDto = z.infer<typeof complianceReportCreateSchema>;
export type ComplianceReportUpdateDto = z.infer<typeof complianceReportUpdateSchema>;