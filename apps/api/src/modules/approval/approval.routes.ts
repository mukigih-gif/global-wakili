// apps/api/src/modules/approval/approval.routes.ts

import { Router, type Request, type Response } from 'express';
import { PERMISSIONS } from '../../config/permissions';
import { requirePermissions } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import {
  approvalCreateSchema,
  approvalDecisionSchema,
  approvalDelegationSchema,
  approvalEscalationSchema,
  approvalIdParamSchema,
  approvalReassignmentSchema,
  approvalSearchQuerySchema,
} from './approval.validators';
import {
  approveApprovalRequest,
  cancelApprovalRequest,
  createApprovalRequest,
  delegateApprovalRequest,
  escalateApprovalRequest,
  expireOverdueApprovalRequests,
  getApprovalCapabilities,
  getApprovalDashboard,
  getApprovalRequest,
  reassignApprovalRequest,
  rejectApprovalRequest,
  requestApprovalChanges,
  searchApprovalRequests,
} from './approval.controller';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'approval',
    status: 'mounted',
    service: 'global-wakili-api',
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

router.get(
  '/dashboard',
  requirePermissions(PERMISSIONS.approval.viewDashboard),
  getApprovalDashboard,
);

router.get(
  '/capabilities',
  requirePermissions(PERMISSIONS.approval.viewDashboard),
  getApprovalCapabilities,
);

router.get(
  '/search',
  requirePermissions(PERMISSIONS.approval.searchRequests),
  validate({ query: approvalSearchQuerySchema }),
  searchApprovalRequests,
);

router.post(
  '/',
  requirePermissions(PERMISSIONS.approval.createRequest),
  validate({ body: approvalCreateSchema }),
  createApprovalRequest,
);

router.get(
  '/:approvalId',
  requirePermissions(PERMISSIONS.approval.viewRequest),
  validate({ params: approvalIdParamSchema }),
  getApprovalRequest,
);

router.post(
  '/:approvalId/approve',
  requirePermissions(PERMISSIONS.approval.approveRequest),
  validate({ params: approvalIdParamSchema, body: approvalDecisionSchema }),
  approveApprovalRequest,
);

router.post(
  '/:approvalId/reject',
  requirePermissions(PERMISSIONS.approval.rejectRequest),
  validate({ params: approvalIdParamSchema, body: approvalDecisionSchema }),
  rejectApprovalRequest,
);

router.post(
  '/:approvalId/request-changes',
  requirePermissions(PERMISSIONS.approval.requestChanges),
  validate({ params: approvalIdParamSchema, body: approvalDecisionSchema }),
  requestApprovalChanges,
);

router.post(
  '/:approvalId/cancel',
  requirePermissions(PERMISSIONS.approval.cancelRequest),
  validate({ params: approvalIdParamSchema, body: approvalDecisionSchema }),
  cancelApprovalRequest,
);

router.post(
  '/:approvalId/escalate',
  requirePermissions(PERMISSIONS.approval.escalateRequest),
  validate({ params: approvalIdParamSchema, body: approvalEscalationSchema }),
  escalateApprovalRequest,
);

router.post(
  '/:approvalId/delegate',
  requirePermissions(PERMISSIONS.approval.delegateRequest),
  validate({ params: approvalIdParamSchema, body: approvalDelegationSchema }),
  delegateApprovalRequest,
);

router.post(
  '/:approvalId/reassign',
  requirePermissions(PERMISSIONS.approval.reassignRequest),
  validate({ params: approvalIdParamSchema, body: approvalReassignmentSchema }),
  reassignApprovalRequest,
);

router.post(
  '/expire-overdue',
  requirePermissions(PERMISSIONS.approval.expireRequest),
  expireOverdueApprovalRequests,
);

export default router;