import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate';
import { requirePermissions } from '../../middleware/rbac';
import { bindPlatformModuleEnforcement } from '../../middleware/platform-access.middleware';
import { platformFeatureFlag } from '../../middleware/platform-feature-flag.middleware';
import { PLATFORM_FEATURE_KEYS } from '../platform/PlatformFeatureKeys';
import {
  createTrustTransaction,
  emitTrustAlerts,
  getReconciliationMatches,
  getTrustAccountSnapshot,
  getTrustAccountView,
  getTrustAlerts,
  getTrustDashboard,
  getTrustOverview,
  getTrustStatement,
  getTrustViolations,
  listTrustReconciliations,
  postTrustInterest,
  recordTrustReconciliation,
  runThreeWayReconciliation,
  transferTrustToOffice,
} from './trust.controller';
import {
  trustTransactionInputSchema,
  trustTransferInputSchema,
} from './trust.validators';

const router = Router();

bindPlatformModuleEnforcement(router, {
  moduleKey: 'trust',
  metricType: 'API_REQUESTS',
});

const trustStatementExportFeature = platformFeatureFlag(
  PLATFORM_FEATURE_KEYS.TRUST_STATEMENT_EXPORTS,
  'trust',
);

const reconciliationBodySchema = z.object({
  trustAccountId: z.string().trim().min(1),
  statementDate: z.coerce.date(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const reconciliationListQuerySchema = z.object({
  trustAccountId: z.string().trim().min(1).optional(),
});

const snapshotQuerySchema = z.object({
  statementDate: z.string().datetime(),
});

const statementQuerySchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  format: z.enum(['json', 'csv']).optional(),
});

const accountViewQuerySchema = z.object({
  statementDate: z.string().datetime().optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
});

const threeWayBodySchema = z.object({
  trustAccountId: z.string().trim().min(1),
  statementDate: z.coerce.date(),
  tolerance: z.union([z.string(), z.number()]).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const interestBodySchema = z.object({
  trustAccountId: z.string().trim().min(1),
  clientId: z.string().trim().min(1),
  matterId: z.string().trim().min(1).optional().nullable(),
  amount: z.union([z.string(), z.number()]),
  transactionDate: z.coerce.date(),
  reference: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).optional().nullable(),
});

router.post(
  '/transactions',
  requirePermissions(['trust.create_transaction']),
  validate({ body: trustTransactionInputSchema }),
  createTrustTransaction,
);

router.post(
  '/transfers/to-office',
  requirePermissions(['trust.transfer_to_office']),
  validate({ body: trustTransferInputSchema }),
  transferTrustToOffice,
);

router.post(
  '/interest',
  requirePermissions(['trust.post_interest']),
  validate({ body: interestBodySchema }),
  postTrustInterest,
);

router.get(
  '/dashboard',
  requirePermissions(['trust.view_dashboard']),
  getTrustDashboard,
);

router.get(
  '/overview',
  requirePermissions(['trust.view_dashboard']),
  getTrustOverview,
);

router.get(
  '/alerts',
  requirePermissions(['trust.view_alerts']),
  getTrustAlerts,
);

router.post(
  '/alerts/emit',
  requirePermissions(['trust.emit_alerts']),
  emitTrustAlerts,
);

router.get(
  '/accounts/:trustAccountId/statement',
  trustStatementExportFeature,
  requirePermissions(['trust.view_statement']),
  validate({ query: statementQuerySchema }),
  getTrustStatement,
);

router.get(
  '/accounts/:trustAccountId/view',
  trustStatementExportFeature,
  requirePermissions(['trust.view_statement']),
  validate({ query: accountViewQuerySchema }),
  getTrustAccountView,
);

router.get(
  '/accounts/:trustAccountId/snapshot',
  trustStatementExportFeature,
  requirePermissions(['trust.view_reconciliation']),
  validate({ query: snapshotQuerySchema }),
  getTrustAccountSnapshot,
);

router.post(
  '/reconciliations',
  requirePermissions(['trust.record_reconciliation']),
  validate({ body: reconciliationBodySchema }),
  recordTrustReconciliation,
);

router.get(
  '/reconciliations',
  requirePermissions(['trust.view_reconciliation']),
  validate({ query: reconciliationListQuerySchema }),
  listTrustReconciliations,
);

router.get(
  '/reconciliations/:runId/matches',
  requirePermissions(['trust.view_reconciliation']),
  getReconciliationMatches,
);

router.post(
  '/reconciliations/three-way',
  requirePermissions(['trust.run_three_way_reconciliation']),
  validate({ body: threeWayBodySchema }),
  runThreeWayReconciliation,
);

router.get(
  '/violations',
  requirePermissions(['trust.view_violations']),
  getTrustViolations,
);

// ── Trust Account Management ──────────────────────────────────────────────────

router.get(
  '/accounts',
  requirePermissions(['trust.view_dashboard']),
  async (req: Request, res: Response) => {
    try {
      const accounts = await req.db.trustAccount.findMany({
        where: { tenantId: req.tenantId },
        orderBy: { createdAt: 'asc' },
      });
      res.json({ success: true, data: accounts });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  }
);

router.post(
  '/accounts',
  requirePermissions(['trust.create_transaction']),
  async (req: Request, res: Response) => {
    try {
      const { accountName, accountNumber, bankName, currency = 'KES', custodian } = req.body;
      if (!accountName || !accountNumber || !bankName) {
        res.status(400).json({ error: 'accountName, accountNumber, and bankName are required' }); return;
      }
      const account = await req.db.trustAccount.create({
        data: {
          tenantId:              req.tenantId!,
          accountName,
          accountNumber,
          bankName,
          currency,
          custodian:             custodian ?? null,
          currentBalance:        0,
          reconciliationBalance: 0,
          isActive:              true,
        },
      });
      res.status(201).json({ success: true, data: account });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  }
);

router.patch(
  '/accounts/:accountId/archive',
  requirePermissions(['trust.create_transaction']),
  async (req: Request, res: Response) => {
    try {
      await req.db.trustAccount.updateMany({
        where: { tenantId: req.tenantId, id: req.params.accountId },
        data: { isActive: false },
      });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  }
);

export default router;