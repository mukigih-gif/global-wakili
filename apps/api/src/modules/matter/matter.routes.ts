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

const router = Router();

const matterListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(200).optional(),
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
      res.json({ success: true, data: shaped });
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
      res.json({ success: true, data: expenses.map((e: any) => ({ ...e, isInvoiced: billedIds.has(e.id) })) });
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
      res.json({ success: true, data: entries });
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
        select: { clientId: true, currency: true, branchId: true },
      });
      if (!matter) return res.status(404).json({ error: 'Matter not found' });

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

      const subTotal =
        (timeEntries as any[]).reduce((s: number, t: any) => s + parseFloat(String(t.billableAmount ?? 0)), 0) +
        (expenses as any[]).reduce((s: number, e: any) => s + parseFloat(String(e.amount ?? 0)), 0);

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
            currency: matter.currency ?? 'KES',
            invoiceNumber,
            subTotal,
            total: subTotal,
            balanceDue: subTotal,
            paidAmount: 0,
            netAmount: subTotal,
            status: 'DRAFT',
            issuedDate: new Date(),
            ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
            ...(notes ? { notes } : {}),
            lines: {
              create: [
                ...(timeEntries as any[]).map((t: any) => ({
                  tenantId: req.tenantId,
                  matterId,
                  description: t.description ?? 'Professional Fees',
                  quantity: parseFloat(String(t.durationHours ?? 0)) + parseFloat(String(t.durationMinutes ?? 0)) / 60,
                  unitPrice: parseFloat(String(t.appliedRate ?? 0)),
                  subTotal: parseFloat(String(t.billableAmount ?? 0)),
                  total: parseFloat(String(t.billableAmount ?? 0)),
                  sourceType: 'TIME_ENTRY',
                  sourceId: t.id,
                })),
                ...(expenses as any[]).map((e: any) => ({
                  tenantId: req.tenantId,
                  matterId,
                  description: e.description ?? 'Expense',
                  quantity: 1,
                  unitPrice: parseFloat(String(e.amount ?? 0)),
                  subTotal: parseFloat(String(e.amount ?? 0)),
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
