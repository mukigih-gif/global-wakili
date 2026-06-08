// apps/api/src/modules/court/court.routes.ts

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requirePermissions } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { PERMISSIONS } from '../../config/permissions';
import {
  createCourtHearing,
  getCourtCapabilities,
  getCourtDashboard,
  getCourtHearing,
  recordCourtOutcome,
  requestCourtBridge,
  searchCourtHearings,
  updateCourtHearing,
  updateCourtHearingStatus,
} from './court.controller';
import {
  courtBridgeRequestSchema,
  courtDashboardQuerySchema,
  courtHearingCreateSchema,
  courtHearingStatusUpdateSchema,
  courtHearingUpdateSchema,
  courtOutcomeSchema,
  courtSearchQuerySchema,
} from './court.validators';

const router = Router();

const bridgeParamSchema = z.object({
  hearingId: z.string().trim().min(1),
  type: z.enum(['FILING', 'PLEADING', 'DOCUMENT', 'TASK', 'NOTIFICATION']),
});

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'court',
    status: 'mounted',
    service: 'global-wakili-api',
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

router.post(
  '/hearings',
  requirePermissions(PERMISSIONS.court.createHearing),
  validate({ body: courtHearingCreateSchema }),
  createCourtHearing,
);

router.get(
  '/hearings/search',
  requirePermissions(PERMISSIONS.court.searchHearing),
  validate({ query: courtSearchQuerySchema }),
  searchCourtHearings,
);

router.get(
  '/dashboard',
  requirePermissions(PERMISSIONS.court.viewDashboard),
  validate({ query: courtDashboardQuerySchema }),
  getCourtDashboard,
);

router.get(
  '/capabilities',
  requirePermissions(PERMISSIONS.court.viewDashboard),
  getCourtCapabilities,
);

router.get(
  '/hearings/:hearingId',
  requirePermissions(PERMISSIONS.court.viewHearing),
  getCourtHearing,
);

router.patch(
  '/hearings/:hearingId',
  requirePermissions(PERMISSIONS.court.updateHearing),
  validate({ body: courtHearingUpdateSchema }),
  updateCourtHearing,
);

router.post(
  '/hearings/:hearingId/status',
  requirePermissions(PERMISSIONS.court.updateHearing),
  validate({ body: courtHearingStatusUpdateSchema }),
  updateCourtHearingStatus,
);

router.post(
  '/hearings/:hearingId/outcome',
  requirePermissions(PERMISSIONS.court.recordOutcome),
  validate({ body: courtOutcomeSchema }),
  recordCourtOutcome,
);

router.post(
  '/hearings/:hearingId/bridge/:type',
  requirePermissions(PERMISSIONS.court.manageHandoff),
  validate({ params: bridgeParamSchema, body: courtBridgeRequestSchema }),
  requestCourtBridge,
);

// ── Court Filings (CourtFiling model) ─────────────────────────────────────────

router.get(
  '/filings/dashboard',
  requirePermissions(PERMISSIONS.court.viewDashboard),
  async (req: Request, res: Response) => {
    try {
      const now = new Date();
      const weekOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const [total, overdueCount, dueSoonCount, filedCount] = await Promise.all([
        req.db.courtFiling.count({ where: { tenantId: req.tenantId } }),
        req.db.courtFiling.count({ where: { tenantId: req.tenantId, dueDate: { lt: now }, status: { notIn: ['FILED', 'RECEIVED_BY_COURT', 'COMPLETED'] } } }),
        req.db.courtFiling.count({ where: { tenantId: req.tenantId, dueDate: { gte: now, lte: weekOut } } }),
        req.db.courtFiling.count({ where: { tenantId: req.tenantId, status: 'FILED' } }),
      ]);
      res.json({ totalFilings: total, overdueCount, dueSoonCount, statusBreakdown: { FILED: filedCount } });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  }
);

router.get(
  '/filings',
  requirePermissions(PERMISSIONS.court.viewDashboard),
  async (req: Request, res: Response) => {
    try {
      const { status, filingType, matterId, limit = '50', skip = '0' } = req.query as Record<string, string>;
      const filings = await req.db.courtFiling.findMany({
        where: {
          tenantId: req.tenantId,
          ...(status     ? { status:      status as any }     : {}),
          ...(filingType ? { filingType:  filingType as any }  : {}),
          ...(matterId   ? { matterId }                        : {}),
        },
        include: {
          matter:   { select: { id: true, title: true, matterCode: true } },
          filedBy:  { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(parseInt(limit) || 50, 200),
        skip: parseInt(skip) || 0,
      });
      res.json({ data: filings });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  }
);

router.post(
  '/filings',
  requirePermissions(PERMISSIONS.court.createHearing),
  async (req: Request, res: Response) => {
    try {
      const { title, filingType, matterId, dueDate, courtRef, notes } = req.body;
      if (!title || !matterId) { res.status(400).json({ error: 'title and matterId are required' }); return; }
      const filing = await req.db.courtFiling.create({
        data: {
          tenantId:    req.tenantId!,
          matterId,
          title,
          filingType:  (filingType as any) ?? 'OTHER',
          status:      'PREPARED',
          courtRef:    courtRef ?? null,
          dueDate:     dueDate ? new Date(dueDate) : null,
          notes:       notes ?? null,
          filedById:   req.user?.sub ?? null,
        },
        include: {
          matter:  { select: { id: true, title: true, matterCode: true } },
          filedBy: { select: { id: true, name: true } },
        },
      });
      res.status(201).json({ success: true, data: filing });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  }
);

router.patch(
  '/filings/:filingId/status',
  requirePermissions(PERMISSIONS.court.updateHearing),
  async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      const updates: any = { status };
      if (status === 'FILED') updates.filedAt = new Date();
      if (status === 'RECEIVED_BY_COURT') updates.receivedAt = new Date();
      await req.db.courtFiling.updateMany({
        where: { tenantId: req.tenantId, id: req.params.filingId },
        data:  updates,
      });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  }
);

// ── Court Hearings filter by matter ───────────────────────────────────────────

router.get(
  '/hearings',
  requirePermissions(PERMISSIONS.court.viewDashboard),
  async (req: Request, res: Response) => {
    try {
      const { matterId, limit = '50' } = req.query as Record<string, string>;
      const hearings = await req.db.courtHearing.findMany({
        where: { tenantId: req.tenantId, ...(matterId ? { matterId } : {}) },
        orderBy: { hearingDate: 'desc' },
        take: Math.min(parseInt(limit) || 50, 200),
      });
      res.json({ data: hearings });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  }
);

export default router;