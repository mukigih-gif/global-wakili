// apps/api/src/modules/hr/hr.validators.ts

import { z } from 'zod';

const optionalDate = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value instanceof Date) return value;
  return new Date(String(value));
}, z.date());

const requiredDate = z.preprocess((value) => {
  if (value instanceof Date) return value;
  return new Date(String(value));
}, z.date());

const nonNegativeDecimalString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,6})?$/, 'Expected a non-negative decimal string');

const positiveDecimalString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,6})?$/, 'Expected a positive decimal string')
  .refine((value) => Number(value) > 0, 'Amount must be greater than zero');

const decimalLike = z.union([
  z.string().trim().regex(/^-?\d+(\.\d{1,6})?$/, 'Expected a decimal string'),
  z.number().finite(),
]);

const nullableString = (max = 255) =>
  z.string().trim().max(max).optional().nullable();

const optionalId = z.string().trim().min(1).optional();
const nullableId = z.string().trim().min(1).optional().nullable();

export const employeeStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'ON_PROBATION',
  'ON_LEAVE',
  'SUSPENDED',
  'TERMINATED',
  'INACTIVE',
]);

export const employmentTypeSchema = z.enum([
  'PERMANENT',
  'FIXED_TERM',
  'PROBATION',
  'CASUAL',
  'CONSULTANT',
  'INTERN',
  'SECONDMENT',
  'OTHER',
]);

export const employeeGenderSchema = z.enum([
  'MALE',
  'FEMALE',
  'OTHER',
  'UNDISCLOSED',
]);

export const employeeMaritalStatusSchema = z.enum([
  'SINGLE',
  'MARRIED',
  'DIVORCED',
  'WIDOWED',
  'UNDISCLOSED',
]);

export const departmentStatusSchema = z.enum([
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED',
]);

export const employeeContractStatusSchema = z.enum([
  'DRAFT',
  'PENDING_SIGNATURE',
  'ACTIVE',
  'EXPIRED',
  'TERMINATED',
  'SUPERSEDED',
  'CANCELLED',
]);

export const leaveAccrualFrequencySchema = z.enum([
  'MONTHLY',
  'QUARTERLY',
  'ANNUALLY',
  'ON_EMPLOYMENT_ANNIVERSARY',
  'MANUAL',
]);

export const clockMethodSchema = z.enum([
  'WEB',
  'MOBILE',
  'BIOMETRIC',
  'ADMIN',
  'IMPORT',
  'API',
]);

export const attendanceStatusSchema = z.enum([
  'CLOCKED_IN',
  'CLOCKED_OUT',
  'LATE',
  'ABSENT',
  'ON_LEAVE',
  'EXCEPTION',
  'MANUAL_ADJUSTED',
]);

export const performanceReviewStatusSchema = z.enum([
  'DRAFT',
  'SELF_REVIEW',
  'MANAGER_REVIEW',
  'CALIBRATION',
  'COMPLETED',
  'CANCELLED',
]);

export const disciplinarySeveritySchema = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
]);

export const disciplinaryActionTypeSchema = z.enum([
  'VERBAL_WARNING',
  'WRITTEN_WARNING',
  'FINAL_WARNING',
  'SUSPENSION',
  'TERMINATION_RECOMMENDATION',
  'TRAINING',
  'NO_ACTION',
]);

export const hrDocumentStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'PENDING_SIGNATURE',
  'SIGNED',
  'EXPIRED',
  'REVOKED',
  'ARCHIVED',
]);

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(1).max(255),
  code: nullableString(50),
  description: nullableString(2000),
  parentDepartmentId: nullableId,
  managerEmployeeId: nullableId,
  branchId: nullableId,
  costCenterCode: nullableString(50),
  metadata: z.record(z.unknown()).optional(),
});

export const updateDepartmentSchema = createDepartmentSchema
  .partial()
  .extend({
    status: departmentStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one department field is required for update',
  });

export const departmentListQuerySchema = z.object({
  branchId: optionalId,
  status: departmentStatusSchema.optional(),
  search: z.string().trim().max(200).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

export const createEmployeeSchema = z.object({
  staffNumber: nullableString(80),
  userId: nullableId,

  firstName: z.string().trim().min(1).max(120),
  middleName: nullableString(120),
  lastName: z.string().trim().min(1).max(120),
  displayName: nullableString(255),

  email: z.string().trim().email().max(255).optional().nullable(),
  phone: nullableString(50),
  personalEmail: z.string().trim().email().max(255).optional().nullable(),

  gender: employeeGenderSchema.optional().nullable(),
  maritalStatus: employeeMaritalStatusSchema.optional().nullable(),
  dateOfBirth: optionalDate.optional().nullable(),

  nationalId: nullableString(80),
  passportNumber: nullableString(80),
  kraPin: nullableString(30),
  nssfNumber: nullableString(50),
  shaNumber: nullableString(50),
  nhifNumber: nullableString(50),

  branchId: nullableId,
  departmentId: nullableId,
  roleId: nullableId,
  jobTitle: nullableString(255),
  employmentType: employmentTypeSchema.optional().default('PERMANENT'),
  status: employeeStatusSchema.optional().default('ACTIVE'),

  startDate: optionalDate.optional().nullable(),
  probationEndDate: optionalDate.optional().nullable(),
  reportingManagerId: nullableId,

  basicPay: nonNegativeDecimalString.optional().nullable(),
  salary: nonNegativeDecimalString.optional().nullable(),
  currency: z.string().trim().min(3).max(8).optional().default('KES'),
  payrollEligible: z.boolean().optional().default(true),

  emergencyContactName: nullableString(255),
  emergencyContactPhone: nullableString(50),
  emergencyContactRelationship: nullableString(100),

  addressLine1: nullableString(255),
  addressLine2: nullableString(255),
  city: nullableString(100),
  county: nullableString(100),
  country: z.string().trim().max(100).optional().default('Kenya'),
  postalCode: nullableString(50),

  metadata: z.record(z.unknown()).optional(),
});

export const updateEmployeeSchema = createEmployeeSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one employee field is required for update',
  });

export const employeeListQuerySchema = z.object({
  branchId: optionalId,
  departmentId: optionalId,
  status: employeeStatusSchema.optional(),
  employmentType: employmentTypeSchema.optional(),
  payrollEligible: z.coerce.boolean().optional(),
  search: z.string().trim().max(200).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

export const employeeStatusChangeSchema = z.object({
  status: employeeStatusSchema,
  reason: z.string().trim().min(1).max(2000),
  effectiveDate: optionalDate.optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export const terminateEmployeeSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
  terminationDate: requiredDate,
  eligibleForRehire: z.boolean().optional().default(false),
  finalPayNotes: nullableString(2000),
  metadata: z.record(z.unknown()).optional(),
});

export const employeeContractBaseSchema = z.object({
  employeeId: z.string().trim().min(1),
  contractNumber: nullableString(100),
  title: z.string().trim().min(1).max(255),
  employmentType: employmentTypeSchema,
  status: employeeContractStatusSchema.optional().default('DRAFT'),
  startDate: requiredDate,
  endDate: optionalDate.optional().nullable(),
  probationEndDate: optionalDate.optional().nullable(),

  jobTitle: nullableString(255),
  departmentId: nullableId,
  branchId: nullableId,
  reportingManagerId: nullableId,

  basicPay: positiveDecimalString.optional().nullable(),
  currency: z.string().trim().min(3).max(8).optional().default('KES'),
  workingHoursPerWeek: positiveDecimalString.optional().nullable(),
  leaveDaysPerYear: nonNegativeDecimalString.optional().nullable(),

  noticePeriodDays: z.coerce.number().int().min(0).max(365).optional().nullable(),
  confidentialityRequired: z.boolean().optional().default(true),
  nonCompeteRequired: z.boolean().optional().default(false),

  documentId: nullableId,
  signedByEmployeeAt: optionalDate.optional().nullable(),
  signedByEmployerAt: optionalDate.optional().nullable(),

  terms: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const createEmployeeContractSchema = employeeContractBaseSchema.refine(
  (value) => !value.endDate || value.endDate >= value.startDate,
  {
    message: 'endDate must be on or after startDate',
    path: ['endDate'],
  },
);

export const updateEmployeeContractBaseSchema = employeeContractBaseSchema
  .omit({ employeeId: true })
  .partial();

export const updateEmployeeContractSchema = updateEmployeeContractBaseSchema
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one contract field is required for update',
  })
  .refine(
    (value) => {
      if (value.startDate && value.endDate) {
        return value.endDate >= value.startDate;
      }

      return true;
    },
    {
      message: 'endDate must be on or after startDate',
      path: ['endDate'],
    },
  );

export const employeeContractListQuerySchema = z.object({
  employeeId: optionalId,
  status: employeeContractStatusSchema.optional(),
  employmentType: employmentTypeSchema.optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

export const createLeavePolicySchema = z.object({
  name: z.string().trim().min(1).max(255),
  code: nullableString(80),
  description: nullableString(2000),
  leaveType: z.string().trim().min(1).max(100),
  annualEntitlementDays: decimalLike,
  accrualFrequency: leaveAccrualFrequencySchema.optional(),
  carryForwardAllowed: z.boolean().optional(),
  maxCarryForwardDays: decimalLike.optional().nullable(),
  encashmentAllowed: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  approvalLevels: z.coerce.number().int().min(0).max(10).optional(),
  appliesToEmploymentTypes: z.array(z.string()).optional(),
  appliesToDepartmentIds: z.array(z.string()).optional(),
  appliesToBranchIds: z.array(z.string()).optional(),
  effectiveFrom: requiredDate,
  effectiveTo: optionalDate.optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateLeavePolicySchema = createLeavePolicySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one leave policy field is required for update',
  });

export const leavePolicyListQuerySchema = z.object({
  status: z.string().trim().max(50).optional(),
  leaveType: z.string().trim().max(100).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

export const leaveAccrualSchema = z.object({
  employeeId: z.string().trim().min(1),
  leavePolicyId: z.string().trim().min(1),
  periodStart: requiredDate,
  periodEnd: requiredDate,
}).refine((value) => value.periodEnd >= value.periodStart, {
  message: 'periodEnd must be on or after periodStart',
  path: ['periodEnd'],
});

export const geoFenceSchema = z.object({
  name: z.string().trim().min(1).max(255),
  branchId: nullableId,
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().min(10).max(10000),
  active: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const clockSchema = z.object({
  employeeId: z.string().trim().min(1),
  method: clockMethodSchema.optional(),
  occurredAt: optionalDate.optional(),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  deviceId: nullableString(255),
  notes: nullableString(2000),
  metadata: z.record(z.unknown()).optional(),
});

export const manualAttendanceSchema = clockSchema.extend({
  clockInAt: requiredDate,
  clockOutAt: optionalDate.optional().nullable(),
  reason: z.string().trim().min(1).max(2000),
}).refine(
  (value) => {
    if (value.clockOutAt) {
      return value.clockOutAt >= value.clockInAt;
    }

    return true;
  },
  {
    message: 'clockOutAt must be on or after clockInAt',
    path: ['clockOutAt'],
  },
);

export const attendanceQuerySchema = z.object({
  employeeId: optionalId,
  branchId: optionalId,
  status: attendanceStatusSchema.optional(),
  from: optionalDate.optional(),
  to: optionalDate.optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

export const attendanceSummaryQuerySchema = z.object({
  employeeId: optionalId,
  from: requiredDate,
  to: requiredDate,
}).refine((value) => value.to >= value.from, {
  message: 'to must be on or after from',
  path: ['to'],
});

export const performanceGoalSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: nullableString(2000),
  weight: z.coerce.number().min(0).max(100).optional(),
  target: nullableString(1000),
  metric: nullableString(255),
});

export const performanceReviewSchema = z.object({
  employeeId: z.string().trim().min(1),
  reviewerId: nullableId,
  cycleName: z.string().trim().min(1).max(255),
  periodStart: requiredDate,
  periodEnd: requiredDate,
  dueDate: optionalDate.optional().nullable(),
  goals: z.array(performanceGoalSchema).max(50).optional(),
  metadata: z.record(z.unknown()).optional(),
}).refine((value) => value.periodEnd >= value.periodStart, {
  message: 'periodEnd must be on or after periodStart',
  path: ['periodEnd'],
});

export const performanceSubmitSchema = z.object({
  comments: nullableString(5000),
  selfRating: nullableString(100),
  managerRating: nullableString(100),
  score: z.coerce.number().min(0).max(100).optional().nullable(),
  competencyScores: z.record(z.number()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const performanceReviewListQuerySchema = z.object({
  employeeId: optionalId,
  reviewerId: optionalId,
  status: performanceReviewStatusSchema.optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

export const disciplinaryCaseSchema = z.object({
  employeeId: z.string().trim().min(1),
  reportedById: z.string().trim().min(1),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(5000),
  incidentDate: requiredDate,
  severity: disciplinarySeveritySchema.optional(),
  category: nullableString(100),
  witnessEmployeeIds: z.array(z.string().trim().min(1)).optional(),
  documentIds: z.array(z.string().trim().min(1)).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const disciplinaryHearingSchema = z.object({
  hearingAt: requiredDate,
  location: nullableString(255),
  panelEmployeeIds: z.array(z.string().trim().min(1)).optional(),
  notes: nullableString(2000),
});

export const disciplinaryActionSchema = z.object({
  actionType: disciplinaryActionTypeSchema,
  actionDate: optionalDate.optional(),
  effectiveFrom: optionalDate.optional().nullable(),
  effectiveTo: optionalDate.optional().nullable(),
  notes: nullableString(2000),
  metadata: z.record(z.unknown()).optional(),
}).refine(
  (value) => {
    if (value.effectiveFrom && value.effectiveTo) {
      return value.effectiveTo >= value.effectiveFrom;
    }

    return true;
  },
  {
    message: 'effectiveTo must be on or after effectiveFrom',
    path: ['effectiveTo'],
  },
);

export const disciplinaryCloseSchema = z.object({
  resolution: z.string().trim().min(1).max(2000),
  notes: nullableString(2000),
});

export const disciplinaryCaseListQuerySchema = z.object({
  employeeId: optionalId,
  status: z.string().trim().max(50).optional(),
  severity: disciplinarySeveritySchema.optional(),
  from: optionalDate.optional(),
  to: optionalDate.optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

export const hrDocumentSchema = z.object({
  employeeId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(255),
  category: z.string().trim().min(1).max(100),
  description: nullableString(2000),
  documentId: nullableId,
  storageKey: nullableString(500),
  fileName: nullableString(255),
  mimeType: nullableString(120),
  fileSizeBytes: z.coerce.number().int().min(0).optional().nullable(),
  contentHash: nullableString(255),
  requiresSignature: z.boolean().optional(),
  expiresAt: optionalDate.optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export const signatureRequestSchema = z.object({
  signerEmployeeId: nullableId,
  signerUserId: nullableId,
  signerName: nullableString(255),
  signerEmail: z.string().email().optional().nullable(),
  expiresAt: optionalDate.optional().nullable(),
  message: nullableString(2000),
  metadata: z.record(z.unknown()).optional(),
});

export const signDocumentSchema = z.object({
  signerUserId: nullableId,
  signerEmployeeId: nullableId,
  signerName: nullableString(255),
  signerEmail: z.string().email().optional().nullable(),
  signatureText: nullableString(255),
  signatureImageHash: nullableString(255),
  consentStatement: z.string().trim().min(1).max(2000),
  signedPayloadHash: nullableString(255),
});

export const hrDocumentListQuerySchema = z.object({
  employeeId: optionalId,
  category: z.string().trim().max(100).optional(),
  status: hrDocumentStatusSchema.optional(),
  requiresSignature: z.coerce.boolean().optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

export const dashboardQuerySchema = z.object({
  branchId: optionalId,
  departmentId: optionalId,
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

export const reasonSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
});

export const employeeIdParamSchema = z.object({
  employeeId: z.string().trim().min(1),
});

export const departmentIdParamSchema = z.object({
  departmentId: z.string().trim().min(1),
});

export const contractIdParamSchema = z.object({
  contractId: z.string().trim().min(1),
});

export const leavePolicyIdParamSchema = z.object({
  leavePolicyId: z.string().trim().min(1),
});

export const reviewIdParamSchema = z.object({
  reviewId: z.string().trim().min(1),
});

export const caseIdParamSchema = z.object({
  caseId: z.string().trim().min(1),
});

export const hrDocumentIdParamSchema = z.object({
  hrDocumentId: z.string().trim().min(1),
});

export const signatureIdParamSchema = z.object({
  signatureId: z.string().trim().min(1),
});

export const idParam = (name: string) =>
  z.object({
    [name]: z.string().trim().min(1),
  });

export type CreateEmployeeDto = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeDto = z.infer<typeof updateEmployeeSchema>;
export type CreateDepartmentDto = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentDto = z.infer<typeof updateDepartmentSchema>;
export type CreateEmployeeContractDto = z.infer<typeof createEmployeeContractSchema>;
export type UpdateEmployeeContractDto = z.infer<typeof updateEmployeeContractSchema>;
export type CreateLeavePolicyDto = z.infer<typeof createLeavePolicySchema>;
export type UpdateLeavePolicyDto = z.infer<typeof updateLeavePolicySchema>;
export type ClockDto = z.infer<typeof clockSchema>;
export type ManualAttendanceDto = z.infer<typeof manualAttendanceSchema>;
export type PerformanceReviewDto = z.infer<typeof performanceReviewSchema>;
export type DisciplinaryCaseDto = z.infer<typeof disciplinaryCaseSchema>;
export type HrDocumentDto = z.infer<typeof hrDocumentSchema>;
export type SignatureRequestDto = z.infer<typeof signatureRequestSchema>;
export type SignDocumentDto = z.infer<typeof signDocumentSchema>;