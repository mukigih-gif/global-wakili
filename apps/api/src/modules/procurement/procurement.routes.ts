// apps/api/src/modules/procurement/procurement.routes.ts

import { Router, type Request, type Response, type NextFunction } from 'express';
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

// ── Frontend-compatible aliases ────────────────────────────────────────────────
// The frontend uses /procurement/requests, /orders, /bills, /vendors

router.get('/requests', requirePermissions(PERMISSIONS.procurement.viewBill), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, search, limit = '50' } = req.query as Record<string, string>;
    const rfqs = await req.db.requestForQuotation.findMany({
      where: {
        tenantId: req.tenantId,
        ...(status ? { status: status as any } : {}),
        ...(search ? { title: { contains: search, mode: 'insensitive' as any } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit) || 50, 200),
    });
    const shaped = rfqs.map((r: any) => ({
      ...r,
      prNumber: r.rfqNumber ?? `RFQ-${r.id.slice(-6).toUpperCase()}`,
      title: r.title ?? r.description ?? 'Purchase Request',
      requestedBy: null,
      estimatedAmount: parseFloat(String(r.estimatedAmount ?? r.budget ?? 0)),
      currency: r.currency ?? 'KES',
      priority: r.priority ?? 'NORMAL',
    }));
    res.json({ success: true, data: shaped });
  } catch (e) { next(e); }
});

router.post('/requests/approve', requirePermissions(PERMISSIONS.procurement.approveBill), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Request id is required', code: 'PROCUREMENT_REQUEST_ID_REQUIRED', requestId: req.id });
    const result = await req.db.requestForQuotation.updateMany({ where: { tenantId: req.tenantId, id }, data: { status: 'AWARDED' as any } });
    if (result.count === 0) return res.status(404).json({ error: 'Purchase request not found', code: 'PROCUREMENT_REQUEST_NOT_FOUND', requestId: req.id });
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.post('/requests/reject', requirePermissions(PERMISSIONS.procurement.rejectBill), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Request id is required', code: 'PROCUREMENT_REQUEST_ID_REQUIRED', requestId: req.id });
    const result = await req.db.requestForQuotation.updateMany({ where: { tenantId: req.tenantId, id }, data: { status: 'CANCELLED' as any } });
    if (result.count === 0) return res.status(404).json({ error: 'Purchase request not found', code: 'PROCUREMENT_REQUEST_NOT_FOUND', requestId: req.id });
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.get('/orders', requirePermissions(PERMISSIONS.procurement.viewBill), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, limit = '50' } = req.query as Record<string, string>;
    const orders = await req.db.purchaseOrder.findMany({
      where: { tenantId: req.tenantId, ...(status ? { status: status as any } : {}) },
      include: { vendor: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit) || 50, 200),
    });
    const shaped = orders.map((o: any) => ({
      ...o,
      poNumber: o.poNumber ?? `PO-${o.id.slice(-6).toUpperCase()}`,
      vendor: o.vendor,
      totalAmount: parseFloat(String(o.totalAmount ?? o.total ?? 0)),
    }));
    res.json({ success: true, data: shaped });
  } catch (e) { next(e); }
});

router.get('/bills', requirePermissions(PERMISSIONS.procurement.viewBill), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, limit = '50' } = req.query as Record<string, string>;
    const bills = await req.db.vendorBill.findMany({
      where: { tenantId: req.tenantId, ...(status ? { status: status as any } : {}) },
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit) || 50, 200),
    });
    const shaped = bills.map((b: any) => ({
      ...b,
      billNumber: b.billNumber ?? `BILL-${b.id.slice(-6).toUpperCase()}`,
      vendor: b.supplier,
      amount: parseFloat(String(b.total ?? 0)),
    }));
    res.json({ success: true, data: shaped });
  } catch (e) { next(e); }
});

router.post('/bills/:billId/approve', requirePermissions(PERMISSIONS.procurement.approveBill), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await req.db.vendorBill.updateMany({ where: { tenantId: req.tenantId, id: req.params.billId }, data: { status: 'APPROVED' as any } });
    if (result.count === 0) return res.status(404).json({ error: 'Vendor bill not found', code: 'PROCUREMENT_BILL_NOT_FOUND', requestId: req.id });
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.post('/bills/:billId/reject', requirePermissions(PERMISSIONS.procurement.rejectBill), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await req.db.vendorBill.updateMany({ where: { tenantId: req.tenantId, id: req.params.billId }, data: { status: 'REJECTED' as any } });
    if (result.count === 0) return res.status(404).json({ error: 'Vendor bill not found', code: 'PROCUREMENT_BILL_NOT_FOUND', requestId: req.id });
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.post('/bills/:billId/pay', requirePermissions(PERMISSIONS.procurement.payBill), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await req.db.vendorBill.updateMany({ where: { tenantId: req.tenantId, id: req.params.billId }, data: { status: 'PAID' as any, paidAt: new Date() } });
    if (result.count === 0) return res.status(404).json({ error: 'Vendor bill not found', code: 'PROCUREMENT_BILL_NOT_FOUND', requestId: req.id });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
