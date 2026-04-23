// apps/api/src/modules/approval/ApprovalService.ts

import type {
  ApprovalCreateInput,
  ApprovalDbClient,
  ApprovalDecisionInput,
  ApprovalDelegationInput,
  ApprovalEscalationInput,
  ApprovalReassignmentInput,
  ApprovalSearchFilters,
} from './approval.types';
import {
  APPROVAL_OPEN_STATUSES,
  APPROVAL_TERMINAL_STATUSES,
} from './approval.types';
import { ApprovalPolicyService } from './ApprovalPolicyService';

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for approval workflow'), {
      statusCode: 400,
      code: 'APPROVAL_TENANT_REQUIRED',
    });
  }
}

async function assertTenantExists(db: ApprovalDbClient, tenantId: string): Promise<void> {
  const tenant = await db.tenant.findFirst({
    where: { id: tenantId },
    select: { id: true },
  });

  if (!tenant) {
    throw Object.assign(new Error('Tenant not found for approval workflow'), {
      statusCode: 404,
      code: 'APPROVAL_TENANT_NOT_FOUND',
    });
  }
}

async function assertUserExists(
  db: ApprovalDbClient,
  userId?: string | null,
  tenantId?: string,
): Promise<void> {
  if (!userId?.trim()) return;

  const user = await db.user.findFirst({
    where: {
      id: userId,
      ...(tenantId ? { tenantId } : {}),
    },
    select: { id: true },
  });

  if (!user) {
    throw Object.assign(new Error(`Approval user not found: ${userId}`), {
      statusCode: 404,
      code: 'APPROVAL_USER_NOT_FOUND',
    });
  }
}

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;

  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid approval date'), {
      statusCode: 422,
      code: 'APPROVAL_DATE_INVALID',
    });
  }

  return parsed;
}

function assertDateRange(from?: Date | null, to?: Date | null): void {
  if (from && to && to.getTime() < from.getTime()) {
    throw Object.assign(new Error('Approval date range is invalid'), {
      statusCode: 422,
      code: 'APPROVAL_DATE_RANGE_INVALID',
    });
  }
}

function pageParams(page?: number, limit?: number) {
  const safePage = page && page > 0 ? page : 1;
  const safeLimit = limit && limit > 0 ? Math.min(limit, 100) : 50;

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
}

function buildSearchWhere(tenantId: string, filters?: ApprovalSearchFilters | null) {
  const andClauses: Record<string, unknown>[] = [{ tenantId }];

  if (filters?.module) andClauses.push({ module: filters.module });
  if (filters?.status) andClauses.push({ status: filters.status });
  if (filters?.level) andClauses.push({ level: filters.level });
  if (filters?.priority) andClauses.push({ priority: filters.priority });
  if (filters?.approvalKey) andClauses.push({ approvalKey: filters.approvalKey });
  if (filters?.version) andClauses.push({ version: filters.version });
  if (filters?.entityType) andClauses.push({ entityType: filters.entityType });
  if (filters?.entityId) andClauses.push({ entityId: filters.entityId });
  if (filters?.requestedById) andClauses.push({ requestedById: filters.requestedById });
  if (filters?.assignedApproverId) {
    andClauses.push({ assignedApproverId: filters.assignedApproverId });
  }
  if (filters?.approvedById) andClauses.push({ approvedBy: filters.approvedById });

  const createdFrom = normalizeDate(filters?.createdFrom);
  const createdTo = normalizeDate(filters?.createdTo);
  const deadlineFrom = normalizeDate(filters?.deadlineFrom);
  const deadlineTo = normalizeDate(filters?.deadlineTo);

  assertDateRange(createdFrom, createdTo);
  assertDateRange(deadlineFrom, deadlineTo);

  if (createdFrom || createdTo) {
    andClauses.push({
      createdAt: {
        ...(createdFrom ? { gte: createdFrom } : {}),
        ...(createdTo ? { lte: createdTo } : {}),
      },
    });
  }

  if (deadlineFrom || deadlineTo) {
    andClauses.push({
      deadlineAt: {
        ...(deadlineFrom ? { gte: deadlineFrom } : {}),
        ...(deadlineTo ? { lte: deadlineTo } : {}),
      },
    });
  }

  return { AND: andClauses };
}

function isOpenStatus(status: string): boolean {
  return (APPROVAL_OPEN_STATUSES as readonly string[]).includes(status);
}

function isTerminalStatus(status: string): boolean {
  return (APPROVAL_TERMINAL_STATUSES as readonly string[]).includes(status);
}

function assertOpenApproval(approval: any): void {
  if (!isOpenStatus(approval.status)) {
    throw Object.assign(
      new Error(`Approval request is no longer actionable from status ${approval.status}`),
      {
        statusCode: 409,
        code: 'APPROVAL_NOT_ACTIONABLE',
      },
    );
  }
}

function assertAssignableTarget(targetUserId: string, currentUserId?: string | null): void {
  if (currentUserId && targetUserId === currentUserId) {
    throw Object.assign(new Error('Approval target user must be different'), {
      statusCode: 409,
      code: 'APPROVAL_TARGET_USER_INVALID',
    });
  }
}

function assertDecisionAuthority(approval: any, decidedByUserId: string): void {
  const allowedUserIds = [
    approval.assignedApproverId,
    approval.escalatedTo,
    approval.delegatedTo,
    approval.approvedBy,
  ].filter(Boolean);

  if (allowedUserIds.length && !allowedUserIds.includes(decidedByUserId)) {
    throw Object.assign(new Error('User is not the active approver for this request'), {
      statusCode: 403,
      code: 'APPROVAL_DECISION_FORBIDDEN',
    });
  }
}

async function getLatestApprovalVersion(
  db: ApprovalDbClient,
  params: {
    tenantId: string;
    entityType: string;
    entityId: string;
  },
): Promise<number> {
  const latest = await db.approval.findFirst({
    where: {
      tenantId: params.tenantId,
      entityType: params.entityType,
      entityId: params.entityId,
    },
    orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
    select: { version: true },
  });

  return latest?.version ?? 0;
}

async function assertNoOpenDuplicateApproval(
  db: ApprovalDbClient,
  params: {
    tenantId: string;
    entityType: string;
    entityId: string;
  },
): Promise<void> {
  const existing = await db.approval.findFirst({
    where: {
      tenantId: params.tenantId,
      entityType: params.entityType,
      entityId: params.entityId,
      status: {
        in: [...APPROVAL_OPEN_STATUSES],
      },
    },
    select: {
      id: true,
      status: true,
      version: true,
    },
  });

  if (existing) {
    throw Object.assign(
      new Error(
        `Open approval already exists for ${params.entityType}:${params.entityId} (version ${existing.version})`,
      ),
      {
        statusCode: 409,
        code: 'APPROVAL_DUPLICATE_OPEN_REQUEST',
      },
    );
  }
}

export class ApprovalService {
  static async createApproval(db: ApprovalDbClient, input: ApprovalCreateInput) {
    assertTenant(input.tenantId);
    await assertTenantExists(db, input.tenantId);
    await assertUserExists(db, input.requestedById ?? null, input.tenantId);
    await assertUserExists(db, input.assignedApproverId ?? null, input.tenantId);

    if (
      input.requestedById &&
      input.assignedApproverId &&
      input.requestedById === input.assignedApproverId &&
      input.module !== 'SYSTEM'
    ) {
      throw Object.assign(new Error('Requester cannot be the assigned approver'), {
        statusCode: 409,
        code: 'APPROVAL_SELF_ASSIGNMENT_FORBIDDEN',
      });
    }

    const createFn = async (client: ApprovalDbClient) => {
      await assertNoOpenDuplicateApproval(client, {
        tenantId: input.tenantId,
        entityType: input.entityType.trim(),
        entityId: input.entityId.trim(),
      });

      const nextVersion =
        (await getLatestApprovalVersion(client, {
          tenantId: input.tenantId,
          entityType: input.entityType.trim(),
          entityId: input.entityId.trim(),
        })) + 1;

      const level = ApprovalPolicyService.resolveLevel({
        module: input.module,
        entityType: input.entityType,
        requestedLevel: input.level ?? null,
        amount: Number(input.metadata?.amount ?? 0),
        riskScore: Number(input.metadata?.riskScore ?? 0),
      });

      const priority = ApprovalPolicyService.resolvePriority({
        module: input.module,
        entityType: input.entityType,
        requestedPriority: input.priority ?? null,
        amount: Number(input.metadata?.amount ?? 0),
        riskScore: Number(input.metadata?.riskScore ?? 0),
      });

      const deadlineAt = ApprovalPolicyService.resolveDeadlineAt({
        module: input.module,
        entityType: input.entityType,
        requestedPriority: priority,
        amount: Number(input.metadata?.amount ?? 0),
        riskScore: Number(input.metadata?.riskScore ?? 0),
        requestedDeadlineAt: input.deadlineAt ?? null,
      });

      return client.approval.create({
        data: {
          tenantId: input.tenantId,
          module: input.module,
          approvalKey: input.approvalKey?.trim() || null,
          version: nextVersion,
          entityType: input.entityType.trim(),
          entityId: input.entityId.trim(),
          currentState: input.currentState,
          nextState: input.nextState,
          action: input.action ?? 'SUBMIT',
          level,
          priority,
          status: 'PENDING',
          requestedById: input.requestedById ?? null,
          assignedApproverId: input.assignedApproverId ?? null,
          comment: input.comment?.trim() || null,
          decisionReason: input.decisionReason?.trim() || null,
          beforeSnapshot: input.beforeSnapshot ?? {},
          afterSnapshot: input.afterSnapshot ?? {},
          metadata: input.metadata ?? {},
          deadlineAt,
        },
      });
    };

    if (typeof db.$transaction === 'function') {
      return db.$transaction(async (tx: ApprovalDbClient) => createFn(tx));
    }

    return createFn(db);
  }

  static async getApproval(
    db: ApprovalDbClient,
    params: {
      tenantId: string;
      approvalId: string;
    },
  ) {
    assertTenant(params.tenantId);

    const approval = await db.approval.findFirst({
      where: {
        id: params.approvalId,
        tenantId: params.tenantId,
      },
    });

    if (!approval) {
      throw Object.assign(new Error('Approval request not found'), {
        statusCode: 404,
        code: 'APPROVAL_NOT_FOUND',
      });
    }

    return approval;
  }

  static async searchApprovals(
    db: ApprovalDbClient,
    params: {
      tenantId: string;
      filters?: ApprovalSearchFilters | null;
      page?: number;
      limit?: number;
    },
  ) {
    assertTenant(params.tenantId);

    const { page, limit, skip } = pageParams(params.page, params.limit);
    const where = buildSearchWhere(params.tenantId, params.filters);

    const [data, total] = await Promise.all([
      db.approval.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.approval.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async decideApproval(db: ApprovalDbClient, input: ApprovalDecisionInput) {
    const approval = await this.getApproval(db, {
      tenantId: input.tenantId,
      approvalId: input.approvalId,
    });

    assertOpenApproval(approval);
    await assertUserExists(db, input.decidedByUserId, input.tenantId);
    assertDecisionAuthority(approval, input.decidedByUserId);

    const nextStatus =
      input.action === 'APPROVE'
        ? 'APPROVED'
        : input.action === 'REJECT' || input.action === 'REQUEST_CHANGES' || input.action === 'CANCEL'
          ? 'REJECTED'
          : approval.status;

    return db.approval.update({
      where: { id: input.approvalId },
      data: {
        action: input.action,
        status: nextStatus,
        approvedBy: input.action === 'APPROVE' ? input.decidedByUserId : approval.approvedBy,
        approvedAt: input.action === 'APPROVE' ? new Date() : approval.approvedAt,
        comment: input.comment?.trim() || approval.comment || null,
        rejectionReason:
          input.action === 'REJECT'
            ? input.rejectionReason?.trim() || approval.rejectionReason || null
            : approval.rejectionReason,
        decisionReason:
          input.decisionReason?.trim() || approval.decisionReason || null,
        afterSnapshot: input.afterSnapshot ?? approval.afterSnapshot ?? {},
        metadata: {
          ...(approval.metadata ?? {}),
          ...(input.metadata ?? {}),
          lastDecisionAction: input.action,
          lastDecisionAt: new Date().toISOString(),
          lastDecisionBy: input.decidedByUserId,
        },
      },
    });
  }

  static async escalateApproval(db: ApprovalDbClient, input: ApprovalEscalationInput) {
    const approval = await this.getApproval(db, {
      tenantId: input.tenantId,
      approvalId: input.approvalId,
    });

    assertOpenApproval(approval);
    await assertUserExists(db, input.escalatedByUserId ?? null, input.tenantId);
    await assertUserExists(db, input.escalatedToUserId, input.tenantId);
    assertAssignableTarget(input.escalatedToUserId, approval.assignedApproverId);

    return db.approval.update({
      where: { id: input.approvalId },
      data: {
        action: 'ESCALATE',
        status: 'ESCALATED',
        escalatedAt: new Date(),
        escalatedTo: input.escalatedToUserId,
        escalationReason: input.escalationReason.trim(),
        assignedApproverId: input.escalatedToUserId,
        level: input.level ?? approval.level,
        priority: input.priority ?? approval.priority,
        metadata: {
          ...(approval.metadata ?? {}),
          ...(input.metadata ?? {}),
          lastEscalatedBy: input.escalatedByUserId ?? null,
        },
      },
    });
  }

  static async delegateApproval(db: ApprovalDbClient, input: ApprovalDelegationInput) {
    const approval = await this.getApproval(db, {
      tenantId: input.tenantId,
      approvalId: input.approvalId,
    });

    assertOpenApproval(approval);
    await assertUserExists(db, input.delegatedFromUserId, input.tenantId);
    await assertUserExists(db, input.delegatedToUserId, input.tenantId);
    assertDecisionAuthority(approval, input.delegatedFromUserId);
    assertAssignableTarget(input.delegatedToUserId, input.delegatedFromUserId);

    return db.approval.update({
      where: { id: input.approvalId },
      data: {
        action: 'DELEGATE',
        status: 'DELEGATED',
        delegatedFrom: input.delegatedFromUserId,
        delegatedTo: input.delegatedToUserId,
        assignedApproverId: input.delegatedToUserId,
        comment: input.comment?.trim() || approval.comment || null,
        metadata: {
          ...(approval.metadata ?? {}),
          ...(input.metadata ?? {}),
        },
      },
    });
  }

  static async reassignApproval(db: ApprovalDbClient, input: ApprovalReassignmentInput) {
    const approval = await this.getApproval(db, {
      tenantId: input.tenantId,
      approvalId: input.approvalId,
    });

    assertOpenApproval(approval);
    await assertUserExists(db, input.reassignedByUserId, input.tenantId);
    await assertUserExists(db, input.reassignedToUserId, input.tenantId);
    assertDecisionAuthority(approval, input.reassignedByUserId);
    assertAssignableTarget(input.reassignedToUserId, approval.assignedApproverId);

    return db.approval.update({
      where: { id: input.approvalId },
      data: {
        action: 'REASSIGN',
        assignedApproverId: input.reassignedToUserId,
        status: 'PENDING',
        comment: input.comment?.trim() || approval.comment || null,
        metadata: {
          ...(approval.metadata ?? {}),
          ...(input.metadata ?? {}),
          lastReassignedBy: input.reassignedByUserId,
          lastReassignedTo: input.reassignedToUserId,
        },
      },
    });
  }

  static async expireOverdueApprovals(
    db: ApprovalDbClient,
    params: {
      tenantId: string;
      now?: Date;
    },
  ) {
    assertTenant(params.tenantId);

    const now = params.now ?? new Date();

    return db.approval.updateMany({
      where: {
        tenantId: params.tenantId,
        status: {
          in: [...APPROVAL_OPEN_STATUSES],
        },
        deadlineAt: {
          lt: now,
        },
      },
      data: {
        action: 'EXPIRE',
        status: 'REJECTED',
        metadata: {
          expiredAt: now.toISOString(),
        },
      },
    });
  }

  static async getDashboard(
    db: ApprovalDbClient,
    params: {
      tenantId: string;
    },
  ) {
    assertTenant(params.tenantId);

    const [total, byStatus, byModule, urgent, overdue] = await Promise.all([
      db.approval.count({
        where: { tenantId: params.tenantId },
      }),
      db.approval.groupBy
        ? db.approval.groupBy({
            by: ['status'],
            where: { tenantId: params.tenantId },
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.approval.groupBy
        ? db.approval.groupBy({
            by: ['module'],
            where: { tenantId: params.tenantId },
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.approval.count({
        where: {
          tenantId: params.tenantId,
          priority: { in: ['HIGH', 'CRITICAL'] },
          status: { in: [...APPROVAL_OPEN_STATUSES] },
        },
      }),
      db.approval.count({
        where: {
          tenantId: params.tenantId,
          status: { in: [...APPROVAL_OPEN_STATUSES] },
          deadlineAt: {
            lt: new Date(),
          },
        },
      }),
    ]);

    return {
      tenantId: params.tenantId,
      generatedAt: new Date(),
      summary: {
        total,
        urgent,
        overdue,
        byStatus: byStatus.map((item: any) => ({
          status: item.status,
          count: item._count.id,
        })),
        byModule: byModule.map((item: any) => ({
          module: item.module,
          count: item._count.id,
        })),
      },
    };
  }
}

export default ApprovalService;