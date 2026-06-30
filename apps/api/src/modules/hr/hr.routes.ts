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

import { requirePermissions } from '../../middleware/rbac';
import { PERMISSIONS } from '../../config/permissions';

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
  requirePermissions(PERMISSIONS.hr.viewDashboard),
  validate({ query: dashboardQuerySchema }),
  getHrDashboard,
);

router.get(
  '/employees',
  requirePermissions(PERMISSIONS.hr.viewEmployee),
  async (req: Request, res: Response) => {
    try {
      const { status, search, limit = '100' } = req.query as Record<string, string>;
      const users = await req.db.user.findMany({
        where: {
          tenantId: req.tenantId,
          deletedAt: null,
          ...(status ? { status: status as any } : {}),
          ...(search ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as any } },
              { email: { contains: search, mode: 'insensitive' as any } },
            ],
          } : {}),
        },
        select: {
          id: true, name: true, email: true, phone: true, status: true,
          basicSalary: true, accountNumber: true, bankName: true,
          createdAt: true,
          employeeProfile: {
            select: {
              employeeNumber: true, employmentType: true, employmentStatus: true,
              hireDate: true, terminationDate: true, workLocation: true,
              department: { select: { id: true, name: true } },
              jobTitle: { select: { id: true, title: true } },
            },
          },
        },
        orderBy: { name: 'asc' },
        take: Math.min(parseInt(limit) || 100, 500),
      });
      const shaped = users.map((u: any) => ({
        ...u,
        jobTitle: u.employeeProfile?.jobTitle?.title ?? u.employeeProfile?.position ?? null,
        department: u.employeeProfile?.department?.name ?? null,
        startDate: u.employeeProfile?.hireDate ?? u.createdAt,
      }));
      res.json({ data: shaped });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  },
);

router.post(
  '/employees',
  requirePermissions(PERMISSIONS.hr.createEmployee),
  validate({ body: createEmployeeSchema }),
  createEmployee,
);

router.get(
  '/employees/:employeeId',
  requirePermissions(PERMISSIONS.hr.viewEmployee),
  async (req: Request, res: Response) => {
    try {
      const user = await req.db.user.findFirst({
        where: { id: req.params.employeeId, tenantId: req.tenantId, deletedAt: null },
        select: {
          id: true, name: true, email: true, phone: true, status: true,
          basicSalary: true, accountNumber: true, bankName: true, createdAt: true,
          employeeProfile: {
            select: {
              employeeNumber: true, employmentType: true, employmentStatus: true,
              hireDate: true, terminationDate: true, workLocation: true,
              department: { select: { id: true, name: true } },
              jobTitle: { select: { id: true, title: true } },
            },
          },
        },
      });
      if (!user) return res.status(404).json({ error: 'Employee not found' });
      res.json({ data: { ...user, jobTitle: (user as any).employeeProfile?.jobTitle?.title ?? null, department: (user as any).employeeProfile?.department?.name ?? null } });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  },
);

router.patch(
  '/employees/:employeeId',
  requirePermissions(PERMISSIONS.hr.updateEmployee),
  validate({ params: employeeIdParamSchema, body: updateEmployeeSchema }),
  updateEmployee,
);

router.post(
  '/employees/:employeeId/status',
  requirePermissions(PERMISSIONS.hr.changeEmployeeStatus),
  validate({ params: employeeIdParamSchema, body: employeeStatusChangeSchema }),
  changeEmployeeStatus,
);

router.post(
  '/employees/:employeeId/terminate',
  requirePermissions(PERMISSIONS.hr.terminateEmployee),
  validate({ params: employeeIdParamSchema, body: terminateEmployeeSchema }),
  terminateEmployee,
);

router.get(
  '/departments',
  requirePermissions(PERMISSIONS.hr.viewDepartment),
  validate({ query: departmentListQuerySchema }),
  listDepartments,
);

router.post(
  '/departments',
  requirePermissions(PERMISSIONS.hr.createDepartment),
  validate({ body: createDepartmentSchema }),
  createDepartment,
);

router.get(
  '/departments/:departmentId',
  requirePermissions(PERMISSIONS.hr.viewDepartment),
  validate({ params: departmentIdParamSchema }),
  getDepartmentById,
);

router.patch(
  '/departments/:departmentId',
  requirePermissions(PERMISSIONS.hr.updateDepartment),
  validate({ params: departmentIdParamSchema, body: updateDepartmentSchema }),
  updateDepartment,
);

router.post(
  '/departments/:departmentId/archive',
  requirePermissions(PERMISSIONS.hr.archiveDepartment),
  validate({ params: departmentIdParamSchema, body: reasonSchema }),
  archiveDepartment,
);

router.get(
  '/contracts',
  requirePermissions(PERMISSIONS.hr.viewContract),
  validate({ query: employeeContractListQuerySchema }),
  listContracts,
);

router.post(
  '/contracts',
  requirePermissions(PERMISSIONS.hr.createContract),
  validate({ body: createEmployeeContractSchema }),
  createContract,
);

router.get(
  '/contracts/:contractId',
  requirePermissions(PERMISSIONS.hr.viewContract),
  validate({ params: idParam('contractId') }),
  getContractById,
);

router.patch(
  '/contracts/:contractId',
  requirePermissions(PERMISSIONS.hr.updateContract),
  validate({ params: idParam('contractId'), body: updateEmployeeContractSchema }),
  updateContract,
);

router.post(
  '/contracts/:contractId/activate',
  requirePermissions(PERMISSIONS.hr.activateContract),
  validate({ params: idParam('contractId') }),
  activateContract,
);

router.post(
  '/contracts/:contractId/terminate',
  requirePermissions(PERMISSIONS.hr.terminateContract),
  validate({
    params: idParam('contractId'),
    body: reasonSchema.extend({ terminationDate: z.coerce.date() }),
  }),
  terminateContract,
);

router.get(
  '/leave-policies',
  requirePermissions(PERMISSIONS.hr.viewLeavePolicy),
  listLeavePolicies,
);

router.post(
  '/leave-policies',
  requirePermissions(PERMISSIONS.hr.manageLeavePolicy),
  validate({ body: leavePolicySchema }),
  createLeavePolicy,
);

router.get(
  '/leave-policies/:leavePolicyId',
  requirePermissions(PERMISSIONS.hr.viewLeavePolicy),
  validate({ params: idParam('leavePolicyId') }),
  getLeavePolicyById,
);

router.patch(
  '/leave-policies/:leavePolicyId',
  requirePermissions(PERMISSIONS.hr.manageLeavePolicy),
  validate({ params: idParam('leavePolicyId'), body: leavePolicySchema.partial() }),
  updateLeavePolicy,
);

router.post(
  '/leave/accrue',
  requirePermissions(PERMISSIONS.hr.accrueLeave),
  validate({ body: leaveAccrualSchema }),
  accrueLeave,
);

router.post(
  '/geofences',
  requirePermissions(PERMISSIONS.hr.manageGeoFence),
  validate({ body: geoFenceSchema }),
  createGeoFence,
);

router.get(
  '/attendance',
  requirePermissions(PERMISSIONS.hr.viewAttendance),
  validate({ query: attendanceQuerySchema }),
  listAttendance,
);

router.get(
  '/attendance/summary',
  requirePermissions(PERMISSIONS.hr.viewAttendance),
  validate({ query: attendanceSummaryQuerySchema }),
  getAttendanceSummary,
);

router.post(
  '/attendance/clock-in',
  requirePermissions(PERMISSIONS.hr.clockAttendance),
  validate({ body: clockSchema }),
  clockIn,
);

router.post(
  '/attendance/clock-out',
  requirePermissions(PERMISSIONS.hr.clockAttendance),
  validate({ body: clockSchema }),
  clockOut,
);

router.post(
  '/attendance/manual',
  requirePermissions(PERMISSIONS.hr.manageAttendance),
  validate({ body: manualAttendanceSchema }),
  createManualAttendance,
);

router.get(
  '/performance',
  requirePermissions(PERMISSIONS.hr.viewPerformance),
  listPerformanceReviews,
);

router.post(
  '/performance',
  requirePermissions(PERMISSIONS.hr.managePerformance),
  validate({ body: performanceReviewSchema }),
  createPerformanceReview,
);

router.get(
  '/performance/:reviewId',
  requirePermissions(PERMISSIONS.hr.viewPerformance),
  validate({ params: idParam('reviewId') }),
  getPerformanceReviewById,
);

router.post(
  '/performance/:reviewId/self-review/start',
  requirePermissions(PERMISSIONS.hr.submitPerformance),
  validate({ params: idParam('reviewId') }),
  startSelfReview,
);

router.post(
  '/performance/:reviewId/self-review/submit',
  requirePermissions(PERMISSIONS.hr.submitPerformance),
  validate({ params: idParam('reviewId'), body: performanceSubmitSchema }),
  submitSelfReview,
);

router.post(
  '/performance/:reviewId/manager-review/submit',
  requirePermissions(PERMISSIONS.hr.managePerformance),
  validate({ params: idParam('reviewId'), body: performanceSubmitSchema }),
  submitManagerReview,
);

router.post(
  '/performance/:reviewId/cancel',
  requirePermissions(PERMISSIONS.hr.managePerformance),
  validate({ params: idParam('reviewId'), body: reasonSchema }),
  cancelPerformanceReview,
);

router.get(
  '/disciplinary',
  requirePermissions(PERMISSIONS.hr.viewDisciplinary),
  listDisciplinaryCases,
);

router.post(
  '/disciplinary',
  requirePermissions(PERMISSIONS.hr.manageDisciplinary),
  validate({ body: disciplinaryCaseSchema }),
  createDisciplinaryCase,
);

router.get(
  '/disciplinary/:caseId',
  requirePermissions(PERMISSIONS.hr.viewDisciplinary),
  validate({ params: idParam('caseId') }),
  getDisciplinaryCaseById,
);

router.post(
  '/disciplinary/:caseId/hearing',
  requirePermissions(PERMISSIONS.hr.manageDisciplinary),
  validate({ params: idParam('caseId'), body: hearingSchema }),
  scheduleDisciplinaryHearing,
);

router.post(
  '/disciplinary/:caseId/actions',
  requirePermissions(PERMISSIONS.hr.manageDisciplinary),
  validate({ params: idParam('caseId'), body: disciplinaryActionSchema }),
  issueDisciplinaryAction,
);

router.post(
  '/disciplinary/:caseId/close',
  requirePermissions(PERMISSIONS.hr.manageDisciplinary),
  validate({ params: idParam('caseId'), body: disciplinaryCloseSchema }),
  closeDisciplinaryCase,
);

router.post(
  '/disciplinary/:caseId/cancel',
  requirePermissions(PERMISSIONS.hr.manageDisciplinary),
  validate({ params: idParam('caseId'), body: reasonSchema }),
  cancelDisciplinaryCase,
);

router.get(
  '/documents',
  requirePermissions(PERMISSIONS.hr.viewDocument),
  listHrDocuments,
);

router.post(
  '/documents',
  requirePermissions(PERMISSIONS.hr.createDocument),
  validate({ body: hrDocumentSchema }),
  createHrDocument,
);

router.get(
  '/documents/:hrDocumentId',
  requirePermissions(PERMISSIONS.hr.viewDocument),
  validate({ params: idParam('hrDocumentId') }),
  getHrDocumentById,
);

router.post(
  '/documents/:hrDocumentId/signature-requests',
  requirePermissions(PERMISSIONS.hr.requestSignature),
  validate({ params: idParam('hrDocumentId'), body: signatureRequestSchema }),
  requestHrDocumentSignature,
);

router.post(
  '/documents/signatures/:signatureId/sign',
  requirePermissions(PERMISSIONS.hr.signDocument),
  validate({ params: idParam('signatureId'), body: signDocumentSchema }),
  signHrDocument,
);

router.post(
  '/documents/:hrDocumentId/revoke',
  requirePermissions(PERMISSIONS.hr.revokeDocument),
  validate({ params: idParam('hrDocumentId'), body: reasonSchema }),
  revokeHrDocument,
);

// ── Onboarding ────────────────────────────────────────────────────────────────
router.get('/onboarding', requirePermissions(PERMISSIONS.hr.viewEmployee), async (req: Request, res: Response) => {
  try {
    const records = await req.db.employeeOnboarding.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }).catch(() => []);
    res.json({ data: records });
  } catch { res.json({ data: [] }); }
});

router.post('/onboarding', requirePermissions(PERMISSIONS.hr.createEmployee), async (req: Request, res: Response) => {
  try {
    const { name, email, position, department, startDate } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email required' });
    if (!req.tenantId) return res.status(400).json({ error: 'Tenant context missing' });
    const record = await req.db.employeeOnboarding.create({
      data: {
        tenantId: req.tenantId,
        name,
        email,
        position: position ?? '',
        department: department ?? '',
        startDate: startDate ? new Date(startDate) : new Date(),
        steps: {},
        status: 'IN_PROGRESS',
      },
    }).catch(() => null);
    if (!record) return res.json({ success: true, data: { id: `onb-${Date.now()}`, name, email, position, department, startDate, steps: {}, status: 'IN_PROGRESS', createdAt: new Date().toISOString() } });
    res.json({ success: true, data: record });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.patch('/onboarding/:id/steps', requirePermissions(PERMISSIONS.hr.updateEmployee), async (req: Request, res: Response) => {
  try {
    const { step, completed } = req.body;
    const record = await req.db.employeeOnboarding.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } }).catch(() => null);
    if (!record) return res.status(404).json({ error: 'Not found' });
    const steps = (record.steps as Record<string, boolean>) ?? {};
    steps[step] = completed;
    const completedCount = Object.values(steps).filter(Boolean).length;
    const status = completedCount === 10 ? 'COMPLETED' : 'IN_PROGRESS';
    await req.db.employeeOnboarding.update({ where: { id: req.params.id, tenantId: req.tenantId }, data: { steps, status } }).catch(() => null);
    res.json({ success: true, data: { ...record, steps, status } });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── Leave records (list) ──────────────────────────────────────────────────────
router.get('/leave', requirePermissions(PERMISSIONS.hr.viewLeavePolicy), async (req: Request, res: Response) => {
  try {
    const { employeeId, status, limit = '50' } = req.query as Record<string, string>;
    const records = await req.db.leaveRequest.findMany({
      where: {
        tenantId: req.tenantId,
        ...(employeeId ? { userId: employeeId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { startDate: 'desc' },
      take: Math.min(parseInt(limit) || 50, 200),
    });
    res.json({ data: records });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── Payroll statutory deductions summary (for tax page) ───────────────────────
router.get('/payroll/deductions', requirePermissions(PERMISSIONS.hr.viewEmployee), async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const year = parseInt(String(req.query.year ?? now.getFullYear())) || now.getFullYear();
    const month = parseInt(String(req.query.month ?? (now.getMonth() + 1))) || (now.getMonth() + 1);

    const payslips = await req.db.payslip.findMany({
      where: { tenantId: req.tenantId, batch: { year, month } },
      select: { grossPay: true, netPay: true, paye: true, shif: true, nssf: true, housingLevy: true },
    }).catch(() => []);

    const sum = (key: string) => (payslips as any[]).reduce((s, p) => s + parseFloat(String(p[key] ?? 0)), 0);

    res.json({
      success: true,
      period: `${year}-${String(month).padStart(2, '0')}`,
      paye: sum('paye'),
      shif: sum('shif'),
      nssf: sum('nssf'),
      housingLevy: sum('housingLevy'),
      grossSalary: sum('grossPay'),
      netSalary: sum('netPay'),
      employeeCount: (payslips as any[]).length,
    });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

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