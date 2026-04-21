// apps/api/src/modules/payroll/payroll.validators.ts

import { z } from 'zod';

const decimalString = z
  .string()
  .trim()
  .regex(/^-?\d+(\.\d{1,6})?$/, 'Expected a decimal string');

const positiveDecimalString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,6})?$/, 'Expected a positive decimal string')
  .refine((value) => Number(value) > 0, 'Amount must be greater than zero');

const nonNegativeDecimalString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,6})?$/, 'Expected a non-negative decimal string');

const optionalDate = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value instanceof Date) return value;
  return new Date(String(value));
}, z.date());

const requiredDate = z.preprocess((value) => {
  if (value instanceof Date) return value;
  return new Date(String(value));
}, z.date());

export const payrollFrequencySchema = z.enum([
  'MONTHLY',
  'SEMI_MONTHLY',
  'BI_WEEKLY',
  'WEEKLY',
  'DAILY',
  'CUSTOM',
]);

export const payrollBatchStatusSchema = z.enum([
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'POSTED',
  'PAID',
  'CANCELLED',
]);

export const payrollRecordStatusSchema = z.enum([
  'DRAFT',
  'CALCULATED',
  'APPROVED',
  'POSTED',
  'PAID',
  'CANCELLED',
]);

export const payItemKindSchema = z.enum([
  'BASIC_PAY',
  'ALLOWANCE',
  'BENEFIT',
  'OVERTIME',
  'BONUS',
  'COMMISSION',
  'REIMBURSEMENT',
  'DEDUCTION',
  'STATUTORY',
  'LOAN',
  'ADVANCE',
  'OTHER',
]);

export const payrollDeductionKindSchema = z.enum([
  'PAYE',
  'NSSF_EMPLOYEE',
  'SHA_SHIF',
  'AFFORDABLE_HOUSING_LEVY',
  'PENSION',
  'SACCO',
  'LOAN',
  'ADVANCE',
  'INSURANCE',
  'OTHER',
]);

export const payrollEarningInputSchema = z.object({
  kind: payItemKindSchema,
  code: z.string().trim().max(50).optional().nullable(),
  label: z.string().trim().min(1).max(255),
  amount: nonNegativeDecimalString,
  taxable: z.boolean().optional().default(true),
  pensionable: z.boolean().optional().default(true),
  cash: z.boolean().optional().default(true),
  metadata: z.record(z.unknown()).optional(),
});

export const payrollDeductionInputSchema = z.object({
  kind: payrollDeductionKindSchema,
  code: z.string().trim().max(50).optional().nullable(),
  label: z.string().trim().min(1).max(255),
  amount: nonNegativeDecimalString,
  preTax: z.boolean().optional().default(false),
  metadata: z.record(z.unknown()).optional(),
});

export const payrollCalculationSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  employeeId: z.string().trim().min(1),
  currency: z.string().trim().min(3).max(8).optional().default('KES'),

  basicPay: positiveDecimalString,

  allowances: z.array(payrollEarningInputSchema).max(100).optional(),
  benefits: z.array(payrollEarningInputSchema).max(100).optional(),
  overtime: z.array(payrollEarningInputSchema).max(100).optional(),
  bonuses: z.array(payrollEarningInputSchema).max(100).optional(),
  commissions: z.array(payrollEarningInputSchema).max(100).optional(),
  reimbursements: z.array(payrollEarningInputSchema).max(100).optional(),

  manualDeductions: z.array(payrollDeductionInputSchema).max(100).optional(),

  pensionEmployeeContribution: nonNegativeDecimalString.optional(),
  pensionEmployerContribution: nonNegativeDecimalString.optional(),
  disabledExemptionAmount: nonNegativeDecimalString.optional(),
  insuranceReliefAmount: nonNegativeDecimalString.optional(),

  applyPaye: z.boolean().optional().default(true),
  applyNssf: z.boolean().optional().default(true),
  applySha: z.boolean().optional().default(true),
  applyHousingLevy: z.boolean().optional().default(true),
  applyNita: z.boolean().optional().default(true),
  residentForTax: z.boolean().optional().default(true),

  metadata: z.record(z.unknown()).optional(),
});

export const createPayrollRecordSchema = payrollCalculationSchema.extend({
  payrollBatchId: z.string().trim().min(1).optional().nullable(),
  periodStart: requiredDate,
  periodEnd: requiredDate,
  paymentDate: optionalDate.optional().nullable(),
  branchId: z.string().trim().min(1).optional().nullable(),
  departmentId: z.string().trim().min(1).optional().nullable(),
}).refine((data) => data.periodEnd >= data.periodStart, {
  message: 'periodEnd must be on or after periodStart',
  path: ['periodEnd'],
});

export const createPayrollBatchSchema = z.object({
  title: z.string().trim().max(255).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  periodStart: requiredDate,
  periodEnd: requiredDate,
  paymentDate: optionalDate.optional().nullable(),
  frequency: payrollFrequencySchema.optional().default('MONTHLY'),
  currency: z.string().trim().min(3).max(8).optional().default('KES'),
  employeeIds: z.array(z.string().trim().min(1)).max(1000).optional(),
  branchId: z.string().trim().min(1).optional().nullable(),
  departmentId: z.string().trim().min(1).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
}).refine((data) => data.periodEnd >= data.periodStart, {
  message: 'periodEnd must be on or after periodStart',
  path: ['periodEnd'],
});

export const payrollBatchListQuerySchema = z.object({
  status: payrollBatchStatusSchema.optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  branchId: z.string().trim().min(1).optional(),
  departmentId: z.string().trim().min(1).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

export const payrollRecordListQuerySchema = z.object({
  payrollBatchId: z.string().trim().min(1).optional(),
  employeeId: z.string().trim().min(1).optional(),
  status: payrollRecordStatusSchema.optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

export const payrollIdParamSchema = z.object({
  payrollId: z.string().trim().min(1),
});

export const payrollBatchIdParamSchema = z.object({
  payrollBatchId: z.string().trim().min(1),
});

export const payrollApprovalSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().trim().max(2000).optional().nullable(),
});

export const decimalInputSchema = decimalString;
export const positiveDecimalInputSchema = positiveDecimalString;
export const nonNegativeDecimalInputSchema = nonNegativeDecimalString;

export type PayrollCalculationDto = z.infer<typeof payrollCalculationSchema>;
export type CreatePayrollRecordDto = z.infer<typeof createPayrollRecordSchema>;
export type CreatePayrollBatchDto = z.infer<typeof createPayrollBatchSchema>;
export type PayrollBatchListQueryDto = z.infer<typeof payrollBatchListQuerySchema>;
export type PayrollRecordListQueryDto = z.infer<typeof payrollRecordListQuerySchema>;