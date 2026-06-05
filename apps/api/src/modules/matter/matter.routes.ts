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
        include: {
          requestedBy: { select: { id: true, name: true } },
          approvedBy:  { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: drns });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  }
);

router.post(
  '/:matterId/disbursements',
  requirePermissions(PERMISSIONS.matter.viewMatter),
  async (req, res) => {
    try {
      const drn = await req.db.disbursementRequestNote.create({
        data: {
          tenantId:         req.tenantId,
          matterId:         req.params.matterId,
          disbursementType: req.body.disbursementType || 'OTHER',
          description:      req.body.description,
          amount:           parseFloat(req.body.amount) || 0,
          currency:         req.body.currency || 'KES',
          requestNote:      req.body.requestNote || req.body.notes || '',
          status:           'PENDING',
          requestedById:    req.user.sub,
        },
      });
      res.status(201).json({ success: true, data: drn });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  }
);

// ── Expense Entries ─────────────────────────────────────────────────────────────
router.get(
  '/:matterId/expenses',
  requirePermissions(PERMISSIONS.matter.viewMatter),
  async (req, res) => {
    try {
      const expenses = await req.db.expenseEntry.findMany({
        where: { tenantId: req.tenantId, matterId: req.params.matterId },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { expenseDate: 'desc' },
        take: 50,
      });
      res.json({ success: true, data: expenses });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  }
);
