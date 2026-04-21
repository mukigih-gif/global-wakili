// apps/api/src/modules/procurement/procurement.routes.ts

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

import { validate } from '../../middleware/validate';
import { requirePermissions } from '../../middleware/rbac';
import { PERMISSIONS } from '../../config/permissions';

import {
  approveVendorBill,
  createVendor,
  createVendorBill,
  getPayablesAging,
  getProcurementDashboard,
  listActiveVendors,
  listOpenVendorBills,
  payVendorBill,
  rejectVendorBill,
  submitVendorBill,
  updateVendor,
} from './procurement.controller';

import {
  vendorBillInputSchema,
  vendorInputSchema,
} from './procurement.validators';

const router = Router();

const rejectionBodySchema = z.object({
  rejectionReason: z.string().trim().max(2000).optional().nullable(),
});

const vendorPaymentBodySchema = z.object({
  amount: z.union([z.string(), z.number()]),
  paymentDate: z.coerce.date().optional(),
  reference: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  bankAccountChartId: z.string().trim().min(1).optional(),
});

const agingQuerySchema = z.object({
  asOf: z.string().datetime().optional(),
  format: z.enum(['json', 'csv']).optional(),
});

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'procurement',
    status: 'mounted',
    service: 'global-wakili-api',
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

router.get(
  '/dashboard',
  requirePermissions(PERMISSIONS.procurement.viewBill),
  getProcurementDashboard,
);

router.get(
  '/reports/payables-aging',
  requirePermissions(PERMISSIONS.procurement.viewBill),
  validate({ query: agingQuerySchema }),
  getPayablesAging,
);

router.post(
  '/vendors',
  requirePermissions(PERMISSIONS.procurement.createVendor),
  validate({ body: vendorInputSchema }),
  createVendor,
);

router.patch(
  '/vendors/:vendorId',
  requirePermissions(PERMISSIONS.procurement.updateVendor),
  validate({ body: vendorInputSchema.partial() }),
  updateVendor,
);

router.get(
  '/vendors',
  requirePermissions(PERMISSIONS.procurement.viewVendor),
  listActiveVendors,
);

router.post(
  '/vendor-bills',
  requirePermissions(PERMISSIONS.procurement.createBill),
  validate({ body: vendorBillInputSchema }),
  createVendorBill,
);

router.get(
  '/vendor-bills/open',
  requirePermissions(PERMISSIONS.procurement.viewBill),
  listOpenVendorBills,
);

router.post(
  '/vendor-bills/:vendorBillId/submit',
  requirePermissions(PERMISSIONS.procurement.submitBill),
  submitVendorBill,
);

router.post(
  '/vendor-bills/:vendorBillId/approve',
  requirePermissions(PERMISSIONS.procurement.approveBill),
  approveVendorBill,
);

router.post(
  '/vendor-bills/:vendorBillId/reject',
  requirePermissions(PERMISSIONS.procurement.rejectBill),
  validate({ body: rejectionBodySchema }),
  rejectVendorBill,
);

router.post(
  '/vendor-bills/:vendorBillId/pay',
  requirePermissions(PERMISSIONS.procurement.payBill),
  validate({ body: vendorPaymentBodySchema }),
  payVendorBill,
);

router.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    module: 'procurement',
    error: 'Procurement route not found',
    code: 'PROCUREMENT_ROUTE_NOT_FOUND',
    path: req.originalUrl,
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

export default router;