// apps/api/src/modules/payroll/payroll.routes.ts

import { Router, type Request, type Response } from 'express';

import { validate } from '../../middleware/validate';

import {
  createPayrollBatchSchema,
  createPayrollRecordSchema,
  payrollApprovalSchema,
  payrollBatchIdParamSchema,
  payrollBatchListQuerySchema,
  payrollCalculationSchema,
  payrollRecordListQuerySchema,
} from './payroll.validators';

import { requirePermissions } from '../../middleware/rbac';
import { PERMISSIONS } from '../../config/permissions';

import { bindPlatformModuleEnforcement } from '../../middleware/platform-access.middleware';
import { platformFeatureFlag } from '../../middleware/platform-feature-flag.middleware';
import { PLATFORM_FEATURE_KEYS } from '../platform/PlatformFeatureKeys';
import {
  approvePayrollBatch,
  calculatePayroll,
  cancelPayrollBatch,
  cancelPayrollRecord,
  createPayrollBatch,
  createPayrollBatchAndRecords,
  createPayrollRecord,
  createStatutoryFiling,
  generateP9Report,
  generateP10Report,
  generatePayslip,
  generateStatutorySummary,
  getPayrollBatchById,
  getPayrollDashboard,
  getPayrollRecordById,
  getPayslipById,
  listPayrollBatches,
  listPayrollRecords,
  listPayslips,
  markStatutoryFiled,
  postPayrollBatch,
  publishPayslip,
  recalculatePayrollRecord,
  rejectPayrollBatch,
  revokePayslip,
  submitPayrollBatch,
} from './payroll.controller';

const router = Router();

bindPlatformModuleEnforcement(router, {
  moduleKey: 'payroll',
  metricType: 'PAYROLL_BATCHES',
});

const payrollStatutoryEngineFeature = platformFeatureFlag(
  PLATFORM_FEATURE_KEYS.PAYROLL_STATUTORY_ENGINE,
  'payroll',
);

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'payroll',
    status: 'mounted',
    service: 'global-wakili-api',
    lifecycle: 'production-payroll-routes-mounted',
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

router.get(
  '/dashboard',
  requirePermissions(PERMISSIONS.payroll.viewDashboard),
  getPayrollDashboard,
);

router.post(
  '/calculate',
  requirePermissions(PERMISSIONS.payroll.createRecord),
  validate({ body: payrollCalculationSchema }),
  calculatePayroll,
);

router.get(
  '/batches',
  requirePermissions(PERMISSIONS.payroll.viewBatch),
  validate({ query: payrollBatchListQuerySchema }),
  listPayrollBatches,
);

router.post(
  '/batches',
  requirePermissions(PERMISSIONS.payroll.createBatch),
  validate({ body: createPayrollBatchSchema }),
  createPayrollBatch,
);

router.post(
  '/batches/with-records',
  requirePermissions(PERMISSIONS.payroll.createBatch),
  validate({ body: createPayrollBatchSchema }),
  createPayrollBatchAndRecords,
);

router.get(
  '/batches/:payrollBatchId',
  requirePermissions(PERMISSIONS.payroll.viewBatch),
  validate({ params: payrollBatchIdParamSchema }),
  getPayrollBatchById,
);

router.post(
  '/batches/:payrollBatchId/submit',
  requirePermissions(PERMISSIONS.payroll.submitBatch),
  validate({
    params: payrollBatchIdParamSchema,
    body: payrollApprovalSchema.partial(),
  }),
  submitPayrollBatch,
);

router.post(
  '/batches/:payrollBatchId/approve',
  requirePermissions(PERMISSIONS.payroll.approveBatch),
  validate({
    params: payrollBatchIdParamSchema,
    body: payrollApprovalSchema.partial(),
  }),
  approvePayrollBatch,
);

router.post(
  '/batches/:payrollBatchId/reject',
  requirePermissions(PERMISSIONS.payroll.rejectBatch),
  validate({
    params: payrollBatchIdParamSchema,
    body: payrollApprovalSchema,
  }),
  rejectPayrollBatch,
);

router.post(
  '/batches/:payrollBatchId/cancel',
  requirePermissions(PERMISSIONS.payroll.cancelBatch),
  validate({
    params: payrollBatchIdParamSchema,
    body: payrollApprovalSchema.pick({ reason: true }),
  }),
  cancelPayrollBatch,
);

router.post(
  '/batches/:payrollBatchId/post',
  requirePermissions(PERMISSIONS.payroll.postBatch),
  validate({ params: payrollBatchIdParamSchema }),
  postPayrollBatch,
);

router.get(
  '/records',
  requirePermissions(PERMISSIONS.payroll.viewRecord),
  validate({ query: payrollRecordListQuerySchema }),
  listPayrollRecords,
);

router.post(
  '/records',
  requirePermissions(PERMISSIONS.payroll.createRecord),
  validate({ body: createPayrollRecordSchema }),
  createPayrollRecord,
);

router.get(
  '/records/:payrollRecordId',
  requirePermissions(PERMISSIONS.payroll.viewRecord),
  getPayrollRecordById,
);

router.post(
  '/records/:payrollRecordId/recalculate',
  requirePermissions(PERMISSIONS.payroll.recalculateRecord),
  recalculatePayrollRecord,
);

router.post(
  '/records/:payrollRecordId/cancel',
  requirePermissions(PERMISSIONS.payroll.cancelRecord),
  cancelPayrollRecord,
);

router.post(
  '/records/:payrollRecordId/payslip',
  requirePermissions(PERMISSIONS.payroll.generatePayslip),
  generatePayslip,
);

router.get(
  '/payslips',
  requirePermissions(PERMISSIONS.payroll.viewPayslip),
  listPayslips,
);

router.get(
  '/payslips/:payslipId',
  requirePermissions(PERMISSIONS.payroll.viewPayslip),
  getPayslipById,
);

router.post(
  '/payslips/:payslipId/publish',
  requirePermissions(PERMISSIONS.payroll.publishPayslip),
  publishPayslip,
);

router.post(
  '/payslips/:payslipId/revoke',
  requirePermissions(PERMISSIONS.payroll.revokePayslip),
  revokePayslip,
);

router.get(
  '/statutory/summary',
  requirePermissions(PERMISSIONS.payroll.viewStatutory),
  generateStatutorySummary,
);

router.post(
  '/statutory/filings',
  requirePermissions(PERMISSIONS.payroll.createStatutoryFiling),
  createStatutoryFiling,
);

router.post(
  '/statutory/filings/:filingId/filed',
  requirePermissions(PERMISSIONS.payroll.markStatutoryFiled),
  markStatutoryFiled,
);

router.get(
  '/reports/p9/:employeeId',
  payrollStatutoryEngineFeature,
  requirePermissions(PERMISSIONS.payroll.viewReports),
  generateP9Report,
);

router.get(
  '/reports/p10',
  payrollStatutoryEngineFeature,
  requirePermissions(PERMISSIONS.payroll.viewReports),
  generateP10Report,
);

router.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    module: 'payroll',
    error: 'Payroll route not found',
    code: 'PAYROLL_ROUTE_NOT_FOUND',
    path: req.originalUrl,
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

export default router;