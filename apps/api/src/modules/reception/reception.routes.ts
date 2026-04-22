// apps/api/src/modules/reception/reception.routes.ts

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requirePermissions } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { PERMISSIONS } from '../../config/permissions';
import {
  createCallLog,
  createFileReceipt,
  createVisitorLog,
  getReceptionCapabilities,
  getReceptionDashboard,
  getReceptionLog,
  requestReceptionHandoff,
  searchReceptionLogs,
} from './reception.controller';
import {
  callLogSchema,
  fileReceiptSchema,
  receptionDashboardQuerySchema,
  receptionHandoffSchema,
  receptionSearchQuerySchema,
  visitorLogSchema,
} from './reception.validators';

const router = Router();

const handoffParamSchema = z.object({
  logId: z.string().trim().min(1),
  type: z.enum([
    'CLIENT_ONBOARDING',
    'MATTER_OPENING',
    'TASK',
    'DOCUMENT',
    'NOTIFICATION',
  ]),
});

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'reception',
    status: 'mounted',
    service: 'global-wakili-api',
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

router.post(
  '/visitors',
  requirePermissions(PERMISSIONS.reception.createVisitorLog),
  validate({ body: visitorLogSchema }),
  createVisitorLog,
);

router.post(
  '/calls',
  requirePermissions(PERMISSIONS.reception.createCallLog),
  validate({ body: callLogSchema }),
  createCallLog,
);

router.post(
  '/file-receipts',
  requirePermissions(PERMISSIONS.reception.receiveFile),
  validate({ body: fileReceiptSchema }),
  createFileReceipt,
);

router.get(
  '/search',
  requirePermissions(PERMISSIONS.reception.searchLog),
  validate({ query: receptionSearchQuerySchema }),
  searchReceptionLogs,
);

router.get(
  '/dashboard',
  requirePermissions(PERMISSIONS.reception.viewDashboard),
  validate({ query: receptionDashboardQuerySchema }),
  getReceptionDashboard,
);

router.get(
  '/capabilities',
  requirePermissions(PERMISSIONS.reception.viewDashboard),
  getReceptionCapabilities,
);

router.post(
  '/:logId/handoff/:type',
  requirePermissions(PERMISSIONS.reception.manageHandoff),
  validate({ params: handoffParamSchema, body: receptionHandoffSchema }),
  requestReceptionHandoff,
);

router.get(
  '/:logId',
  requirePermissions(PERMISSIONS.reception.viewLog),
  getReceptionLog,
);

export default router;