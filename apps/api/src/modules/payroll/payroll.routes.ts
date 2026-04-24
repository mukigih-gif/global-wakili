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

import {
  PAYROLL_PERMISSIONS,
  requirePayrollPermission,
} from './payroll-permission.map';

import { bindPlatformModuleEnforcement } from '../../middleware/platform/module-enforcement';
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
  requirePayrollPermission(PAYROLL_PERMISSIONS.viewDashboard),
  getPayrollDashboard,
);

router.post(
  '/calculate',
  requirePayrollPermission(PAYROLL_PERMISSIONS.createRecord),
  validate({ body: payrollCalculationSchema }),
  calculatePayroll,
);

router.get(
  '/batches',
  requirePayrollPermission(PAYROLL_PERMISSIONS.viewBatch),
  validate({ query: payrollBatchListQuerySchema }),
  listPayrollBatches,
);

router.post(
  '/batches',
  requirePayrollPermission(PAYROLL_PERMISSIONS.createBatch),
  validate({ body: createPayrollBatchSchema }),
  createPayrollBatch,
);

router.post(
  '/batches/with-records',
  requirePayrollPermission(PAYROLL_PERMISSIONS.createBatch),
  validate({ body: createPayrollBatchSchema }),
  createPayrollBatchAndRecords,
);

router.get(
  '/batches/:payrollBatchId',
  requirePayrollPermission(PAYROLL_PERMISSIONS.viewBatch),
  validate({ params: payrollBatchIdParamSchema }),
  getPayrollBatchById,
);

router.post(
  '/batches/:payrollBatchId/submit',
  requirePayrollPermission(PAYROLL_PERMISSIONS.submitBatch),
  validate({
    params: payrollBatchIdParamSchema,
    body: payrollApprovalSchema.partial(),
  }),
  submitPayrollBatch,
);

router.post(
  '/batches/:payrollBatchId/approve',
  requirePayrollPermission(PAYROLL_PERMISSIONS.approveBatch),
  validate({
    params: payrollBatchIdParamSchema,
    body: payrollApprovalSchema.partial(),
  }),
  approvePayrollBatch,
);

router.post(
  '/batches/:payrollBatchId/reject',
  requirePayrollPermission(PAYROLL_PERMISSIONS.rejectBatch),
  validate({
    params: payrollBatchIdParamSchema,
    body: payrollApprovalSchema,
  }),
  rejectPayrollBatch,
);

router.post(
  '/batches/:payrollBatchId/cancel',
  requirePayrollPermission(PAYROLL_PERMISSIONS.cancelBatch),
  validate({
    params: payrollBatchIdParamSchema,
    body: payrollApprovalSchema.pick({ reason: true }),
  }),
  cancelPayrollBatch,
);

router.post(
  '/batches/:payrollBatchId/post',
  requirePayrollPermission(PAYROLL_PERMISSIONS.postBatch),
  validate({ params: payrollBatchIdParamSchema }),
  postPayrollBatch,
);

router.get(
  '/records',
  requirePayrollPermission(PAYROLL_PERMISSIONS.viewRecord),
  validate({ query: payrollRecordListQuerySchema }),
  listPayrollRecords,
);

router.post(
  '/records',
  requirePayrollPermission(PAYROLL_PERMISSIONS.createRecord),
  validate({ body: createPayrollRecordSchema }),
  createPayrollRecord,
);

router.get(
  '/records/:payrollRecordId',
  requirePayrollPermission(PAYROLL_PERMISSIONS.viewRecord),
  getPayrollRecordById,
);

router.post(
  '/records/:payrollRecordId/recalculate',
  requirePayrollPermission(PAYROLL_PERMISSIONS.recalculateRecord),
  recalculatePayrollRecord,
);

router.post(
  '/records/:payrollRecordId/cancel',
  requirePayrollPermission(PAYROLL_PERMISSIONS.cancelRecord),
  cancelPayrollRecord,
);

router.post(
  '/records/:payrollRecordId/payslip',
  requirePayrollPermission(PAYROLL_PERMISSIONS.generatePayslip),
  generatePayslip,
);

router.get(
  '/payslips',
  requirePayrollPermission(PAYROLL_PERMISSIONS.viewPayslip),
  listPayslips,
);

router.get(
  '/payslips/:payslipId',
  requirePayrollPermission(PAYROLL_PERMISSIONS.viewPayslip),
  getPayslipById,
);

router.post(
  '/payslips/:payslipId/publish',
  requirePayrollPermission(PAYROLL_PERMISSIONS.publishPayslip),
  publishPayslip,
);

router.post(
  '/payslips/:payslipId/revoke',
  requirePayrollPermission(PAYROLL_PERMISSIONS.revokePayslip),
  revokePayslip,
);

router.get(
  '/statutory/summary',
  requirePayrollPermission(PAYROLL_PERMISSIONS.viewStatutory),
  generateStatutorySummary,
);

router.post(
  '/statutory/filings',
  requirePayrollPermission(PAYROLL_PERMISSIONS.createStatutoryFiling),
  createStatutoryFiling,
);

router.post(
  '/statutory/filings/:filingId/filed',
  requirePayrollPermission(PAYROLL_PERMISSIONS.markStatutoryFiled),
  markStatutoryFiled,
);

router.get(
  '/reports/p9/:employeeId',
  payrollStatutoryEngineFeature,
  requirePayrollPermission(PAYROLL_PERMISSIONS.viewReports),
  generateP9Report,
);

router.get(
  '/reports/p10',
  payrollStatutoryEngineFeature,
  requirePayrollPermission(PAYROLL_PERMISSIONS.viewReports),
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