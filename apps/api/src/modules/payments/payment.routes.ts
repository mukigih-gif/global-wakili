// apps/api/src/modules/payments/payment.routes.ts

import { Router } from 'express';

import paymentController from './payment.controller';
import { requirePermissions } from '../../middleware/rbac';
import { PERMISSIONS } from '../../config/permissions';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    module: 'payments',
    status: 'mounted',
    service: 'global-wakili-api',
    timestamp: new Date().toISOString(),
  });
});

router.get(
  '/dashboard',
  requirePermissions(PERMISSIONS.payments.viewDashboard),
  paymentController.dashboardSummary,
);

router.get(
  '/unallocated',
  requirePermissions(PERMISSIONS.payments.viewDashboard),
  paymentController.unallocatedReceipts,
);

router.get(
  '/wht-exposure',
  requirePermissions(PERMISSIONS.payments.viewDashboard),
  paymentController.whtExposure,
);

router.get(
  '/',
  requirePermissions(PERMISSIONS.payments.viewReceipt),
  paymentController.listReceipts,
);

router.post(
  '/',
  requirePermissions(PERMISSIONS.payments.createReceipt),
  paymentController.createReceipt,
);

router.post(
  '/refunds/:refundId/approve',
  requirePermissions(PERMISSIONS.payments.manageOverpayment),
  paymentController.approveRefund,
);

router.post(
  '/refunds/:refundId/pay',
  requirePermissions(PERMISSIONS.payments.manageOverpayment),
  paymentController.payRefund,
);

router.post(
  '/refunds/:refundId/reject',
  requirePermissions(PERMISSIONS.payments.manageOverpayment),
  paymentController.rejectRefund,
);

router.get(
  '/:paymentReceiptId',
  requirePermissions(PERMISSIONS.payments.viewReceipt),
  paymentController.getReceipt,
);

router.post(
  '/:paymentReceiptId/allocate',
  requirePermissions(PERMISSIONS.payments.allocatePayment),
  paymentController.allocateReceipt,
);

router.post(
  '/:paymentReceiptId/reverse',
  requirePermissions(PERMISSIONS.payments.reverseReceipt),
  paymentController.reverseReceipt,
);

router.post(
  '/:paymentReceiptId/refunds',
  requirePermissions(PERMISSIONS.payments.manageOverpayment),
  paymentController.createRefund,
);

export default router;