import { Router } from 'express';
import { z } from 'zod';
import { requirePermissions } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { PERMISSIONS } from '../../config/permissions';
import {
  createMatter,
  getMatterById,
  getMatterOverview,
  listOpenMatters,
  updateMatter,
} from './matter.controller';
import {
  getMatterDashboard,
  getMatterPortfolioSummary,
  getMatterWorkflowTemplate,
  runMatterConflictCheck,
  evaluateMatterKyc,
  getMatterCommission,
  getOriginatorPortfolioPayout,
} from './matter.dashboard.controller';
import { matterInputSchema } from './matter.validators';
import { CalendarService } from '../calendar/CalendarService';

const router = Router();

const matterListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(200).optional(),
  // clientId + status are consumed by listOpenMatters; without them here the
  // validate() Zod .parse() strips them from req.query before the controller runs.
  clientId: z.string().trim().min(1).optional(),
  status: z.string().trim().max(50).optional(),
});

const workflowQuerySchema = z.object({
  matterType: z.string().trim().max(100).optional(),
});

const conflictBodySchema = z.object({
  clientId: z.string().trim().optional().nullable(),
  matterId: z.string().trim().optional().nullable(),
  adversePartyNames: z.array(z.string().trim().min(1)).optional().nullable(),
  relatedEntityNames: z.array(z.string().trim().min(1)).optional().nullable(),
});

const commissionQuerySchema = z.object({
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  includeWriteOffImpact: z.enum(['true', 'false']).optional(),
});

const matterKycBodySchema = z.object({
  sourceOfFundsRequired: z.boolean().optional(),
  sourceOfWealthRequired: z.boolean().optional(),
});

router.post(
  '/',
  requirePermissions(PERMISSIONS.matter.createMatter),
  validate({ body: matterInputSchema }),
  createMatter,
);

router.patch(
  '/:matterId',
  requirePermissions(PERMISSIONS.matter.updateMatter),
  validate({ body: matterInputSchema.partial() }),
  updateMatter,
);

router.get(
  '/',
  requirePermissions(PERMISSIONS.matter.viewMatter),
  validate({ query: matterListQuerySchema }),
  listOpenMatters,
);

router.get(
  '/portfolio/summary',
  requirePermissions(PERMISSIONS.matter.viewPortfolioSummary),
  getMatterPortfolioSummary,
);

router.post(
  '/conflicts/check',
  requirePermissions(PERMISSIONS.matter.runConflictCheck),
  validate({ body: conflictBodySchema }),
  runMatterConflictCheck,
);

router.get(
  '/workflow/template',
  requirePermissions(PERMISSIONS.matter.resolveWorkflow),
  validate({ query: workflowQuerySchema }),
  getMatterWorkflowTemplate,
);

router.post(
  '/:matterId/kyc/evaluate',
  requirePermissions(PERMISSIONS.matter.evaluateKyc),
  validate({ body: matterKycBodySchema }),
  evaluateMatterKyc,
);

router.get(
  '/commissions/originators/:originatorId',
  requirePermissions(PERMISSIONS.matter.viewOriginatorPayout),
  validate({ query: commissionQuerySchema }),
  getOriginatorPortfolioPayout,
);

router.get(
  '/:matterId/commission',
  requirePermissions(PERMISSIONS.matter.viewCommission),
  validate({ query: commissionQuerySchema }),
  getMatterCommission,
);

router.get(
  '/:matterId/overview',
  requirePermissions(PERMISSIONS.matter.viewMatter),
  getMatterOverview,
);

router.get(
  '/:matterId/dashboard',
  requirePermissions(PERMISSIONS.matter.viewDashboard),
  getMatterDashboard,
);

router.get(
  '/:matterId',
  requirePermissions(PERMISSIONS.matter.viewMatter),
  getMatterById,
);

export default router;
// ── Disbursements (DRN) ────────────────────────────────────────────────────────
router.get(
  '/:matterId/disbursements',
  requirePermissions(PERMISSIONS.matter.viewMatter),
  async (req, res) => {
    try {
      const drns = await req.db.disbursementRequestNote.findMany({
        where: { tenantId: req.tenantId, matterId: req.params.matterId },
        include: { createdBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      });
      // Expose createdBy as requestedBy for frontend compatibility
      const shaped = drns.map((d) => ({ ...d, requestedBy: d.createdBy }));
      res.json({ data: shaped });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  }
);

router.post(
  '/:matterId/disbursements',
  requirePermissions(PERMISSIONS.matter.viewMatter),
  async (req, res) => {
    try {
      const matter = await req.db.matter.findFirst({
        where: { tenantId: req.tenantId, id: req.params.matterId },
        select: { clientId: true },
      });
      if (!matter) { res.status(404).json({ error: 'Matter not found' }); return; }

      if (!req.tenantId) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const ref    = `DRN-${Date.now().toString(36).toUpperCase()}`;
      const amount = parseFloat(req.body.amount) || 0;
      const drn = await req.db.disbursementRequestNote.create({
        data: {
          tenantId:    req.tenantId,
          matterId:    req.params.matterId,
          clientId:    matter.clientId,
          reference:   ref,
          description: req.body.description || req.body.disbursementType || 'Disbursement',
          amount,
          currency:    req.body.currency || 'KES',
          status:      'DRAFT',
          createdById: req.user?.sub ?? null,
        },
      });

      // Notify lead advocate if client trust balance is below DRN amount
      void (async () => {
        try {
          const fullMatter = await req.db.matter.findFirst({
            where: { tenantId: req.tenantId, id: req.params.matterId },
            select: { trustBalance: true, leadAdvocateId: true, title: true, matterCode: true },
          });
          if (fullMatter && fullMatter.leadAdvocateId) {
            const trust = parseFloat(String(fullMatter.trustBalance ?? 0));
            if (trust < amount) {
              await req.db.notification.create({
                data: {
                  tenantId:      req.tenantId!,
                  userId:        fullMatter.leadAdvocateId,
                  channel:       'SYSTEM_ALERT',
                  systemTitle:   'Insufficient Trust Balance for DRN',
                  systemMessage: `DRN ${ref} for ${req.body.currency || 'KES'} ${amount.toLocaleString()} submitted on matter ${fullMatter.matterCode ?? req.params.matterId} — trust balance (${trust.toLocaleString()}) is below the requested amount. A new client deposit (DRN) may be required.`,
                  status:        'PENDING',
                },
              });
            }
          }
        } catch { /* non-fatal */ }
      })();

      res.status(201).json({ success: true, data: drn });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  }
);

// ── Disbursement Actions ────────────────────────────────────────────────────────
router.patch(
  '/:matterId/disbursements/:disbursementId/approve',
  requirePermissions(PERMISSIONS.matter.updateMatter),
  async (req, res) => {
    try {
      const result = await req.db.disbursementRequestNote.updateMany({
        where: { tenantId: req.tenantId, matterId: req.params.matterId, id: req.params.disbursementId, status: 'DRAFT' },
        data: { status: 'APPROVED' },
      });
      res.json({ success: true, updated: result.count });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  }
);

router.patch(
  '/:matterId/disbursements/:disbursementId/reject',
  requirePermissions(PERMISSIONS.matter.updateMatter),
  async (req, res) => {
    try {
      const result = await req.db.disbursementRequestNote.updateMany({
        where: { tenantId: req.tenantId, matterId: req.params.matterId, id: req.params.disbursementId, status: 'DRAFT' },
        data: { status: 'REJECTED' },
      });
      res.json({ success: true, updated: result.count });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  }
);

router.patch(
  '/:matterId/disbursements/:disbursementId/mark-paid',
  requirePermissions(PERMISSIONS.matter.updateMatter),
  async (req, res) => {
    try {
      const result = await req.db.disbursementRequestNote.updateMany({
        where: { tenantId: req.tenantId, matterId: req.params.matterId, id: req.params.disbursementId, status: 'APPROVED' },
        data: { status: 'SETTLED' },
      });
      res.json({ success: true, updated: result.count });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  }
);

// ── Expense Entries ─────────────────────────────────────────────────────────────
router.get(
  '/:matterId/expenses',
  requirePermissions(PERMISSIONS.matter.viewMatter),
  async (req, res) => {
    try {
      const { matterId } = req.params;
      const expenses = await req.db.expenseEntry.findMany({
        where: { tenantId: req.tenantId, matterId },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { expenseDate: 'desc' },
        take: 100,
      });
      // Determine which expenses have already been invoiced via InvoiceLine sourceType
      const billedIds = new Set(
        (await req.db.invoiceLine.findMany({
          where: { tenantId: req.tenantId, sourceType: 'EXPENSE', sourceId: { in: expenses.map((e: any) => e.id) } },
          select: { sourceId: true },
        })).map((l: any) => l.sourceId)
      );
      res.json({ data: expenses.map((e: any) => ({ ...e, isInvoiced: billedIds.has(e.id) })) });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  }
);

// ── Matter Updates (Timeline) ────────────────────────────────────────────────
router.get(
  '/:matterId/updates',
  requirePermissions(PERMISSIONS.matter.viewMatter),
  async (req, res) => {
    try {
      const updates = await req.db.matterUpdate.findMany({
        where: { tenantId: req.tenantId, matterId: req.params.matterId },
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      res.json({ data: updates });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  }
);

router.post(
  '/:matterId/updates',
  requirePermissions(PERMISSIONS.matter.updateMatter),
  async (req, res) => {
    try {
      const { content, updateType = 'GENERAL', isClientVisible = false, notifyClient = false, bringUpDate } = req.body as {
        content: string; updateType?: string; isClientVisible?: boolean; notifyClient?: boolean; bringUpDate?: string;
      };
      if (!content?.trim()) return res.status(400).json({ error: 'Content is required' });

      const actorId = (req as any).user?.id ?? (req as any).user?.sub;

      const update = await req.db.matterUpdate.create({
        data: {
          tenantId: req.tenantId,
          matterId: req.params.matterId,
          userId: actorId,
          content: content.trim(),
          updateType,
          isClientVisible,
          notifyClient,
        },
        include: { author: { select: { id: true, name: true } } },
      });

      // Bring-Up date → create a calendar event on the matter so it follows the
      // calendar's reminder rules. GENERAL type, 09:00–10:00 on the chosen day.
      let calendarEvent: any = null;
      const bu = bringUpDate ? new Date(bringUpDate) : null;
      if (bu && !isNaN(bu.getTime())) {
        const startTime = new Date(bu);
        // Honor the picked time; only default to 09:00 if a date-only value was sent.
        if (!/T\d/.test(bringUpDate as string)) startTime.setHours(9, 0, 0, 0);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
        calendarEvent = await CalendarService.createEvent(req.db, {
          tenantId: req.tenantId,
          creatorId: actorId,
          title: `Bring-Up: ${updateType.replace(/_/g, ' ')}`,
          description: content.trim(),
          startTime,
          endTime,
          type: 'GENERAL',
          matterId: req.params.matterId,
        } as any).catch((err: unknown) => {
          // Don't lose the posted update if event creation fails; surface a flag.
          console.error('BRING_UP_EVENT_FAILED', { matterId: req.params.matterId, error: String(err) });
          return null;
        });
      }

      res.json({ success: true, data: update, calendarEvent, bringUpScheduled: Boolean(calendarEvent) });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  }
);

router.patch(
  '/:matterId/updates/:updateId',
  requirePermissions(PERMISSIONS.matter.updateMatter),
  async (req, res) => {
    try {
      const { isClientVisible } = req.body as { isClientVisible: boolean };
      const update = await req.db.matterUpdate.updateMany({
        where: { id: req.params.updateId, matterId: req.params.matterId, tenantId: req.tenantId },
        data: { isClientVisible },
      });
      res.json({ success: true, data: update });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  }
);

// ── Time Entries ─────────────────────────────────────────────────────────────
router.get(
  '/:matterId/time-entries',
  requirePermissions(PERMISSIONS.matter.viewMatter),
  async (req, res) => {
    try {
      const entries = await req.db.timeEntry.findMany({
        where: { tenantId: req.tenantId, matterId: req.params.matterId },
        include: { advocate: { select: { id: true, name: true } } },
        orderBy: { entryDate: 'desc' },
        take: 200,
      });
      res.json({ data: entries });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  }
);

// Record a time entry directly on a matter (manual capture).
router.post(
  '/:matterId/time-entries',
  requirePermissions(PERMISSIONS.matter.createTimeEntry),
  async (req, res) => {
    try {
      const { matterId } = req.params;
      const { description, entryDate, durationHours, durationMinutes, appliedRate, isBillable = true } = req.body as {
        description?: string; entryDate?: string; durationHours?: number | string;
        durationMinutes?: number | string; appliedRate?: number | string; isBillable?: boolean;
      };

      const hours = parseFloat(String(durationHours ?? 0));
      const mins = parseInt(String(durationMinutes ?? 0)) || 0;
      const totalHours = hours + mins / 60;
      const rate = parseFloat(String(appliedRate ?? 0));
      if (totalHours <= 0) return res.status(400).json({ error: 'Duration must be greater than zero' });

      const matter = await req.db.matter.findFirst({
        where: { id: matterId, tenantId: req.tenantId },
        select: { branchId: true },
      });
      if (!matter) return res.status(404).json({ error: 'Matter not found' });

      const actorId = (req as any).user?.id ?? (req as any).user?.sub;
      const entry = await req.db.timeEntry.create({
        data: {
          tenantId: req.tenantId,
          matterId,
          advocateId: actorId,
          branchId: matter.branchId ?? null,
          description: description?.trim() || null,
          entryDate: entryDate ? new Date(entryDate) : new Date(),
          durationHours: hours,
          durationMinutes: mins,
          appliedRate: rate,
          billableAmount: Math.round(totalHours * rate * 100) / 100,
          isBillable,
          status: 'DRAFT' as any,
        },
        include: { advocate: { select: { id: true, name: true } } },
      });
      res.json({ data: entry });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  }
);

// ── Raise Invoice from billable items ────────────────────────────────────────
router.post(
  '/:matterId/raise-invoice',
  requirePermissions(PERMISSIONS.billing.createInvoice),
  async (req, res) => {
    try {
      const { matterId } = req.params;
      const { timeEntryIds = [], expenseIds = [], dueDate, notes } = req.body as {
        timeEntryIds?: string[]; expenseIds?: string[];
        dueDate?: string; notes?: string;
      };

      if (!timeEntryIds.length && !expenseIds.length) {
        return res.status(400).json({ error: 'Select at least one billable item' });
      }

      const matter = await req.db.matter.findFirst({
        where: { id: matterId, tenantId: req.tenantId },
        select: { clientId: true, branchId: true, client: { select: { currency: true } } },
      });
      if (!matter) return res.status(404).json({ error: 'Matter not found' });
      const matterCurrency = (matter as any).client?.currency ?? 'KES';

      const [timeEntries, expenses] = await Promise.all([
        timeEntryIds.length
          ? req.db.timeEntry.findMany({
              where: { id: { in: timeEntryIds }, tenantId: req.tenantId, matterId, isInvoiced: false },
            })
          : Promise.resolve([]),
        expenseIds.length
          ? req.db.expenseEntry.findMany({
              where: { id: { in: expenseIds }, tenantId: req.tenantId, matterId },
            })
          : Promise.resolve([]),
      ]);

      // Server-side double-bill guard: drop any expense already on an invoice line.
      const alreadyBilledExpenseIds: Set<string> = expenseIds.length
        ? new Set((await req.db.invoiceLine.findMany({
            where: { tenantId: req.tenantId, sourceType: 'EXPENSE', sourceId: { in: expenseIds } },
            select: { sourceId: true },
          })).map((l: any) => l.sourceId))
        : new Set<string>();
      const billableExpenses = (expenses as any[]).filter((e: any) => !alreadyBilledExpenseIds.has(e.id));

      // VAT: professional fees (time) are taxable at 16%; expenses/disbursements pass through VAT-free.
      const VAT_RATE = 16;
      const feesBase = (timeEntries as any[]).reduce((s: number, t: any) => s + parseFloat(String(t.billableAmount ?? 0)), 0);
      const expensesBase = billableExpenses.reduce((s: number, e: any) => s + parseFloat(String(e.amount ?? 0)), 0);
      const subTotal = feesBase + expensesBase;
      const vatAmount = Math.round(feesBase * VAT_RATE) / 100;
      const total = subTotal + vatAmount;

      // Allocate invoice number
      const year = new Date().getFullYear();
      const count = await req.db.invoice.count({
        where: { tenantId: req.tenantId, issuedDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
      });
      const invoiceNumber = `INV-${year}-${String(count + 1).padStart(6, '0')}`;

      const invoice = await req.db.$transaction(async (tx: any) => {
        const inv = await tx.invoice.create({
          data: {
            tenantId: req.tenantId,
            matterId,
            clientId: matter.clientId,
            branchId: matter.branchId,
            currency: matterCurrency,
            invoiceNumber,
            subTotal,
            vatAmount,
            taxAmount: vatAmount,
            total,
            balanceDue: total,
            paidAmount: 0,
            netAmount: total,
            status: 'DRAFT',
            issuedDate: new Date(),
            ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
            ...(notes ? { notes } : {}),
            lines: {
              create: [
                ...(timeEntries as any[]).map((t: any) => {
                  const base = parseFloat(String(t.billableAmount ?? 0));
                  const tax = Math.round(base * VAT_RATE) / 100;
                  return {
                    tenantId: req.tenantId,
                    matterId,
                    description: t.description ?? 'Professional Fees',
                    quantity: parseFloat(String(t.durationHours ?? 0)) + parseFloat(String(t.durationMinutes ?? 0)) / 60,
                    unitPrice: parseFloat(String(t.appliedRate ?? 0)),
                    subTotal: base,
                    taxRate: VAT_RATE,
                    taxAmount: tax,
                    total: base + tax,
                    sourceType: 'TIME_ENTRY',
                    sourceId: t.id,
                  };
                }),
                ...billableExpenses.map((e: any) => ({
                  tenantId: req.tenantId,
                  matterId,
                  description: e.description ?? 'Expense (disbursement)',
                  quantity: 1,
                  unitPrice: parseFloat(String(e.amount ?? 0)),
                  subTotal: parseFloat(String(e.amount ?? 0)),
                  taxRate: 0,
                  taxAmount: 0,
                  total: parseFloat(String(e.amount ?? 0)),
                  sourceType: 'EXPENSE',
                  sourceId: e.id,
                })),
              ],
            },
          },
          include: { lines: true },
        });

        // Mark time entries as invoiced
        if ((timeEntries as any[]).length) {
          await tx.timeEntry.updateMany({
            where: { id: { in: (timeEntries as any[]).map((t: any) => t.id) }, tenantId: req.tenantId },
            data: { isInvoiced: true, invoiceId: inv.id },
          });
        }

        return inv;
      });

      res.json({ success: true, data: invoice });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  }
);

// Cancel an unpaid invoice and RELEASE its billed items back to unbilled.
// Best-practice: locking time/expenses to an invoice must be reversible until paid.
router.post(
  '/:matterId/invoices/:invoiceId/cancel',
  requirePermissions(PERMISSIONS.billing.createInvoice),
  async (req, res) => {
    try {
      const { matterId, invoiceId } = req.params;
      const inv = await req.db.invoice.findFirst({
        where: { id: invoiceId, tenantId: req.tenantId, matterId },
        select: { id: true, status: true, paidAmount: true },
      });
      if (!inv) return res.status(404).json({ error: 'Invoice not found' });
      if (['PAID', 'PARTIALLY_PAID'].includes(inv.status) || parseFloat(String(inv.paidAmount ?? 0)) > 0) {
        return res.status(409).json({ error: 'Cannot cancel an invoice that has payments; reverse the payment first', code: 'INVOICE_HAS_PAYMENTS' });
      }
      if (inv.status === 'CANCELLED') return res.json({ success: true, data: { id: inv.id, status: 'CANCELLED' } });

      await req.db.$transaction(async (tx: any) => {
        // Release time entries back to unbilled.
        await tx.timeEntry.updateMany({
          where: { invoiceId: inv.id, tenantId: req.tenantId },
          data: { isInvoiced: false, invoiceId: null },
        });
        // Remove lines so linked expenses are released (the EXPENSE double-bill guard keys off invoice lines).
        await tx.invoiceLine.deleteMany({ where: { invoiceId: inv.id, tenantId: req.tenantId } });
        await tx.invoice.update({
          where: { id: inv.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancellationReason: (req.body?.reason as string) ?? 'Cancelled — billed items released',
            balanceDue: 0,
          },
        });
      });
      res.json({ success: true, data: { id: inv.id, status: 'CANCELLED' } });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  }
);

// Submit a DRAFT invoice for approval — raises a BILLING approval request and
// moves the invoice to PENDING_APPROVAL. Decision happens in the Approvals inbox;
// the approval approve/reject hook flips the invoice to INVOICED / back to DRAFT.
router.post(
  '/:matterId/invoices/:invoiceId/submit',
  requirePermissions(PERMISSIONS.billing.createInvoice),
  async (req, res) => {
    try {
      const { matterId, invoiceId } = req.params;
      const inv = await req.db.invoice.findFirst({
        where: { id: invoiceId, tenantId: req.tenantId, matterId },
        select: { id: true, status: true, invoiceNumber: true, total: true, currency: true, clientId: true },
      });
      if (!inv) return res.status(404).json({ error: 'Invoice not found' });
      if (inv.status !== 'DRAFT') {
        return res.status(409).json({ error: `Only draft invoices can be submitted (current: ${inv.status})`, code: 'INVOICE_NOT_DRAFT' });
      }

      const actorId = (req as any).user?.id ?? (req as any).user?.sub;
      const result = await req.db.$transaction(async (tx: any) => {
        const approval = await tx.approval.create({
          data: {
            tenantId: req.tenantId,
            module: 'BILLING' as any,
            entityType: 'INVOICE',
            entityId: inv.id,
            currentState: 'DRAFT' as any,
            nextState: 'APPROVED' as any,
            action: 'SUBMIT' as any,
            status: 'PENDING' as any,
            requestedById: actorId,
            metadata: {
              invoiceNumber: inv.invoiceNumber,
              total: String(inv.total),
              currency: inv.currency,
              matterId,
              clientId: inv.clientId,
            },
          },
        });
        await tx.invoice.update({ where: { id: inv.id }, data: { status: 'PENDING_APPROVAL' } });
        return approval;
      });

      res.json({ success: true, data: { invoiceId: inv.id, status: 'PENDING_APPROVAL', approvalId: result.id } });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  }
);
