import {
  ApprovalAction,
  ApprovalLevel,
  ApprovalModule,
  ApprovalPriority,
  ApprovalStatus,
  PrismaClient,
  TenantRole,
  WorkflowState,
  WorkflowType,
} from '@prisma/client';

/*
 * 09_workflows.seed.ts — Per-tenant workflow + approval layer (CLAUDE.md §12).
 *
 * Seeds three models:
 *   - Workflow        : firm workflow definitions (matter / billing /
 *                       procurement / compliance lifecycles).
 *   - WorkflowHistory : state transitions of seeded matters through the
 *                       MATTER workflow (audit trail of movement).
 *   - Approval        : approval requests against seeded matters, spanning
 *                       PENDING / APPROVED / ESCALATED / REJECTED.
 *
 * DEMO/FIXTURE data — run only under the master demo-data gate.
 *
 * Schema reality (verified):
 * - Workflow req: tenantId, name, type (WorkflowType), states String[],
 *   startState, endStates String[]. Optional: description, isActive,
 *   triggerConditions (Json, default "{}"). No @@unique.
 * - WorkflowHistory req: workflowId, entityType, entityId, fromState,
 *   toState, transitionBy. Optional transitionReason. Scoped via workflow.
 * - Approval req: tenantId, entityType, entityId, currentState/nextState
 *   (WorkflowState). Enum fields module/action/level/priority/status have
 *   defaults. Optional user FKs requestedById/assignedApproverId/approvedBy/
 *   escalatedTo. No @@unique.
 *
 * Policy:
 * - Idempotent: Workflow → findFirst(tenantId, name); WorkflowHistory →
 *   findFirst(workflowId, entityType, entityId, toState); Approval →
 *   findFirst(tenantId, approvalKey). Deterministic → reruns converge.
 * - Matter-linked rows resolve matterId by matterCode within the tenant; a
 *   missing matter skips that row (06_matters must run first).
 * - Tenant-scoped. No schema changes, no destructive operations.
 */

type SeedPrisma = PrismaClient;

type WorkflowSeed = {
  name: string;
  description: string;
  type: WorkflowType;
  states: string[];
  startState: string;
  endStates: string[];
};

type HistorySeed = {
  matterCode: string;
  fromState: string;
  toState: string;
  reason: string;
};

type ApprovalSeed = {
  approvalKey: string;
  matterCode: string;
  module: ApprovalModule;
  action: ApprovalAction;
  level: ApprovalLevel;
  priority: ApprovalPriority;
  status: ApprovalStatus;
  currentState: WorkflowState;
  nextState: WorkflowState;
  comment: string;
  decided?: 'APPROVED' | 'REJECTED' | 'ESCALATED';
  reason?: string;
};

export type WorkflowsSeedResult = {
  status: 'workflows_seed_complete';
  tenantId: string;
  workflows: number;
  workflowHistory: number;
  approvals: number;
};

const MATTER_WORKFLOW_NAME = 'Matter Lifecycle';

const WORKFLOW_SEEDS: WorkflowSeed[] = [
  {
    name: MATTER_WORKFLOW_NAME,
    description: 'Standard intake-to-closure lifecycle for legal matters.',
    type: WorkflowType.MATTER,
    states: ['INTAKE', 'CONFLICT_CHECK', 'ACTIVE', 'BILLING', 'CLOSED'],
    startState: 'INTAKE',
    endStates: ['CLOSED'],
  },
  {
    name: 'Billing Approval',
    description: 'Draft invoice through partner approval to issued/paid.',
    type: WorkflowType.BILLING,
    states: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'INVOICED', 'PAID'],
    startState: 'DRAFT',
    endStates: ['PAID'],
  },
  {
    name: 'Procurement Request',
    description: 'Requisition through quotation, PO and goods receipt.',
    type: WorkflowType.PROCUREMENT,
    states: ['REQUESTED', 'QUOTED', 'PO_RAISED', 'RECEIVED', 'CLOSED'],
    startState: 'REQUESTED',
    endStates: ['CLOSED'],
  },
  {
    name: 'Compliance Review',
    description: 'Compliance issue intake through remediation and clearance.',
    type: WorkflowType.COMPLIANCE,
    states: ['OPEN', 'UNDER_REVIEW', 'REMEDIATION', 'CLEARED'],
    startState: 'OPEN',
    endStates: ['CLEARED'],
  },
];

const HISTORY_SEEDS: HistorySeed[] = [
  { matterCode: 'MAT-0001', fromState: 'INTAKE', toState: 'CONFLICT_CHECK', reason: 'Intake complete; conflict check initiated.' },
  { matterCode: 'MAT-0002', fromState: 'CONFLICT_CHECK', toState: 'ACTIVE', reason: 'Conflict cleared; matter activated.' },
  { matterCode: 'MAT-0005', fromState: 'ACTIVE', toState: 'BILLING', reason: 'Substantive work complete; moved to billing.' },
];

const APPROVAL_SEEDS: ApprovalSeed[] = [
  {
    approvalKey: 'SEED-MATTER-INTAKE-MAT-0003',
    matterCode: 'MAT-0003',
    module: ApprovalModule.MATTER,
    action: ApprovalAction.SUBMIT,
    level: ApprovalLevel.REVIEWER,
    priority: ApprovalPriority.NORMAL,
    status: ApprovalStatus.PENDING,
    currentState: WorkflowState.DRAFT,
    nextState: WorkflowState.SUBMITTED,
    comment: 'New matter submitted for intake review.',
  },
  {
    approvalKey: 'SEED-MATTER-OPEN-MAT-0006',
    matterCode: 'MAT-0006',
    module: ApprovalModule.MATTER,
    action: ApprovalAction.APPROVE,
    level: ApprovalLevel.PARTNER,
    priority: ApprovalPriority.HIGH,
    status: ApprovalStatus.APPROVED,
    currentState: WorkflowState.SUBMITTED,
    nextState: WorkflowState.APPROVED,
    comment: 'Engagement reviewed and approved to open.',
    decided: 'APPROVED',
    reason: 'Scope and fee arrangement approved by supervising partner.',
  },
  {
    approvalKey: 'SEED-MATTER-ESCALATED-MAT-0008',
    matterCode: 'MAT-0008',
    module: ApprovalModule.MATTER,
    action: ApprovalAction.ESCALATE,
    level: ApprovalLevel.PARTNER,
    priority: ApprovalPriority.CRITICAL,
    status: ApprovalStatus.ESCALATED,
    currentState: WorkflowState.SUBMITTED,
    nextState: WorkflowState.APPROVED,
    comment: 'High-exposure matter escalated to senior partner.',
    decided: 'ESCALATED',
    reason: 'Exposure exceeds reviewer authority threshold.',
  },
  {
    approvalKey: 'SEED-MATTER-REJECTED-MAT-0004',
    matterCode: 'MAT-0004',
    module: ApprovalModule.MATTER,
    action: ApprovalAction.REJECT,
    level: ApprovalLevel.REVIEWER,
    priority: ApprovalPriority.NORMAL,
    status: ApprovalStatus.REJECTED,
    currentState: WorkflowState.SUBMITTED,
    nextState: WorkflowState.REJECTED,
    comment: 'Returned for incomplete KYC documentation.',
    decided: 'REJECTED',
    reason: 'Client KYC pack incomplete; resubmit with verified IDs.',
  },
];

async function resolveMatterId(
  prisma: SeedPrisma,
  tenantId: string,
  matterCode: string,
): Promise<string | null> {
  const matter = await prisma.matter.findFirst({
    where: { tenantId, matterCode },
    select: { id: true },
  });

  return matter?.id ?? null;
}

export async function seedWorkflows(
  prisma: PrismaClient,
  tenantId: string,
): Promise<WorkflowsSeedResult> {
  if (!tenantId || tenantId.trim().length === 0) {
    throw new Error('seedWorkflows requires a tenantId.');
  }

  const advocate =
    (await prisma.user.findFirst({
      where: { tenantId, tenantRole: TenantRole.ADVOCATE },
      select: { id: true },
    })) ??
    (await prisma.user.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      select: { id: true },
    }));

  if (!advocate) {
    throw new Error(`seedWorkflows: no user for tenant ${tenantId}. Run 02_users first.`);
  }

  const associate = await prisma.user.findFirst({
    where: { tenantId, tenantRole: TenantRole.ASSOCIATE },
    select: { id: true },
  });

  const requesterId = associate?.id ?? advocate.id;
  const approverId = advocate.id;

  // 1. Workflow definitions.
  let workflows = 0;
  let matterWorkflowId: string | null = null;

  for (const def of WORKFLOW_SEEDS) {
    const data = {
      description: def.description,
      type: def.type,
      states: def.states,
      startState: def.startState,
      endStates: def.endStates,
      isActive: true,
    };

    const existing = await prisma.workflow.findFirst({
      where: { tenantId, name: def.name },
      select: { id: true },
    });

    const record = existing
      ? await prisma.workflow.update({ where: { id: existing.id }, data, select: { id: true } })
      : await prisma.workflow.create({
          data: { tenantId, name: def.name, ...data },
          select: { id: true },
        });

    if (def.name === MATTER_WORKFLOW_NAME) {
      matterWorkflowId = record.id;
    }

    workflows += 1;
  }

  // 2. Workflow history — matters moving through the MATTER workflow.
  let workflowHistory = 0;

  if (matterWorkflowId) {
    for (const def of HISTORY_SEEDS) {
      const matterId = await resolveMatterId(prisma, tenantId, def.matterCode);
      if (!matterId) {
        continue;
      }

      const existing = await prisma.workflowHistory.findFirst({
        where: {
          workflowId: matterWorkflowId,
          entityType: 'Matter',
          entityId: matterId,
          toState: def.toState,
        },
        select: { id: true },
      });

      if (existing) {
        await prisma.workflowHistory.update({
          where: { id: existing.id },
          data: { fromState: def.fromState, transitionReason: def.reason, transitionBy: advocate.id },
        });
      } else {
        await prisma.workflowHistory.create({
          data: {
            workflowId: matterWorkflowId,
            entityType: 'Matter',
            entityId: matterId,
            fromState: def.fromState,
            toState: def.toState,
            transitionReason: def.reason,
            transitionBy: advocate.id,
          },
        });
      }

      workflowHistory += 1;
    }
  }

  // 3. Approvals against seeded matters.
  let approvals = 0;

  for (const def of APPROVAL_SEEDS) {
    const matterId = await resolveMatterId(prisma, tenantId, def.matterCode);
    if (!matterId) {
      continue;
    }

    const data = {
      module: def.module,
      version: 1,
      entityType: 'Matter',
      entityId: matterId,
      currentState: def.currentState,
      nextState: def.nextState,
      action: def.action,
      level: def.level,
      priority: def.priority,
      status: def.status,
      requestedById: requesterId,
      assignedApproverId: approverId,
      comment: def.comment,
      approvedBy: def.decided === 'APPROVED' ? approverId : null,
      approvedAt: def.decided === 'APPROVED' ? new Date('2026-06-20T09:00:00.000Z') : null,
      decisionReason: def.decided === 'APPROVED' ? def.reason ?? null : null,
      rejectionReason: def.decided === 'REJECTED' ? def.reason ?? null : null,
      escalatedTo: def.decided === 'ESCALATED' ? approverId : null,
      escalatedAt: def.decided === 'ESCALATED' ? new Date('2026-06-22T09:00:00.000Z') : null,
      escalationReason: def.decided === 'ESCALATED' ? def.reason ?? null : null,
    };

    const existing = await prisma.approval.findFirst({
      where: { tenantId, approvalKey: def.approvalKey },
      select: { id: true },
    });

    if (existing) {
      await prisma.approval.update({ where: { id: existing.id }, data });
    } else {
      await prisma.approval.create({
        data: { tenantId, approvalKey: def.approvalKey, ...data },
      });
    }

    approvals += 1;
  }

  return { status: 'workflows_seed_complete', tenantId, workflows, workflowHistory, approvals };
}
