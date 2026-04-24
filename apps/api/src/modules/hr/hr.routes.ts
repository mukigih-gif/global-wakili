// apps/api/src/modules/hr/hr.routes.ts

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

import { validate } from '../../middleware/validate';

import {
  createDepartmentSchema,
  createEmployeeContractSchema,
  createEmployeeSchema,
  departmentIdParamSchema,
  departmentListQuerySchema,
  employeeContractListQuerySchema,
  employeeIdParamSchema,
  employeeListQuerySchema,
  employeeStatusChangeSchema,
  terminateEmployeeSchema,
  updateDepartmentSchema,
  updateEmployeeContractSchema,
  updateEmployeeSchema,
} from './hr.validators';

import {
  HR_PERMISSIONS,
  requireHrPermission,
} from './hr-permission.map';

import {
  accrueLeave,
  activateContract,
  archiveDepartment,
  cancelDisciplinaryCase,
  cancelPerformanceReview,
  changeEmployeeStatus,
  clockIn,
  clockOut,
  closeDisciplinaryCase,
  createContract,
  createDepartment,
  createDisciplinaryCase,
  createEmployee,
  createGeoFence,
  createHrDocument,
  createLeavePolicy,
  createManualAttendance,
  createPerformanceReview,
  getAttendanceSummary,
  getContractById,
  getDepartmentById,
  getDisciplinaryCaseById,
  getEmployeeById,
  getHrDashboard,
  getHrDocumentById,
  getLeavePolicyById,
  getPerformanceReviewById,
  issueDisciplinaryAction,
  listAttendance,
  listContracts,
  listDepartments,
  listDisciplinaryCases,
  listEmployees,
  listHrDocuments,
  listLeavePolicies,
  listPerformanceReviews,
  requestHrDocumentSignature,
  revokeHrDocument,
  scheduleDisciplinaryHearing,
  signHrDocument,
  startSelfReview,
  submitManagerReview,
  submitSelfReview,
  terminateContract,
  terminateEmployee,
  updateContract,
  updateDepartment,
  updateEmployee,
  updateLeavePolicy,
} from './hr.controller';

const router = Router();

const idParam = (name: string) =>
  z.object({
    [name]: z.string().trim().min(1),
  });

const reasonSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
});

const dashboardQuerySchema = z.object({
  branchId: z.string().trim().min(1).optional(),
  departmentId: z.string().trim().min(1).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

const leavePolicySchema = z.object({
  name: z.string().trim().min(1).max(255),
  code: z.string().trim().max(80).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  leaveType: z.string().trim().min(1).max(100),
  annualEntitlementDays: z.union([z.string(), z.number()]),
  accrualFrequency: z.enum([
    'MONTHLY',
    'QUARTERLY',
    'ANNUALLY',
    'ON_EMPLOYMENT_ANNIVERSARY',
    'MANUAL',
  ]).optional(),
  carryForwardAllowed: z.boolean().optional(),
  maxCarryForwardDays: z.union([z.string(), z.number()]).optional().nullable(),
  encashmentAllowed: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  approvalLevels: z.coerce.number().int().min(0).max(10).optional(),
  appliesToEmploymentTypes: z.array(z.string()).optional(),
  appliesToDepartmentIds: z.array(z.string()).optional(),
  appliesToBranchIds: z.array(z.string()).optional(),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const leaveAccrualSchema = z.object({
  employeeId: z.string().trim().min(1),
  leavePolicyId: z.string().trim().min(1),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
});

const geoFenceSchema = z.object({
  name: z.string().trim().min(1).max(255),
  branchId: z.string().trim().min(1).optional().nullable(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().min(10).max(10000),
  active: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const clockSchema = z.object({
  employeeId: z.string().trim().min(1),
  method: z.enum(['WEB', 'MOBILE', 'BIOMETRIC', 'ADMIN', 'IMPORT', 'API']).optional(),
  occurredAt: z.coerce.date().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  deviceId: z.string().trim().max(255).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const manualAttendanceSchema = clockSchema.extend({
  clockInAt: z.coerce.date(),
  clockOutAt: z.coerce.date().optional().nullable(),
  reason: z.string().trim().min(1).max(2000),
});

const attendanceQuerySchema = z.object({
  employeeId: z.string().trim().min(1).optional(),
  branchId: z.string().trim().min(1).optional(),
  status: z.string().trim().max(50).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

const attendanceSummaryQuerySchema = z.object({
  employeeId: z.string().trim().min(1).optional(),
  from: z.coerce.date(),
  to: z.coerce.date(),
});

const performanceReviewSchema = z.object({
  employeeId: z.string().trim().min(1),
  reviewerId: z.string().trim().min(1).optional().nullable(),
  cycleName: z.string().trim().min(1).max(255),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  dueDate: z.coerce.date().optional().nullable(),
  goals: z.array(z.object({
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().max(2000).optional().nullable(),
    weight: z.coerce.number().min(0).max(100).optional(),
    target: z.string().trim().max(1000).optional().nullable(),
    metric: z.string().trim().max(255).optional().nullable(),
  })).max(50).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const performanceSubmitSchema = z.object({
  comments: z.string().trim().max(5000).optional().nullable(),
  selfRating: z.string().trim().max(100).optional().nullable(),
  managerRating: z.string().trim().max(100).optional().nullable(),
  score: z.coerce.number().min(0).max(100).optional().nullable(),
  competencyScores: z.record(z.number()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const disciplinaryCaseSchema = z.object({
  employeeId: z.string().trim().min(1),
  reportedById: z.string().trim().min(1),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(5000),
  incidentDate: z.coerce.date(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  category: z.string().trim().max(100).optional().nullable(),
  witnessEmployeeIds: z.array(z.string().trim().min(1)).optional(),
  documentIds: z.array(z.string().trim().min(1)).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const hearingSchema = z.object({
  hearingAt: z.coerce.date(),
  location: z.string().trim().max(255).optional().nullable(),
  panelEmployeeIds: z.array(z.string().trim().min(1)).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const disciplinaryActionSchema = z.object({
  actionType: z.enum([
    'VERBAL_WARNING',
    'WRITTEN_WARNING',
    'FINAL_WARNING',
    'SUSPENSION',
    'TERMINATION_RECOMMENDATION',
    'TRAINING',
    'NO_ACTION',
  ]),
  actionDate: z.coerce.date().optional(),
  effectiveFrom: z.coerce.date().optional().nullable(),
  effectiveTo: z.coerce.date().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const disciplinaryCloseSchema = z.object({
  resolution: z.string().trim().min(1).max(2000),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const hrDocumentSchema = z.object({
  employeeId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(255),
  category: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).optional().nullable(),
  documentId: z.string().trim().min(1).optional().nullable(),
  storageKey: z.string().trim().max(500).optional().nullable(),
  fileName: z.string().trim().max(255).optional().nullable(),
  mimeType: z.string().trim().max(120).optional().nullable(),
  fileSizeBytes: z.coerce.number().int().min(0).optional().nullable(),
  contentHash: z.string().trim().max(255).optional().nullable(),
  requiresSignature: z.boolean().optional(),
  expiresAt: z.coerce.date().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const signatureRequestSchema = z.object({
  signerEmployeeId: z.string().trim().min(1).optional().nullable(),
  signerUserId: z.string().trim().min(1).optional().nullable(),
  signerName: z.string().trim().max(255).optional().nullable(),
  signerEmail: z.string().email().optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const signDocumentSchema = z.object({
  signerUserId: z.string().trim().min(1).optional().nullable(),
  signerEmployeeId: z.string().trim().min(1).optional().nullable(),
  signerName: z.string().trim().max(255).optional().nullable(),
  signerEmail: z.string().email().optional().nullable(),
  signatureText: z.string().trim().max(255).optional().nullable(),
  signatureImageHash: z.string().trim().max(255).optional().nullable(),
  consentStatement: z.string().trim().min(1).max(2000),
  signedPayloadHash: z.string().trim().max(255).optional().nullable(),
});

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'hr',
    status: 'mounted',
    service: 'global-wakili-api',
    lifecycle: 'production-hr-routes-mounted',
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

router.get(
  '/dashboard',
  requireHrPermission(HR_PERMISSIONS.viewDashboard),
  validate({ query: dashboardQuerySchema }),
  getHrDashboard,
);

router.get(
  '/employees',
  requireHrPermission(HR_PERMISSIONS.viewEmployee),
  validate({ query: employeeListQuerySchema }),
  listEmployees,
);

router.post(
  '/employees',
  requireHrPermission(HR_PERMISSIONS.createEmployee),
  validate({ body: createEmployeeSchema }),
  createEmployee,
);

router.get(
  '/employees/:employeeId',
  requireHrPermission(HR_PERMISSIONS.viewEmployee),
  validate({ params: employeeIdParamSchema }),
  getEmployeeById,
);

router.patch(
  '/employees/:employeeId',
  requireHrPermission(HR_PERMISSIONS.updateEmployee),
  validate({ params: employeeIdParamSchema, body: updateEmployeeSchema }),
  updateEmployee,
);

router.post(
  '/employees/:employeeId/status',
  requireHrPermission(HR_PERMISSIONS.changeEmployeeStatus),
  validate({ params: employeeIdParamSchema, body: employeeStatusChangeSchema }),
  changeEmployeeStatus,
);

router.post(
  '/employees/:employeeId/terminate',
  requireHrPermission(HR_PERMISSIONS.terminateEmployee),
  validate({ params: employeeIdParamSchema, body: terminateEmployeeSchema }),
  terminateEmployee,
);

router.get(
  '/departments',
  requireHrPermission(HR_PERMISSIONS.viewDepartment),
  validate({ query: departmentListQuerySchema }),
  listDepartments,
);

router.post(
  '/departments',
  requireHrPermission(HR_PERMISSIONS.createDepartment),
  validate({ body: createDepartmentSchema }),
  createDepartment,
);

router.get(
  '/departments/:departmentId',
  requireHrPermission(HR_PERMISSIONS.viewDepartment),
  validate({ params: departmentIdParamSchema }),
  getDepartmentById,
);

router.patch(
  '/departments/:departmentId',
  requireHrPermission(HR_PERMISSIONS.updateDepartment),
  validate({ params: departmentIdParamSchema, body: updateDepartmentSchema }),
  updateDepartment,
);

router.post(
  '/departments/:departmentId/archive',
  requireHrPermission(HR_PERMISSIONS.archiveDepartment),
  validate({ params: departmentIdParamSchema, body: reasonSchema }),
  archiveDepartment,
);

router.get(
  '/contracts',
  requireHrPermission(HR_PERMISSIONS.viewContract),
  validate({ query: employeeContractListQuerySchema }),
  listContracts,
);

router.post(
  '/contracts',
  requireHrPermission(HR_PERMISSIONS.createContract),
  validate({ body: createEmployeeContractSchema }),
  createContract,
);

router.get(
  '/contracts/:contractId',
  requireHrPermission(HR_PERMISSIONS.viewContract),
  validate({ params: idParam('contractId') }),
  getContractById,
);

router.patch(
  '/contracts/:contractId',
  requireHrPermission(HR_PERMISSIONS.updateContract),
  validate({ params: idParam('contractId'), body: updateEmployeeContractSchema }),
  updateContract,
);

router.post(
  '/contracts/:contractId/activate',
  requireHrPermission(HR_PERMISSIONS.activateContract),
  validate({ params: idParam('contractId') }),
  activateContract,
);

router.post(
  '/contracts/:contractId/terminate',
  requireHrPermission(HR_PERMISSIONS.terminateContract),
  validate({
    params: idParam('contractId'),
    body: reasonSchema.extend({ terminationDate: z.coerce.date() }),
  }),
  terminateContract,
);

router.get(
  '/leave-policies',
  requireHrPermission(HR_PERMISSIONS.viewLeavePolicy),
  listLeavePolicies,
);

router.post(
  '/leave-policies',
  requireHrPermission(HR_PERMISSIONS.manageLeavePolicy),
  validate({ body: leavePolicySchema }),
  createLeavePolicy,
);

router.get(
  '/leave-policies/:leavePolicyId',
  requireHrPermission(HR_PERMISSIONS.viewLeavePolicy),
  validate({ params: idParam('leavePolicyId') }),
  getLeavePolicyById,
);

router.patch(
  '/leave-policies/:leavePolicyId',
  requireHrPermission(HR_PERMISSIONS.manageLeavePolicy),
  validate({ params: idParam('leavePolicyId'), body: leavePolicySchema.partial() }),
  updateLeavePolicy,
);

router.post(
  '/leave/accrue',
  requireHrPermission(HR_PERMISSIONS.accrueLeave),
  validate({ body: leaveAccrualSchema }),
  accrueLeave,
);

router.post(
  '/geofences',
  requireHrPermission(HR_PERMISSIONS.manageGeoFence),
  validate({ body: geoFenceSchema }),
  createGeoFence,
);

router.get(
  '/attendance',
  requireHrPermission(HR_PERMISSIONS.viewAttendance),
  validate({ query: attendanceQuerySchema }),
  listAttendance,
);

router.get(
  '/attendance/summary',
  requireHrPermission(HR_PERMISSIONS.viewAttendance),
  validate({ query: attendanceSummaryQuerySchema }),
  getAttendanceSummary,
);

router.post(
  '/attendance/clock-in',
  requireHrPermission(HR_PERMISSIONS.clockAttendance),
  validate({ body: clockSchema }),
  clockIn,
);

router.post(
  '/attendance/clock-out',
  requireHrPermission(HR_PERMISSIONS.clockAttendance),
  validate({ body: clockSchema }),
  clockOut,
);

router.post(
  '/attendance/manual',
  requireHrPermission(HR_PERMISSIONS.manageAttendance),
  validate({ body: manualAttendanceSchema }),
  createManualAttendance,
);

router.get(
  '/performance',
  requireHrPermission(HR_PERMISSIONS.viewPerformance),
  listPerformanceReviews,
);

router.post(
  '/performance',
  requireHrPermission(HR_PERMISSIONS.managePerformance),
  validate({ body: performanceReviewSchema }),
  createPerformanceReview,
);

router.get(
  '/performance/:reviewId',
  requireHrPermission(HR_PERMISSIONS.viewPerformance),
  validate({ params: idParam('reviewId') }),
  getPerformanceReviewById,
);

router.post(
  '/performance/:reviewId/self-review/start',
  requireHrPermission(HR_PERMISSIONS.submitPerformance),
  validate({ params: idParam('reviewId') }),
  startSelfReview,
);

router.post(
  '/performance/:reviewId/self-review/submit',
  requireHrPermission(HR_PERMISSIONS.submitPerformance),
  validate({ params: idParam('reviewId'), body: performanceSubmitSchema }),
  submitSelfReview,
);

router.post(
  '/performance/:reviewId/manager-review/submit',
  requireHrPermission(HR_PERMISSIONS.managePerformance),
  validate({ params: idParam('reviewId'), body: performanceSubmitSchema }),
  submitManagerReview,
);

router.post(
  '/performance/:reviewId/cancel',
  requireHrPermission(HR_PERMISSIONS.managePerformance),
  validate({ params: idParam('reviewId'), body: reasonSchema }),
  cancelPerformanceReview,
);

router.get(
  '/disciplinary',
  requireHrPermission(HR_PERMISSIONS.viewDisciplinary),
  listDisciplinaryCases,
);

router.post(
  '/disciplinary',
  requireHrPermission(HR_PERMISSIONS.manageDisciplinary),
  validate({ body: disciplinaryCaseSchema }),
  createDisciplinaryCase,
);

router.get(
  '/disciplinary/:caseId',
  requireHrPermission(HR_PERMISSIONS.viewDisciplinary),
  validate({ params: idParam('caseId') }),
  getDisciplinaryCaseById,
);

router.post(
  '/disciplinary/:caseId/hearing',
  requireHrPermission(HR_PERMISSIONS.manageDisciplinary),
  validate({ params: idParam('caseId'), body: hearingSchema }),
  scheduleDisciplinaryHearing,
);

router.post(
  '/disciplinary/:caseId/actions',
  requireHrPermission(HR_PERMISSIONS.manageDisciplinary),
  validate({ params: idParam('caseId'), body: disciplinaryActionSchema }),
  issueDisciplinaryAction,
);

router.post(
  '/disciplinary/:caseId/close',
  requireHrPermission(HR_PERMISSIONS.manageDisciplinary),
  validate({ params: idParam('caseId'), body: disciplinaryCloseSchema }),
  closeDisciplinaryCase,
);

router.post(
  '/disciplinary/:caseId/cancel',
  requireHrPermission(HR_PERMISSIONS.manageDisciplinary),
  validate({ params: idParam('caseId'), body: reasonSchema }),
  cancelDisciplinaryCase,
);

router.get(
  '/documents',
  requireHrPermission(HR_PERMISSIONS.viewDocument),
  listHrDocuments,
);

router.post(
  '/documents',
  requireHrPermission(HR_PERMISSIONS.createDocument),
  validate({ body: hrDocumentSchema }),
  createHrDocument,
);

router.get(
  '/documents/:hrDocumentId',
  requireHrPermission(HR_PERMISSIONS.viewDocument),
  validate({ params: idParam('hrDocumentId') }),
  getHrDocumentById,
);

router.post(
  '/documents/:hrDocumentId/signature-requests',
  requireHrPermission(HR_PERMISSIONS.requestSignature),
  validate({ params: idParam('hrDocumentId'), body: signatureRequestSchema }),
  requestHrDocumentSignature,
);

router.post(
  '/documents/signatures/:signatureId/sign',
  requireHrPermission(HR_PERMISSIONS.signDocument),
  validate({ params: idParam('signatureId'), body: signDocumentSchema }),
  signHrDocument,
);

router.post(
  '/documents/:hrDocumentId/revoke',
  requireHrPermission(HR_PERMISSIONS.revokeDocument),
  validate({ params: idParam('hrDocumentId'), body: reasonSchema }),
  revokeHrDocument,
);

router.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    module: 'hr',
    error: 'HR route not found',
    code: 'HR_ROUTE_NOT_FOUND',
    path: req.originalUrl,
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

export default router;