// apps/api/src/modules/approval/approval.controller.ts

import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { ApprovalAuditService } from './ApprovalAuditService';
import { ApprovalCapabilityService } from './ApprovalCapabilityService';
import { ApprovalService } from './ApprovalService';

function requireTenantId(req: Request): string {
  if (!req.tenantId?.trim()) {
    throw Object.assign(new Error('Tenant context is required for approval workflow'), {
      statusCode: 400,
      code: 'APPROVAL_TENANT_CONTEXT_REQUIRED',
    });
  }

  return req.tenantId;
}

function requireUserId(req: Request): string {
  const userId = req.user?.sub;

  if (!userId?.trim()) {
    throw Object.assign(new Error('Authenticated user is required for approval workflow'), {
      statusCode: 401,
      code: 'APPROVAL_USER_CONTEXT_REQUIRED',
    });
  }

  return userId;
}

async function logApprovalAction(
  req: Request,
  action: Parameters<typeof ApprovalAuditService.logAction>[1]['action'],
  params?: {
    approvalId?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await ApprovalAuditService.logAction(req.db, {
    tenantId: requireTenantId(req),
    userId: req.user?.sub ?? null,
    approvalId: params?.approvalId ?? null,
    action,
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    metadata: params?.metadata ?? {},
  });
}

function parseSearchFilters(req: Request) {
  return {
    module: req.query.module ? (String(req.query.module) as any) : null,
    status: req.query.status ? (String(req.query.status) as any) : null,
    level: req.query.level ? (String(req.query.level) as any) : null,
    priority: req.query.priority ? (String(req.query.priority) as any) : null,
    approvalKey: req.query.approvalKey ? String(req.query.approvalKey) : null,
    version: req.query.version ? Number(req.query.version) : null,
    entityType: req.query.entityType ? String(req.query.entityType) : null,
    entityId: req.query.entityId ? String(req.query.entityId) : null,
    requestedById: req.query.requestedById ? String(req.query.requestedById) : null,
    assignedApproverId: req.query.assignedApproverId
      ? String(req.query.assignedApproverId)
      : null,
    approvedById: req.query.approvedById ? String(req.query.approvedById) : null,
    createdFrom: req.query.createdFrom ? String(req.query.createdFrom) : null,
    createdTo: req.query.createdTo ? String(req.query.createdTo) : null,
    deadlineFrom: req.query.deadlineFrom ? String(req.query.deadlineFrom) : null,
    deadlineTo: req.query.deadlineTo ? String(req.query.deadlineTo) : null,
  };
}

export const createApprovalRequest = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const userId = requireUserId(req);

  const result = await ApprovalService.createApproval(req.db, {
    tenantId,
    module: req.body.module,
    approvalKey: req.body.approvalKey,
    entityType: req.body.entityType,
    entityId: req.body.entityId,
    currentState: req.body.currentState,
    nextState: req.body.nextState,
    action: req.body.action,
    level: req.body.level,
    priority: req.body.priority,
    requestedById: req.body.requestedById ?? userId,
    assignedApproverId: req.body.assignedApproverId,
    comment: req.body.comment,
    decisionReason: req.body.decisionReason,
    beforeSnapshot: req.body.beforeSnapshot,
    afterSnapshot: req.body.afterSnapshot,
    metadata: req.body.metadata,
    deadlineAt: req.body.deadlineAt,
  });

  await logApprovalAction(req, 'REQUEST_CREATED', {
    approvalId: result.id,
    metadata: {
      module: result.module,
      entityType: result.entityType,
      entityId: result.entityId,
      version: result.version,
      level: result.level,
      priority: result.priority,
      status: result.status,
    },
  });

  res.status(201).json(result);
});

export const getApprovalRequest = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);

  const result = await ApprovalService.getApproval(req.db, {
    tenantId,
    approvalId: req.params.approvalId,
  });

  await logApprovalAction(req, 'REQUEST_VIEWED', {
    approvalId: result.id,
    metadata: {
      module: result.module,
      entityType: result.entityType,
      entityId: result.entityId,
      version: result.version,
      status: result.status,
    },
  });

  res.status(200).json(result);
});

export const searchApprovalRequests = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);

  const result = await ApprovalService.searchApprovals(req.db, {
    tenantId,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    filters: parseSearchFilters(req),
  });

  await logApprovalAction(req, 'REQUEST_SEARCHED', {
    metadata: {
      total: result.meta.total,
      page: result.meta.page,
      limit: result.meta.limit,
    },
  });

  res.status(200).json(result);
});

export const approveApprovalRequest = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const userId = requireUserId(req);

  const result = await ApprovalService.decideApproval(req.db, {
    tenantId,
    approvalId: req.params.approvalId,
    decidedByUserId: userId,
    action: 'APPROVE',
    comment: req.body.comment,
    rejectionReason: req.body.rejectionReason,
    decisionReason: req.body.decisionReason,
    afterSnapshot: req.body.afterSnapshot,
    metadata: req.body.metadata,
  });

  await logApprovalAction(req, 'REQUEST_APPROVED', {
    approvalId: result.id,
    metadata: {
      module: result.module,
      entityType: result.entityType,
      entityId: result.entityId,
      version: result.version,
      status: result.status,
    },
  });

  res.status(200).json(result);
});

export const rejectApprovalRequest = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const userId = requireUserId(req);

  const result = await ApprovalService.decideApproval(req.db, {
    tenantId,
    approvalId: req.params.approvalId,
    decidedByUserId: userId,
    action: 'REJECT',
    comment: req.body.comment,
    rejectionReason: req.body.rejectionReason,
    decisionReason: req.body.decisionReason,
    afterSnapshot: req.body.afterSnapshot,
    metadata: req.body.metadata,
  });

  await logApprovalAction(req, 'REQUEST_REJECTED', {
    approvalId: result.id,
    metadata: {
      module: result.module,
      entityType: result.entityType,
      entityId: result.entityId,
      version: result.version,
      status: result.status,
      rejectionReason: result.rejectionReason,
    },
  });

  res.status(200).json(result);
});

export const requestApprovalChanges = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const userId = requireUserId(req);

  const result = await ApprovalService.decideApproval(req.db, {
    tenantId,
    approvalId: req.params.approvalId,
    decidedByUserId: userId,
    action: 'REQUEST_CHANGES',
    comment: req.body.comment,
    rejectionReason: req.body.rejectionReason,
    decisionReason: req.body.decisionReason,
    afterSnapshot: req.body.afterSnapshot,
    metadata: req.body.metadata,
  });

  await logApprovalAction(req, 'REQUEST_REJECTED', {
    approvalId: result.id,
    metadata: {
      module: result.module,
      entityType: result.entityType,
      entityId: result.entityId,
      version: result.version,
      status: result.status,
      mode: 'REQUEST_CHANGES',
    },
  });

  res.status(200).json(result);
});

export const cancelApprovalRequest = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const userId = requireUserId(req);

  const result = await ApprovalService.decideApproval(req.db, {
    tenantId,
    approvalId: req.params.approvalId,
    decidedByUserId: userId,
    action: 'CANCEL',
    comment: req.body.comment,
    rejectionReason: req.body.rejectionReason,
    decisionReason: req.body.decisionReason,
    afterSnapshot: req.body.afterSnapshot,
    metadata: req.body.metadata,
  });

  await logApprovalAction(req, 'REQUEST_CANCELLED', {
    approvalId: result.id,
    metadata: {
      module: result.module,
      entityType: result.entityType,
      entityId: result.entityId,
      version: result.version,
      status: result.status,
    },
  });

  res.status(200).json(result);
});

export const escalateApprovalRequest = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const userId = requireUserId(req);

  const result = await ApprovalService.escalateApproval(req.db, {
    tenantId,
    approvalId: req.params.approvalId,
    escalatedByUserId: userId,
    escalatedToUserId: req.body.escalatedToUserId,
    escalationReason: req.body.escalationReason,
    level: req.body.level,
    priority: req.body.priority,
    metadata: req.body.metadata,
  });

  await logApprovalAction(req, 'REQUEST_ESCALATED', {
    approvalId: result.id,
    metadata: {
      module: result.module,
      entityType: result.entityType,
      entityId: result.entityId,
      version: result.version,
      status: result.status,
      escalatedTo: result.escalatedTo,
      level: result.level,
      priority: result.priority,
    },
  });

  res.status(200).json(result);
});

export const delegateApprovalRequest = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const userId = requireUserId(req);

  const result = await ApprovalService.delegateApproval(req.db, {
    tenantId,
    approvalId: req.params.approvalId,
    delegatedFromUserId: userId,
    delegatedToUserId: req.body.delegatedToUserId,
    comment: req.body.comment,
    metadata: req.body.metadata,
  });

  await logApprovalAction(req, 'REQUEST_DELEGATED', {
    approvalId: result.id,
    metadata: {
      module: result.module,
      entityType: result.entityType,
      entityId: result.entityId,
      version: result.version,
      status: result.status,
      delegatedFrom: result.delegatedFrom,
      delegatedTo: result.delegatedTo,
    },
  });

  res.status(200).json(result);
});

export const reassignApprovalRequest = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const userId = requireUserId(req);

  const result = await ApprovalService.reassignApproval(req.db, {
    tenantId,
    approvalId: req.params.approvalId,
    reassignedByUserId: userId,
    reassignedToUserId: req.body.reassignedToUserId,
    comment: req.body.comment,
    metadata: req.body.metadata,
  });

  await logApprovalAction(req, 'REQUEST_REASSIGNED', {
    approvalId: result.id,
    metadata: {
      module: result.module,
      entityType: result.entityType,
      entityId: result.entityId,
      version: result.version,
      status: result.status,
      assignedApproverId: result.assignedApproverId,
    },
  });

  res.status(200).json(result);
});

export const expireOverdueApprovalRequests = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);

  const result = await ApprovalService.expireOverdueApprovals(req.db, {
    tenantId,
  });

  await logApprovalAction(req, 'REQUEST_EXPIRED', {
    metadata: {
      affectedCount: result.count ?? 0,
    },
  });

  res.status(200).json({
    success: true,
    affectedCount: result.count ?? 0,
  });
});

export const getApprovalDashboard = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);

  const result = await ApprovalService.getDashboard(req.db, {
    tenantId,
  });

  await logApprovalAction(req, 'DASHBOARD_VIEWED', {
    metadata: {
      total: result.summary.total,
      urgent: result.summary.urgent,
      overdue: result.summary.overdue,
    },
  });

  res.status(200).json(result);
});

export const getApprovalCapabilities = asyncHandler(async (req: Request, res: Response) => {
  const result = ApprovalCapabilityService.getSummary();

  await logApprovalAction(req, 'CAPABILITY_VIEWED', {
    metadata: {
      active: result.active,
      pendingCrossModuleHooks: result.pendingCrossModuleHooks,
      pendingPolicyAutomation: result.pendingPolicyAutomation,
      pendingPlatform: result.pendingPlatform,
    },
  });

  res.status(200).json(result);
});