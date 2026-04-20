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