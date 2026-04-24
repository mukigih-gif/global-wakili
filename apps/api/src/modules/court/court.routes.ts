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

export default router;