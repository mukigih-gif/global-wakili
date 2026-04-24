// apps/api/src/modules/payments/payment.routes.ts

import { Router } from 'express';

import paymentController from './payment.controller';
import {
  PAYMENT_PERMISSIONS,
  requirePaymentPermission,
} from './payment-permission.map';

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
  requirePaymentPermission(PAYMENT_PERMISSIONS.viewDashboard),
  paymentController.dashboardSummary,
);

router.get(
  '/unallocated',
  requirePaymentPermission(PAYMENT_PERMISSIONS.viewDashboard),
  paymentController.unallocatedReceipts,
);

router.get(
  '/wht-exposure',
  requirePaymentPermission(PAYMENT_PERMISSIONS.viewDashboard),
  paymentController.whtExposure,
);

router.get(
  '/',
  requirePaymentPermission(PAYMENT_PERMISSIONS.viewReceipt),
  paymentController.listReceipts,
);

router.post(
  '/',
  requirePaymentPermission(PAYMENT_PERMISSIONS.createReceipt),
  paymentController.createReceipt,
);

router.post(
  '/refunds/:refundId/approve',
  requirePaymentPermission(PAYMENT_PERMISSIONS.manageOverpayment),
  paymentController.approveRefund,
);

router.post(
  '/refunds/:refundId/pay',
  requirePaymentPermission(PAYMENT_PERMISSIONS.manageOverpayment),
  paymentController.payRefund,
);

router.post(
  '/refunds/:refundId/reject',
  requirePaymentPermission(PAYMENT_PERMISSIONS.manageOverpayment),
  paymentController.rejectRefund,
);

router.get(
  '/:paymentReceiptId',
  requirePaymentPermission(PAYMENT_PERMISSIONS.viewReceipt),
  paymentController.getReceipt,
);

router.post(
  '/:paymentReceiptId/allocate',
  requirePaymentPermission(PAYMENT_PERMISSIONS.allocatePayment),
  paymentController.allocateReceipt,
);

router.post(
  '/:paymentReceiptId/reverse',
  requirePaymentPermission(PAYMENT_PERMISSIONS.reverseReceipt),
  paymentController.reverseReceipt,
);

router.post(
  '/:paymentReceiptId/refunds',
  requirePaymentPermission(PAYMENT_PERMISSIONS.manageOverpayment),
  paymentController.createRefund,
);

export default router;