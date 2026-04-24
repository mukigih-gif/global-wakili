// apps/api/src/modules/payroll/payroll.controller.ts

import type { Request, Response } from 'express';

import { asyncHandler } from '../../utils/async-handler';
import { payrollBatchService as batchService } from './PayrollBatchService';
import { payrollService } from './PayrollService';
import { payrollApprovalService as approvalService } from './PayrollApprovalService';
import { payrollRecordService as recordService } from './payroll-record.service';
import { payslipService } from './PayslipService';
import { statutoryFilingService as filingService } from './statutory-filing.service';
import { payrollPostingService as postingService } from './PayrollPostingService';
import { payrollDashboardService as dashboardService } from './payroll.dashboard';
import { p9ReportService as p9Service } from './P9ReportService';
import { p10ReportService as p10Service } from './P10ReportService';

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

function asDate(value: unknown): Date | undefined {
  if (!value) return undefined;
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


export const getPayrollDashboard = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getDashboard({
    tenantId: getTenantId(req),
    year: req.query.year ? Number(req.query.year) : undefined,
    month: req.query.month ? Number(req.query.month) : undefined,
    branchId: req.query.branchId ? String(req.query.branchId) : null,
    departmentId: req.query.departmentId ? String(req.query.departmentId) : null,
  });

  res.status(200).json({
    success: true,
    module: 'payroll',
    data,
  });
});

export const createPayrollBatch = asyncHandler(async (req: Request, res: Response) => {
  const data = await batchService.createBatch({
    ...req.body,
    tenantId: getTenantId(req),
    userId: getActorId(req),
    periodStart: new Date(req.body.periodStart),
    periodEnd: new Date(req.body.periodEnd),
    paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : null,
  });

  res.status(201).json({
    success: true,
    module: 'payroll',
    data,
  });
});

export const createPayrollBatchAndRecords = asyncHandler(async (req: Request, res: Response) => {
  const data = await batchService.createBatchAndRecords({
    ...req.body,
    tenantId: getTenantId(req),
    userId: getActorId(req),
    periodStart: new Date(req.body.periodStart),
    periodEnd: new Date(req.body.periodEnd),
    paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : null,
  });

  res.status(201).json({
    success: true,
    module: 'payroll',
    data,
  });
});

export const listPayrollBatches = asyncHandler(async (req: Request, res: Response) => {
  const data = await batchService.listBatches({
    tenantId: getTenantId(req),
    status: req.query.status ? String(req.query.status) : undefined,
    year: req.query.year ? Number(req.query.year) : undefined,
    month: req.query.month ? Number(req.query.month) : undefined,
    branchId: req.query.branchId ? String(req.query.branchId) : undefined,
    departmentId: req.query.departmentId ? String(req.query.departmentId) : undefined,
    take: req.query.take ? Number(req.query.take) : undefined,
    skip: req.query.skip ? Number(req.query.skip) : undefined,
  });

  res.status(200).json({
    success: true,
    module: 'payroll',
    data,
  });
});

export const getPayrollBatchById = asyncHandler(async (req: Request, res: Response) => {
  const data = await batchService.getBatchById(
    getTenantId(req),
    req.params.payrollBatchId,
  );

  res.status(200).json({
    success: true,
    module: 'payroll',
    data,
  });
});

export const submitPayrollBatch = asyncHandler(async (req: Request, res: Response) => {
  const data = await approvalService.submitForApproval({
    tenantId: getTenantId(req),
    payrollBatchId: req.params.payrollBatchId,
    actorId: getActorId(req),
    reason: req.body?.reason ?? null,
  });

  res.status(200).json({
    success: true,
    module: 'payroll',
    data,
  });
});

export const approvePayrollBatch = asyncHandler(async (req: Request, res: Response) => {
  const data = await approvalService.approveBatch({
    tenantId: getTenantId(req),
    payrollBatchId: req.params.payrollBatchId,
    actorId: getActorId(req),
    reason: req.body?.reason ?? null,
  });

  res.status(200).json({
    success: true,
    module: 'payroll',
    data,
  });
});

export const rejectPayrollBatch = asyncHandler(async (req: Request, res: Response) => {
  const data = await approvalService.rejectBatch({
    tenantId: getTenantId(req),
    payrollBatchId: req.params.payrollBatchId,
    actorId: getActorId(req),
    reason: req.body?.reason,
  });

  res.status(200).json({
    success: true,
    module: 'payroll',
    data,
  });
});

export const cancelPayrollBatch = asyncHandler(async (req: Request, res: Response) => {
  const data = await approvalService.cancelBatch({
    tenantId: getTenantId(req),
    payrollBatchId: req.params.payrollBatchId,
    actorId: getActorId(req),
    reason: req.body?.reason,
  });

  res.status(200).json({
    success: true,
    module: 'payroll',
    data,
  });
});

export const postPayrollBatch = asyncHandler(async (req: Request, res: Response) => {
  const data = await postingService.postPayrollBatch({
    tenantId: getTenantId(req),
    payrollBatchId: req.params.payrollBatchId,
    postedById: getActorId(req),
    postingDate: asDate(req.body?.postingDate),
  });

  res.status(200).json({
    success: true,
    module: 'payroll',
    data,
  });
});

export const calculatePayroll = asyncHandler(async (req: Request, res: Response) => {
  const data = payrollService.calculatePayroll({
    ...req.body,
    tenantId: getTenantId(req),
  });

  res.status(200).json({
    success: true,
    module: 'payroll',
    data,
  });
});

export const createPayrollRecord = asyncHandler(async (req: Request, res: Response) => {
  const data = await recordService.createRecord({
    ...req.body,
    tenantId: getTenantId(req),
    createdById: getActorId(req),
    periodStart: new Date(req.body.periodStart),
    periodEnd: new Date(req.body.periodEnd),
    paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : null,
  });

  res.status(201).json({
    success: true,
    module: 'payroll',
    data,
  });
});

export const listPayrollRecords = asyncHandler(async (req: Request, res: Response) => {
  const data = await recordService.listRecords({
    tenantId: getTenantId(req),
    payrollBatchId: req.query.payrollBatchId ? String(req.query.payrollBatchId) : undefined,
    employeeId: req.query.employeeId ? String(req.query.employeeId) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
    year: req.query.year ? Number(req.query.year) : undefined,
    month: req.query.month ? Number(req.query.month) : undefined,
    take: req.query.take ? Number(req.query.take) : undefined,
    skip: req.query.skip ? Number(req.query.skip) : undefined,
  });

  res.status(200).json({
    success: true,
    module: 'payroll',
    data,
  });
});

export const getPayrollRecordById = asyncHandler(async (req: Request, res: Response) => {
  const data = await recordService.getRecordById(
    getTenantId(req),
    req.params.payrollRecordId,
  );

  res.status(200).json({
    success: true,
    module: 'payroll',
    data,
  });
});

export const recalculatePayrollRecord = asyncHandler(async (req: Request, res: Response) => {
  const data = await recordService.recalculateRecord({
    tenantId: getTenantId(req),
    payrollRecordId: req.params.payrollRecordId,
    actorId: getActorId(req),
    overrides: req.body ?? {},
  });

  res.status(200).json({
    success: true,
    module: 'payroll',
    data,
  });
});

export const cancelPayrollRecord = asyncHandler(async (req: Request, res: Response) => {
  const data = await recordService.cancelRecord({
    tenantId: getTenantId(req),
    payrollRecordId: req.params.payrollRecordId,
    actorId: getActorId(req),
    reason: req.body?.reason,
  });

  res.status(200).json({
    success: true,
    module: 'payroll',
    data,
  });
});

export const generatePayslip = asyncHandler(async (req: Request, res: Response) => {
  const data = await payslipService.generatePayslip({
    tenantId: getTenantId(req),
    payrollRecordId: req.params.payrollRecordId,
    generatedById: getActorId(req),
    publish: req.body?.publish === true,
  });

  res.status(201).json({
    success: true,
    module: 'payroll',
    data,
  });
});

export const publishPayslip = asyncHandler(async (req: Request, res: Response) => {
  const data = await payslipService.publishPayslip({
    tenantId: getTenantId(req),
    payslipId: req.params.payslipId,
    actorId: getActorId(req),
  });

  res.status(200).json({
    success: true,
    module: 'payroll',
    data,
  });
});

export const revokePayslip = asyncHandler(async (req: Request, res: Response) => {
  const data = await payslipService.revokePayslip({
    tenantId: getTenantId(req),
    payslipId: req.params.payslipId,
    actorId: getActorId(req),
    reason: req.body?.reason,
  });

  res.status(200).json({
    success: true,
    module: 'payroll',
    data,
  });
});

export const getPayslipById = asyncHandler(async (req: Request, res: Response) => {
  const data = await payslipService.getPayslipById(
    getTenantId(req),
    req.params.payslipId,
  );

  res.status(200).json({
    success: true,
    module: 'payroll',
    data,
  });
});

export const listPayslips = asyncHandler(async (req: Request, res: Response) => {
  const data = await payslipService.listPayslips({
    tenantId: getTenantId(req),
    employeeId: req.query.employeeId ? String(req.query.employeeId) : undefined,
    payrollBatchId: req.query.payrollBatchId ? String(req.query.payrollBatchId) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
    take: req.query.take ? Number(req.query.take) : undefined,
    skip: req.query.skip ? Number(req.query.skip) : undefined,
  });

  res.status(200).json({
    success: true,
    module: 'payroll',
    data,
  });
});

export const generateStatutorySummary = asyncHandler(async (req: Request, res: Response) => {
  const data = await filingService.generateSummary({
    tenantId: getTenantId(req),
    year: Number(req.query.year ?? req.body?.year),
    month: req.query.month || req.body?.month ? Number(req.query.month ?? req.body?.month) : undefined,
    payrollBatchId: req.query.payrollBatchId
      ? String(req.query.payrollBatchId)
      : req.body?.payrollBatchId,
    kind: req.query.kind ? String(req.query.kind) as any : req.body?.kind,
  });

  res.status(200).json({
    success: true,
    module: 'payroll',
    data,
  });
});

export const createStatutoryFiling = asyncHandler(async (req: Request, res: Response) => {
  const data = await filingService.createFilingRecord({
    tenantId: getTenantId(req),
    year: Number(req.body.year),
    month: req.body.month ? Number(req.body.month) : undefined,
    payrollBatchId: req.body.payrollBatchId,
    kind: req.body.kind,
    createdById: getActorId(req),
    metadata: req.body.metadata,
  });

  res.status(201).json({
    success: true,
    module: 'payroll',
    data,
  });
});

export const markStatutoryFiled = asyncHandler(async (req: Request, res: Response) => {
  const data = await filingService.markFiled({
    tenantId: getTenantId(req),
    filingId: req.params.filingId,
    filedById: getActorId(req),
    filingReference: req.body?.filingReference ?? null,
    filedAt: req.body?.filedAt ? new Date(req.body.filedAt) : undefined,
  });

  res.status(200).json({
    success: true,
    module: 'payroll',
    data,
  });
});

export const generateP9Report = asyncHandler(async (req: Request, res: Response) => {
  const data = await p9Service.generateEmployeeP9({
    tenantId: getTenantId(req),
    employeeId: req.params.employeeId,
    year: Number(req.query.year ?? req.body?.year),
  });

  res.status(200).json({
    success: true,
    module: 'payroll',
    reportType: 'P9',
    data,
  });
});

export const generateP10Report = asyncHandler(async (req: Request, res: Response) => {
  const data = await p10Service.generateP10({
    tenantId: getTenantId(req),
    year: Number(req.query.year ?? req.body?.year),
    month: req.query.month || req.body?.month ? Number(req.query.month ?? req.body?.month) : undefined,
    payrollBatchId: req.query.payrollBatchId
      ? String(req.query.payrollBatchId)
      : req.body?.payrollBatchId,
  });

  res.status(200).json({
    success: true,
    module: 'payroll',
    reportType: 'P10',
    data,
  });
});