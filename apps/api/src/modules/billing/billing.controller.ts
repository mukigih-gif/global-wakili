// apps/api/src/modules/billing/billing.controller.ts

import type { Request, Response } from 'express';

import { asyncHandler } from '../../utils/async-handler';

import { billingService } from './billing.service';
import { proformaService } from './proforma.service';
import { creditNoteService } from './CreditNoteService';
import { retainerService } from './RetainerService';
import { paymentReminderService } from './payment-reminder.service';
import { ledesService } from './LEDESService';
import { billingNotificationService } from './BillingNotificationService';
import { billingDashboardService } from './billing.dashboard';

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

export const getBillingDashboard = asyncHandler(async (req: Request, res: Response) => {
  const data = await billingDashboardService.getDashboard({
    tenantId: getTenantId(req),
    year: req.query.year ? Number(req.query.year) : undefined,
    month: req.query.month ? Number(req.query.month) : undefined,
    clientId: req.query.clientId ? String(req.query.clientId) : null,
    matterId: req.query.matterId ? String(req.query.matterId) : null,
  });

  res.status(200).json({ success: true, module: 'billing', data });
});

export const getBillingSnapshot = asyncHandler(async (req: Request, res: Response) => {
  const data = await billingService.getBillingSnapshot({
    tenantId: getTenantId(req),
    clientId: req.query.clientId ? String(req.query.clientId) : null,
    matterId: req.query.matterId ? String(req.query.matterId) : null,
    from: optionalDate(req.query.from),
    to: optionalDate(req.query.to),
  });

  res.status(200).json({ success: true, module: 'billing', data });
});

export const createProforma = asyncHandler(async (req: Request, res: Response) => {
  const data = await proformaService.createProforma({
    ...req.body,
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    issueDate: optionalDate(req.body.issueDate),
    expiryDate: optionalDate(req.body.expiryDate),
  });

  res.status(201).json({ success: true, module: 'billing', data });
});

export const updateProforma = asyncHandler(async (req: Request, res: Response) => {
  const data = await proformaService.updateProforma({
    ...req.body,
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    proformaId: req.params.proformaId,
    issueDate: req.body.issueDate !== undefined ? optionalDate(req.body.issueDate) : undefined,
    expiryDate: req.body.expiryDate !== undefined ? optionalDate(req.body.expiryDate) : undefined,
  });

  res.status(200).json({ success: true, module: 'billing', data });
});

export const listProformas = asyncHandler(async (req: Request, res: Response) => {
  const data = await proformaService.listProformas({
    tenantId: getTenantId(req),
    clientId: req.query.clientId ? String(req.query.clientId) : undefined,
    matterId: req.query.matterId ? String(req.query.matterId) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
    take: req.query.take ? Number(req.query.take) : undefined,
    skip: req.query.skip ? Number(req.query.skip) : undefined,
  });

  res.status(200).json({ success: true, module: 'billing', data });
});

export const getProformaById = asyncHandler(async (req: Request, res: Response) => {
  const data = await proformaService.getProformaById(getTenantId(req), req.params.proformaId);

  res.status(200).json({ success: true, module: 'billing', data });
});

export const sendProforma = asyncHandler(async (req: Request, res: Response) => {
  const data = await proformaService.sendProforma({
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    proformaId: req.params.proformaId,
    sentAt: optionalDate(req.body?.sentAt) ?? undefined,
  });

  res.status(200).json({ success: true, module: 'billing', data });
});

export const approveProforma = asyncHandler(async (req: Request, res: Response) => {
  const data = await proformaService.approveProforma({
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    proformaId: req.params.proformaId,
    approvedAt: optionalDate(req.body?.approvedAt) ?? undefined,
  });

  res.status(200).json({ success: true, module: 'billing', data });
});

export const cancelProforma = asyncHandler(async (req: Request, res: Response) => {
  const data = await proformaService.cancelProforma({
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    proformaId: req.params.proformaId,
    reason: req.body.reason,
  });

  res.status(200).json({ success: true, module: 'billing', data });
});

export const convertProformaToInvoice = asyncHandler(async (req: Request, res: Response) => {
  const data = await proformaService.convertToInvoice({
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    proformaId: req.params.proformaId,
    invoiceDate: optionalDate(req.body?.invoiceDate),
    dueDate: optionalDate(req.body?.dueDate),
    invoiceNumber: req.body?.invoiceNumber ?? null,
  });

  res.status(201).json({ success: true, module: 'billing', data });
});

export const createCreditNote = asyncHandler(async (req: Request, res: Response) => {
  const data = await creditNoteService.createCreditNote({
    ...req.body,
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    creditDate: optionalDate(req.body.creditDate),
  });

  res.status(201).json({ success: true, module: 'billing', data });
});

export const voidCreditNote = asyncHandler(async (req: Request, res: Response) => {
  const data = await creditNoteService.voidCreditNote({
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    creditNoteId: req.params.creditNoteId,
    reason: req.body.reason,
  });

  res.status(200).json({ success: true, module: 'billing', data });
});

export const listCreditNotes = asyncHandler(async (req: Request, res: Response) => {
  const data = await creditNoteService.listCreditNotes({
    tenantId: getTenantId(req),
    clientId: req.query.clientId ? String(req.query.clientId) : undefined,
    matterId: req.query.matterId ? String(req.query.matterId) : undefined,
    invoiceId: req.query.invoiceId ? String(req.query.invoiceId) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
    take: req.query.take ? Number(req.query.take) : undefined,
    skip: req.query.skip ? Number(req.query.skip) : undefined,
  });

  res.status(200).json({ success: true, module: 'billing', data });
});

export const getCreditNoteById = asyncHandler(async (req: Request, res: Response) => {
  const data = await creditNoteService.getCreditNoteById(getTenantId(req), req.params.creditNoteId);

  res.status(200).json({ success: true, module: 'billing', data });
});

export const createRetainer = asyncHandler(async (req: Request, res: Response) => {
  const data = await retainerService.createRetainer({
    ...req.body,
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    receivedAt: optionalDate(req.body.receivedAt),
  });

  res.status(201).json({ success: true, module: 'billing', data });
});

export const applyRetainer = asyncHandler(async (req: Request, res: Response) => {
  const data = await retainerService.applyRetainerToInvoice({
    ...req.body,
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    retainerId: req.params.retainerId,
  });

  res.status(201).json({ success: true, module: 'billing', data });
});

export const releaseRetainer = asyncHandler(async (req: Request, res: Response) => {
  const data = await retainerService.releaseRetainer({
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    retainerId: req.params.retainerId,
    reason: req.body.reason,
  });

  res.status(200).json({ success: true, module: 'billing', data });
});

export const listRetainers = asyncHandler(async (req: Request, res: Response) => {
  const data = await retainerService.listRetainers({
    tenantId: getTenantId(req),
    clientId: req.query.clientId ? String(req.query.clientId) : undefined,
    matterId: req.query.matterId ? String(req.query.matterId) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
    take: req.query.take ? Number(req.query.take) : undefined,
    skip: req.query.skip ? Number(req.query.skip) : undefined,
  });

  res.status(200).json({ success: true, module: 'billing', data });
});

export const getRetainerById = asyncHandler(async (req: Request, res: Response) => {
  const data = await retainerService.getRetainerById(getTenantId(req), req.params.retainerId);

  res.status(200).json({ success: true, module: 'billing', data });
});

export const createPaymentReminder = asyncHandler(async (req: Request, res: Response) => {
  const data = await paymentReminderService.createReminder({
    ...req.body,
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    scheduledFor: optionalDate(req.body.scheduledFor),
  });

  res.status(201).json({ success: true, module: 'billing', data });
});

export const sendPaymentReminder = asyncHandler(async (req: Request, res: Response) => {
  const data = await paymentReminderService.sendReminder({
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    reminderId: req.params.reminderId,
    sentAt: optionalDate(req.body?.sentAt),
    deliveryReference: req.body?.deliveryReference ?? null,
  });

  res.status(200).json({ success: true, module: 'billing', data });
});

export const cancelPaymentReminder = asyncHandler(async (req: Request, res: Response) => {
  const data = await paymentReminderService.cancelReminder({
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    reminderId: req.params.reminderId,
    reason: req.body.reason,
  });

  res.status(200).json({ success: true, module: 'billing', data });
});

export const generateOverdueReminders = asyncHandler(async (req: Request, res: Response) => {
  const data = await paymentReminderService.generateOverdueReminders({
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    asOf: optionalDate(req.body?.asOf) ?? undefined,
    minimumDaysOverdue: req.body?.minimumDaysOverdue,
    channel: req.body?.channel,
    tone: req.body?.tone,
  });

  res.status(201).json({ success: true, module: 'billing', data });
});

export const listPaymentReminders = asyncHandler(async (req: Request, res: Response) => {
  const data = await paymentReminderService.listReminders({
    tenantId: getTenantId(req),
    invoiceId: req.query.invoiceId ? String(req.query.invoiceId) : undefined,
    clientId: req.query.clientId ? String(req.query.clientId) : undefined,
    matterId: req.query.matterId ? String(req.query.matterId) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
    take: req.query.take ? Number(req.query.take) : undefined,
    skip: req.query.skip ? Number(req.query.skip) : undefined,
  });

  res.status(200).json({ success: true, module: 'billing', data });
});

export const generateLEDES = asyncHandler(async (req: Request, res: Response) => {
  const data = await ledesService.generateInvoiceLEDES({
    tenantId: getTenantId(req),
    invoiceId: req.params.invoiceId,
    format: req.query.format ? String(req.query.format) as any : undefined,
  });

  res.status(200).json({ success: true, module: 'billing', data });
});

export const persistLEDES = asyncHandler(async (req: Request, res: Response) => {
  const data = await ledesService.persistLEDESExport({
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    invoiceId: req.params.invoiceId,
    format: req.body?.format,
  });

  res.status(201).json({ success: true, module: 'billing', data });
});

export const createBillingNotification = asyncHandler(async (req: Request, res: Response) => {
  const data = await billingNotificationService.createNotification({
    ...req.body,
    tenantId: getTenantId(req),
    actorId: getActorId(req),
    scheduledFor: optionalDate(req.body.scheduledFor),
  });

  res.status(201).json({ success: true, module: 'billing', data });
});

export const listBillingNotifications = asyncHandler(async (req: Request, res: Response) => {
  const data = await billingNotificationService.listNotifications({
    tenantId: getTenantId(req),
    clientId: req.query.clientId ? String(req.query.clientId) : undefined,
    matterId: req.query.matterId ? String(req.query.matterId) : undefined,
    invoiceId: req.query.invoiceId ? String(req.query.invoiceId) : undefined,
    type: req.query.type ? String(req.query.type) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
    take: req.query.take ? Number(req.query.take) : undefined,
    skip: req.query.skip ? Number(req.query.skip) : undefined,
  });

  res.status(200).json({ success: true, module: 'billing', data });
});