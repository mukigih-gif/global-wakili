// apps/api/src/modules/billing/billing.routes.ts

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

import { validate } from '../../middleware/validate';
import { requirePermissions } from '../../middleware/rbac';
import { PERMISSIONS } from '../../config/permissions';

import {
  applyRetainer,
  approveProforma,
  cancelPaymentReminder,
  cancelProforma,
  convertProformaToInvoice,
  createBillingNotification,
  createCreditNote,
  createPaymentReminder,
  createProforma,
  createRetainer,
  generateLEDES,
  generateOverdueReminders,
  getBillingDashboard,
  getBillingSnapshot,
  getCreditNoteById,
  getProformaById,
  getRetainerById,
  listBillingNotifications,
  listCreditNotes,
  listPaymentReminders,
  listProformas,
  listRetainers,
  persistLEDES,
  releaseRetainer,
  sendPaymentReminder,
  sendProforma,
  updateProforma,
  voidCreditNote,
} from './billing.controller';

const router = Router();

const idParam = (name: string) =>
  z.object({
    [name]: z.string().trim().min(1),
  });

const listQuerySchema = z.object({
  clientId: z.string().trim().min(1).optional(),
  matterId: z.string().trim().min(1).optional(),
  invoiceId: z.string().trim().min(1).optional(),
  status: z.string().trim().max(100).optional(),
  type: z.string().trim().max(100).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

const decimalLike = z.union([
  z.string().trim().regex(/^-?\d+(\.\d{1,6})?$/),
  z.number().finite(),
]);

const proformaLineSchema = z.object({
  description: z.string().trim().min(1).max(2000),
  quantity: decimalLike.optional(),
  unitPrice: decimalLike,
  taxRate: decimalLike.optional().nullable(),
  matterId: z.string().trim().min(1).optional().nullable(),
  timeEntryId: z.string().trim().min(1).optional().nullable(),
  expenseId: z.string().trim().min(1).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const proformaSchema = z.object({
  clientId: z.string().trim().min(1),
  matterId: z.string().trim().min(1).optional().nullable(),
  currency: z.string().trim().min(3).max(8).optional(),
  issueDate: z.coerce.date().optional().nullable(),
  expiryDate: z.coerce.date().optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
  terms: z.string().trim().max(5000).optional().nullable(),
  lines: z.array(proformaLineSchema).min(1).max(500),
  metadata: z.record(z.unknown()).optional(),
});

const proformaUpdateSchema = proformaSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one proforma field is required for update' },
);

const reasonSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
});

const convertProformaSchema = z.object({
  invoiceDate: z.coerce.date().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  invoiceNumber: z.string().trim().max(100).optional().nullable(),
});

const creditNoteLineSchema = z.object({
  invoiceLineId: z.string().trim().min(1).optional().nullable(),
  description: z.string().trim().min(1).max(2000),
  quantity: decimalLike.optional(),
  unitPrice: decimalLike,
  taxRate: decimalLike.optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const creditNoteSchema = z.object({
  invoiceId: z.string().trim().min(1),
  reason: z.string().trim().min(1).max(2000),
  creditDate: z.coerce.date().optional().nullable(),
  lines: z.array(creditNoteLineSchema).max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const retainerSchema = z.object({
  clientId: z.string().trim().min(1),
  matterId: z.string().trim().min(1).optional().nullable(),
  amount: decimalLike,
  currency: z.string().trim().min(3).max(8).optional(),
  receivedAt: z.coerce.date().optional().nullable(),
  reference: z.string().trim().max(255).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const retainerApplicationSchema = z.object({
  invoiceId: z.string().trim().min(1),
  amount: decimalLike,
  notes: z.string().trim().max(2000).optional().nullable(),
});

const paymentReminderSchema = z.object({
  invoiceId: z.string().trim().min(1),
  channel: z.enum(['EMAIL', 'SMS', 'PORTAL', 'WHATSAPP', 'MANUAL']).optional(),
  tone: z.enum(['GENTLE', 'STANDARD', 'FIRM', 'FINAL_NOTICE']).optional(),
  scheduledFor: z.coerce.date().optional().nullable(),
  message: z.string().trim().max(5000).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const sendReminderSchema = z.object({
  sentAt: z.coerce.date().optional().nullable(),
  deliveryReference: z.string().trim().max(255).optional().nullable(),
});

const overdueReminderSchema = z.object({
  asOf: z.coerce.date().optional().nullable(),
  minimumDaysOverdue: z.coerce.number().int().min(1).max(365).optional(),
  channel: z.enum(['EMAIL', 'SMS', 'PORTAL', 'WHATSAPP', 'MANUAL']).optional(),
  tone: z.enum(['GENTLE', 'STANDARD', 'FIRM', 'FINAL_NOTICE']).optional(),
});

const billingNotificationSchema = z.object({
  type: z.string().trim().min(1).max(100),
  channel: z.enum(['EMAIL', 'SMS', 'PORTAL', 'WHATSAPP', 'MANUAL']).optional(),
  clientId: z.string().trim().min(1).optional().nullable(),
  matterId: z.string().trim().min(1).optional().nullable(),
  invoiceId: z.string().trim().min(1).optional().nullable(),
  proformaId: z.string().trim().min(1).optional().nullable(),
  creditNoteId: z.string().trim().min(1).optional().nullable(),
  retainerId: z.string().trim().min(1).optional().nullable(),
  recipientName: z.string().trim().max(255).optional().nullable(),
  recipientEmail: z.string().trim().email().optional().nullable(),
  recipientPhone: z.string().trim().max(50).optional().nullable(),
  subject: z.string().trim().max(255).optional().nullable(),
  message: z.string().trim().max(5000).optional().nullable(),
  scheduledFor: z.coerce.date().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const ledesQuerySchema = z.object({
  format: z.enum(['LEDES_1998B', 'LEDES_1998BI', 'LEDES_2000']).optional(),
});

function billingPermission(key: string) {
  const billing = (PERMISSIONS as any).billing ?? {};

  return requirePermissions(
    billing[key] ??
    billing.manageBilling ??
    billing.viewBilling ??
    billing.viewInvoice ??
    'billing:view',
  );
}

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'billing',
    status: 'mounted',
    service: 'global-wakili-api',
    lifecycle: 'production-billing-routes-mounted',
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

router.get(
  '/dashboard',
  billingPermission('viewDashboard'),
  validate({ query: listQuerySchema }),
  getBillingDashboard,
);

router.get(
  '/snapshot',
  billingPermission('viewBilling'),
  validate({ query: listQuerySchema }),
  getBillingSnapshot,
);

router.get(
  '/proformas',
  billingPermission('viewProforma'),
  validate({ query: listQuerySchema }),
  listProformas,
);

router.post(
  '/proformas',
  billingPermission('createProforma'),
  validate({ body: proformaSchema }),
  createProforma,
);

router.get(
  '/proformas/:proformaId',
  billingPermission('viewProforma'),
  validate({ params: idParam('proformaId') }),
  getProformaById,
);

router.patch(
  '/proformas/:proformaId',
  billingPermission('updateProforma'),
  validate({ params: idParam('proformaId'), body: proformaUpdateSchema }),
  updateProforma,
);

router.post(
  '/proformas/:proformaId/send',
  billingPermission('sendProforma'),
  validate({ params: idParam('proformaId') }),
  sendProforma,
);

router.post(
  '/proformas/:proformaId/approve',
  billingPermission('approveProforma'),
  validate({ params: idParam('proformaId') }),
  approveProforma,
);

router.post(
  '/proformas/:proformaId/cancel',
  billingPermission('cancelProforma'),
  validate({ params: idParam('proformaId'), body: reasonSchema }),
  cancelProforma,
);

router.post(
  '/proformas/:proformaId/convert',
  billingPermission('convertProforma'),
  validate({ params: idParam('proformaId'), body: convertProformaSchema }),
  convertProformaToInvoice,
);

router.get(
  '/credit-notes',
  billingPermission('viewCreditNote'),
  validate({ query: listQuerySchema }),
  listCreditNotes,
);

router.post(
  '/credit-notes',
  billingPermission('createCreditNote'),
  validate({ body: creditNoteSchema }),
  createCreditNote,
);

router.get(
  '/credit-notes/:creditNoteId',
  billingPermission('viewCreditNote'),
  validate({ params: idParam('creditNoteId') }),
  getCreditNoteById,
);

router.post(
  '/credit-notes/:creditNoteId/void',
  billingPermission('voidCreditNote'),
  validate({ params: idParam('creditNoteId'), body: reasonSchema }),
  voidCreditNote,
);

router.get(
  '/retainers',
  billingPermission('viewRetainer'),
  validate({ query: listQuerySchema }),
  listRetainers,
);

router.post(
  '/retainers',
  billingPermission('createRetainer'),
  validate({ body: retainerSchema }),
  createRetainer,
);

router.get(
  '/retainers/:retainerId',
  billingPermission('viewRetainer'),
  validate({ params: idParam('retainerId') }),
  getRetainerById,
);

router.post(
  '/retainers/:retainerId/apply',
  billingPermission('applyRetainer'),
  validate({ params: idParam('retainerId'), body: retainerApplicationSchema }),
  applyRetainer,
);

router.post(
  '/retainers/:retainerId/release',
  billingPermission('releaseRetainer'),
  validate({ params: idParam('retainerId'), body: reasonSchema }),
  releaseRetainer,
);

router.get(
  '/reminders',
  billingPermission('viewReminder'),
  validate({ query: listQuerySchema }),
  listPaymentReminders,
);

router.post(
  '/reminders',
  billingPermission('createReminder'),
  validate({ body: paymentReminderSchema }),
  createPaymentReminder,
);

router.post(
  '/reminders/overdue',
  billingPermission('createReminder'),
  validate({ body: overdueReminderSchema }),
  generateOverdueReminders,
);

router.post(
  '/reminders/:reminderId/send',
  billingPermission('sendReminder'),
  validate({ params: idParam('reminderId'), body: sendReminderSchema }),
  sendPaymentReminder,
);

router.post(
  '/reminders/:reminderId/cancel',
  billingPermission('cancelReminder'),
  validate({ params: idParam('reminderId'), body: reasonSchema }),
  cancelPaymentReminder,
);

router.get(
  '/invoices/:invoiceId/ledes',
  billingPermission('exportLedes'),
  validate({ params: idParam('invoiceId'), query: ledesQuerySchema }),
  generateLEDES,
);

router.post(
  '/invoices/:invoiceId/ledes',
  billingPermission('exportLedes'),
  validate({ params: idParam('invoiceId') }),
  persistLEDES,
);

router.get(
  '/notifications',
  billingPermission('viewNotification'),
  validate({ query: listQuerySchema }),
  listBillingNotifications,
);

router.post(
  '/notifications',
  billingPermission('createNotification'),
  validate({ body: billingNotificationSchema }),
  createBillingNotification,
);

router.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    module: 'billing',
    error: 'Billing route not found',
    code: 'BILLING_ROUTE_NOT_FOUND',
    path: req.originalUrl,
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

export default router;