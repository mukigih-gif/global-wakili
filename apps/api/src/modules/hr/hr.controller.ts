// apps/api/src/modules/hr/hr.controller.ts

import type { Request, Response } from 'express';

import { asyncHandler } from '../../utils/async-handler';

import { employeeService } from './employee.service';
import { departmentService } from './department.service';
import { employeeContractService } from './employee-contract.service';
import { leavePolicyService } from './leave-policy.service';
import { attendanceService } from './attendance.service';
import { performanceService } from './performance.service';
import { disciplinaryService } from './disciplinary.service';
import { hrDocumentService } from './hr-document.service';
import { hrDashboardService } from './hr-dashboard.service';

function getTenantId(req: Request): string {
  const tenantId =
    req.tenantId ??
    (req as any).tenantId ??
    req.body?.tenantId ??
    req.query?.tenantId ??
    req.headers['x-tenant-id'] ??
    (req as any).user?.tenantId;

  if (!tenantId || Array.isArray(tenantId)) {
    throw Object.assign(new Error('Tenant context is required'), {
      statusCode: 400,
      code: 'TENANT_REQUIRED',
    });
  }

  return String(tenantId);
}

function getActorId(req: Request): string {
  const actorId =
    req.user?.id ??
    (req as any).user?.id ??
    req.body?.userId ??
    req.body?.actorId ??
    req.headers['x-user-id'];

  if (!actorId || Array.isArray(actorId)) {
    throw Object.assign(new Error('Authenticated actor is required'), {
      statusCode: 401,
      code: 'ACTOR_REQUIRED',
    });
  }

  return String(actorId);
}

function optionalDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;

  const parsed = new Date(String(value));

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid date value'), {
      statusCode: 422,
      code: 'INVALID_DATE',
    });
  }

  return parsed;
}

function requiredDate(value: unknown): Date {
  const parsed = optionalDate(value);

  if (!parsed) {
    throw Object.assign(new Error('Date value is required'), {
      statusCode: 422,
      code: 'DATE_REQUIRED',
    });
  }

  return parsed;
}

export const getHrDashboard = asyncHandler(async (req: Request, res: Response) => {
  const data = await hrDashboardService.getDashboard({
    tenantId: getTenantId(req),
    branchId: req.query.branchId ? String(req.query.branchId) : null,
    departmentId: req.query.departmentId ? String(req.query.departmentId) : null,
    year: req.query.year ? Number(req.query.year) : undefined,
    month: req.query.month ? Number(req.query.month) : undefined,
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const createEmployee = asyncHandler(async (req: Request, res: Response) => {
  const data = await employeeService.createEmployee({
    ...req.body,
    tenantId: getTenantId(req),
    userId: getActorId(req),
    dateOfBirth: optionalDate(req.body.dateOfBirth),
    startDate: optionalDate(req.body.startDate),
    probationEndDate: optionalDate(req.body.probationEndDate),
  });

  res.status(201).json({ success: true, module: 'hr', data });
});

export const updateEmployee = asyncHandler(async (req: Request, res: Response) => {
  const data = await employeeService.updateEmployee({
    ...req.body,
    tenantId: getTenantId(req),
    userId: getActorId(req),
    employeeId: req.params.employeeId,
    dateOfBirth: req.body.dateOfBirth !== undefined ? optionalDate(req.body.dateOfBirth) : undefined,
    startDate: req.body.startDate !== undefined ? optionalDate(req.body.startDate) : undefined,
    probationEndDate:
      req.body.probationEndDate !== undefined ? optionalDate(req.body.probationEndDate) : undefined,
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const listEmployees = asyncHandler(async (req: Request, res: Response) => {
  const data = await employeeService.listEmployees({
    tenantId: getTenantId(req),
    branchId: req.query.branchId ? String(req.query.branchId) : null,
    departmentId: req.query.departmentId ? String(req.query.departmentId) : null,
    status: req.query.status ? String(req.query.status) : undefined,
    employmentType: req.query.employmentType ? String(req.query.employmentType) : undefined,
    payrollEligible:
      req.query.payrollEligible !== undefined
        ? String(req.query.payrollEligible).toLowerCase() === 'true'
        : undefined,
    search: req.query.search ? String(req.query.search) : undefined,
    take: req.query.take ? Number(req.query.take) : undefined,
    skip: req.query.skip ? Number(req.query.skip) : undefined,
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const getEmployeeById = asyncHandler(async (req: Request, res: Response) => {
  const data = await employeeService.getEmployeeById(getTenantId(req), req.params.employeeId);

  res.status(200).json({ success: true, module: 'hr', data });
});

export const changeEmployeeStatus = asyncHandler(async (req: Request, res: Response) => {
  const data = await employeeService.changeEmployeeStatus({
    tenantId: getTenantId(req),
    userId: getActorId(req),
    employeeId: req.params.employeeId,
    status: req.body.status,
    reason: req.body.reason,
    effectiveDate: optionalDate(req.body.effectiveDate),
    metadata: req.body.metadata,
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const terminateEmployee = asyncHandler(async (req: Request, res: Response) => {
  const data = await employeeService.terminateEmployee({
    tenantId: getTenantId(req),
    userId: getActorId(req),
    employeeId: req.params.employeeId,
    reason: req.body.reason,
    terminationDate: requiredDate(req.body.terminationDate),
    eligibleForRehire: req.body.eligibleForRehire,
    finalPayNotes: req.body.finalPayNotes,
    metadata: req.body.metadata,
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const createDepartment = asyncHandler(async (req: Request, res: Response) => {
  const data = await departmentService.createDepartment({
    ...req.body,
    tenantId: getTenantId(req),
    userId: getActorId(req),
  });

  res.status(201).json({ success: true, module: 'hr', data });
});

export const updateDepartment = asyncHandler(async (req: Request, res: Response) => {
  const data = await departmentService.updateDepartment({
    ...req.body,
    tenantId: getTenantId(req),
    userId: getActorId(req),
    departmentId: req.params.departmentId,
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const listDepartments = asyncHandler(async (req: Request, res: Response) => {
  const data = await departmentService.listDepartments({
    tenantId: getTenantId(req),
    branchId: req.query.branchId ? String(req.query.branchId) : null,
    status: req.query.status ? String(req.query.status) : undefined,
    search: req.query.search ? String(req.query.search) : undefined,
    take: req.query.take ? Number(req.query.take) : undefined,
    skip: req.query.skip ? Number(req.query.skip) : undefined,
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const getDepartmentById = asyncHandler(async (req: Request, res: Response) => {
  const data = await departmentService.getDepartmentById(
    getTenantId(req),
    req.params.departmentId,
  );

  res.status(200).json({ success: true, module: 'hr', data });
});

export const archiveDepartment = asyncHandler(async (req: Request, res: Response) => {
  const data = await departmentService.archiveDepartment({
    tenantId: getTenantId(req),
    departmentId: req.params.departmentId,
    actorId: getActorId(req),
    reason: req.body.reason,
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const createContract = asyncHandler(async (req: Request, res: Response) => {
  const data = await employeeContractService.createContract({
    ...req.body,
    tenantId: getTenantId(req),
    userId: getActorId(req),
    startDate: requiredDate(req.body.startDate),
    endDate: optionalDate(req.body.endDate),
    probationEndDate: optionalDate(req.body.probationEndDate),
    signedByEmployeeAt: optionalDate(req.body.signedByEmployeeAt),
    signedByEmployerAt: optionalDate(req.body.signedByEmployerAt),
  });

  res.status(201).json({ success: true, module: 'hr', data });
});

export const updateContract = asyncHandler(async (req: Request, res: Response) => {
  const data = await employeeContractService.updateContract({
    ...req.body,
    tenantId: getTenantId(req),
    userId: getActorId(req),
    contractId: req.params.contractId,
    startDate: req.body.startDate !== undefined ? optionalDate(req.body.startDate) : undefined,
    endDate: req.body.endDate !== undefined ? optionalDate(req.body.endDate) : undefined,
    probationEndDate:
      req.body.probationEndDate !== undefined ? optionalDate(req.body.probationEndDate) : undefined,
    signedByEmployeeAt:
      req.body.signedByEmployeeAt !== undefined ? optionalDate(req.body.signedByEmployeeAt) : undefined,
    signedByEmployerAt:
      req.body.signedByEmployerAt !== undefined ? optionalDate(req.body.signedByEmployerAt) : undefined,
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const listContracts = asyncHandler(async (req: Request, res: Response) => {
  const data = await employeeContractService.listContracts({
    tenantId: getTenantId(req),
    employeeId: req.query.employeeId ? String(req.query.employeeId) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
    employmentType: req.query.employmentType ? String(req.query.employmentType) : undefined,
    take: req.query.take ? Number(req.query.take) : undefined,
    skip: req.query.skip ? Number(req.query.skip) : undefined,
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const getContractById = asyncHandler(async (req: Request, res: Response) => {
  const data = await employeeContractService.getContractById(
    getTenantId(req),
    req.params.contractId,
  );

  res.status(200).json({ success: true, module: 'hr', data });
});

export const activateContract = asyncHandler(async (req: Request, res: Response) => {
  const data = await employeeContractService.activateContract({
    tenantId: getTenantId(req),
    contractId: req.params.contractId,
    actorId: getActorId(req),
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const terminateContract = asyncHandler(async (req: Request, res: Response) => {
  const data = await employeeContractService.terminateContract({
    tenantId: getTenantId(req),
    contractId: req.params.contractId,
    actorId: getActorId(req),
    reason: req.body.reason,
    terminationDate: requiredDate(req.body.terminationDate),
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const createLeavePolicy = asyncHandler(async (req: Request, res: Response) => {
  const data = await leavePolicyService.createLeavePolicy({
    ...req.body,
    tenantId: getTenantId(req),
    userId: getActorId(req),
    effectiveFrom: requiredDate(req.body.effectiveFrom),
    effectiveTo: optionalDate(req.body.effectiveTo),
  });

  res.status(201).json({ success: true, module: 'hr', data });
});

export const updateLeavePolicy = asyncHandler(async (req: Request, res: Response) => {
  const data = await leavePolicyService.updateLeavePolicy({
    ...req.body,
    tenantId: getTenantId(req),
    userId: getActorId(req),
    leavePolicyId: req.params.leavePolicyId,
    effectiveFrom:
      req.body.effectiveFrom !== undefined ? optionalDate(req.body.effectiveFrom) : undefined,
    effectiveTo: req.body.effectiveTo !== undefined ? optionalDate(req.body.effectiveTo) : undefined,
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const listLeavePolicies = asyncHandler(async (req: Request, res: Response) => {
  const data = await leavePolicyService.listLeavePolicies({
    tenantId: getTenantId(req),
    status: req.query.status ? String(req.query.status) : undefined,
    leaveType: req.query.leaveType ? String(req.query.leaveType) : undefined,
    take: req.query.take ? Number(req.query.take) : undefined,
    skip: req.query.skip ? Number(req.query.skip) : undefined,
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const getLeavePolicyById = asyncHandler(async (req: Request, res: Response) => {
  const data = await leavePolicyService.getLeavePolicyById(
    getTenantId(req),
    req.params.leavePolicyId,
  );

  res.status(200).json({ success: true, module: 'hr', data });
});

export const accrueLeave = asyncHandler(async (req: Request, res: Response) => {
  const data = await leavePolicyService.accrueLeave({
    tenantId: getTenantId(req),
    employeeId: req.body.employeeId,
    leavePolicyId: req.body.leavePolicyId,
    periodStart: requiredDate(req.body.periodStart),
    periodEnd: requiredDate(req.body.periodEnd),
    actorId: getActorId(req),
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const createGeoFence = asyncHandler(async (req: Request, res: Response) => {
  const data = await attendanceService.createGeoFence({
    ...req.body,
    tenantId: getTenantId(req),
    actorId: getActorId(req),
  });

  res.status(201).json({ success: true, module: 'hr', data });
});

export const clockIn = asyncHandler(async (req: Request, res: Response) => {
  const data = await attendanceService.clockIn({
    ...req.body,
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    occurredAt: optionalDate(req.body.occurredAt) ?? undefined,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
  });

  res.status(201).json({ success: true, module: 'hr', data });
});

export const clockOut = asyncHandler(async (req: Request, res: Response) => {
  const data = await attendanceService.clockOut({
    ...req.body,
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    occurredAt: optionalDate(req.body.occurredAt) ?? undefined,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const createManualAttendance = asyncHandler(async (req: Request, res: Response) => {
  const data = await attendanceService.createManualAttendance({
    ...req.body,
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    clockInAt: requiredDate(req.body.clockInAt),
    clockOutAt: optionalDate(req.body.clockOutAt),
  });

  res.status(201).json({ success: true, module: 'hr', data });
});

export const listAttendance = asyncHandler(async (req: Request, res: Response) => {
  const data = await attendanceService.listAttendance({
    tenantId: getTenantId(req),
    employeeId: req.query.employeeId ? String(req.query.employeeId) : undefined,
    branchId: req.query.branchId ? String(req.query.branchId) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
    from: optionalDate(req.query.from) ?? undefined,
    to: optionalDate(req.query.to) ?? undefined,
    take: req.query.take ? Number(req.query.take) : undefined,
    skip: req.query.skip ? Number(req.query.skip) : undefined,
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const getAttendanceSummary = asyncHandler(async (req: Request, res: Response) => {
  const data = await attendanceService.getAttendanceSummary({
    tenantId: getTenantId(req),
    employeeId: req.query.employeeId ? String(req.query.employeeId) : undefined,
    from: requiredDate(req.query.from),
    to: requiredDate(req.query.to),
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const createPerformanceReview = asyncHandler(async (req: Request, res: Response) => {
  const data = await performanceService.createReview({
    ...req.body,
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    periodStart: requiredDate(req.body.periodStart),
    periodEnd: requiredDate(req.body.periodEnd),
    dueDate: optionalDate(req.body.dueDate),
  });

  res.status(201).json({ success: true, module: 'hr', data });
});

export const startSelfReview = asyncHandler(async (req: Request, res: Response) => {
  const data = await performanceService.startSelfReview({
    tenantId: getTenantId(req),
    reviewId: req.params.reviewId,
    actorId: getActorId(req),
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const submitSelfReview = asyncHandler(async (req: Request, res: Response) => {
  const data = await performanceService.submitSelfReview({
    ...req.body,
    tenantId: getTenantId(req),
    reviewId: req.params.reviewId,
    actorId: getActorId(req),
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const submitManagerReview = asyncHandler(async (req: Request, res: Response) => {
  const data = await performanceService.submitManagerReview({
    ...req.body,
    tenantId: getTenantId(req),
    reviewId: req.params.reviewId,
    actorId: getActorId(req),
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const listPerformanceReviews = asyncHandler(async (req: Request, res: Response) => {
  const data = await performanceService.listReviews({
    tenantId: getTenantId(req),
    employeeId: req.query.employeeId ? String(req.query.employeeId) : undefined,
    reviewerId: req.query.reviewerId ? String(req.query.reviewerId) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
    year: req.query.year ? Number(req.query.year) : undefined,
    take: req.query.take ? Number(req.query.take) : undefined,
    skip: req.query.skip ? Number(req.query.skip) : undefined,
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const getPerformanceReviewById = asyncHandler(async (req: Request, res: Response) => {
  const data = await performanceService.getReviewById(getTenantId(req), req.params.reviewId);

  res.status(200).json({ success: true, module: 'hr', data });
});

export const cancelPerformanceReview = asyncHandler(async (req: Request, res: Response) => {
  const data = await performanceService.cancelReview({
    tenantId: getTenantId(req),
    reviewId: req.params.reviewId,
    actorId: getActorId(req),
    reason: req.body.reason,
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const createDisciplinaryCase = asyncHandler(async (req: Request, res: Response) => {
  const data = await disciplinaryService.createCase({
    ...req.body,
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    incidentDate: requiredDate(req.body.incidentDate),
  });

  res.status(201).json({ success: true, module: 'hr', data });
});

export const scheduleDisciplinaryHearing = asyncHandler(async (req: Request, res: Response) => {
  const data = await disciplinaryService.scheduleHearing({
    ...req.body,
    tenantId: getTenantId(req),
    caseId: req.params.caseId,
    actorId: getActorId(req),
    hearingAt: requiredDate(req.body.hearingAt),
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const issueDisciplinaryAction = asyncHandler(async (req: Request, res: Response) => {
  const data = await disciplinaryService.issueAction({
    ...req.body,
    tenantId: getTenantId(req),
    caseId: req.params.caseId,
    actorId: getActorId(req),
    actionDate: optionalDate(req.body.actionDate) ?? undefined,
    effectiveFrom: optionalDate(req.body.effectiveFrom),
    effectiveTo: optionalDate(req.body.effectiveTo),
  });

  res.status(201).json({ success: true, module: 'hr', data });
});

export const closeDisciplinaryCase = asyncHandler(async (req: Request, res: Response) => {
  const data = await disciplinaryService.closeCase({
    tenantId: getTenantId(req),
    caseId: req.params.caseId,
    actorId: getActorId(req),
    resolution: req.body.resolution,
    notes: req.body.notes,
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const cancelDisciplinaryCase = asyncHandler(async (req: Request, res: Response) => {
  const data = await disciplinaryService.cancelCase({
    tenantId: getTenantId(req),
    caseId: req.params.caseId,
    actorId: getActorId(req),
    reason: req.body.reason,
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const listDisciplinaryCases = asyncHandler(async (req: Request, res: Response) => {
  const data = await disciplinaryService.listCases({
    tenantId: getTenantId(req),
    employeeId: req.query.employeeId ? String(req.query.employeeId) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
    severity: req.query.severity ? String(req.query.severity) : undefined,
    from: optionalDate(req.query.from) ?? undefined,
    to: optionalDate(req.query.to) ?? undefined,
    take: req.query.take ? Number(req.query.take) : undefined,
    skip: req.query.skip ? Number(req.query.skip) : undefined,
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const getDisciplinaryCaseById = asyncHandler(async (req: Request, res: Response) => {
  const data = await disciplinaryService.getCaseById(getTenantId(req), req.params.caseId);

  res.status(200).json({ success: true, module: 'hr', data });
});

export const createHrDocument = asyncHandler(async (req: Request, res: Response) => {
  const data = await hrDocumentService.createDocument({
    ...req.body,
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    expiresAt: optionalDate(req.body.expiresAt),
  });

  res.status(201).json({ success: true, module: 'hr', data });
});

export const requestHrDocumentSignature = asyncHandler(async (req: Request, res: Response) => {
  const data = await hrDocumentService.requestSignature({
    ...req.body,
    tenantId: getTenantId(req),
    hrDocumentId: req.params.hrDocumentId,
    actorId: getActorId(req),
    expiresAt: optionalDate(req.body.expiresAt),
  });

  res.status(201).json({ success: true, module: 'hr', data });
});

export const signHrDocument = asyncHandler(async (req: Request, res: Response) => {
  const data = await hrDocumentService.signDocument({
    ...req.body,
    tenantId: getTenantId(req),
    signatureId: req.params.signatureId,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const revokeHrDocument = asyncHandler(async (req: Request, res: Response) => {
  const data = await hrDocumentService.revokeDocument({
    tenantId: getTenantId(req),
    hrDocumentId: req.params.hrDocumentId,
    actorId: getActorId(req),
    reason: req.body.reason,
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const listHrDocuments = asyncHandler(async (req: Request, res: Response) => {
  const data = await hrDocumentService.listDocuments({
    tenantId: getTenantId(req),
    employeeId: req.query.employeeId ? String(req.query.employeeId) : undefined,
    category: req.query.category ? String(req.query.category) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
    requiresSignature:
      req.query.requiresSignature !== undefined
        ? String(req.query.requiresSignature).toLowerCase() === 'true'
        : undefined,
    take: req.query.take ? Number(req.query.take) : undefined,
    skip: req.query.skip ? Number(req.query.skip) : undefined,
  });

  res.status(200).json({ success: true, module: 'hr', data });
});

export const getHrDocumentById = asyncHandler(async (req: Request, res: Response) => {
  const data = await hrDocumentService.getDocumentById(
    getTenantId(req),
    req.params.hrDocumentId,
  );

  res.status(200).json({ success: true, module: 'hr', data });
});