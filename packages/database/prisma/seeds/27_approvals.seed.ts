import {
  ApprovalAction,
  ApprovalLevel,
  ApprovalModule,
  ApprovalPriority,
  ApprovalStatus,
  PrismaClient,
  TenantRole,
  WorkflowState,
} from '@prisma/client';

/*
 * 27_approvals.seed.ts — Per-tenant cross-domain approvals layer (CLAUDE.md §12).
 *
 * EXTENDS 09_workflows (which seeded MATTER-module approvals only). There is NO
 * ApprovalHistory / ApprovalDelegation / ApprovalStep model (FINDING-APPR-001) —
 * delegation, escalation and the per-approval audit trail are FIELDS on Approval
 * (delegatedFrom/To, escalatedTo/escalationReason, beforeSnapshot/afterSnapshot).
 *
 * Seeds cross-domain approvals against entities seeded by prior layers:
 *   BILLING (invoice), FINANCE (payment receipt), TRUST (trust withdrawal),
 *   PAYROLL (payroll batch), HR (pending leave request) — plus a DELEGATED
 *   billing credit-note approval and an ESCALATED procurement vendor-bill
 *   approval (demonstrating the delegation/escalation fields).
 *
 * DEMO/FIXTURE data — run only under the master demo-data gate.
 *
 * Policy: idempotent — gated by findFirst(tenantId, approvalKey) (same pattern
 * as 09). Tenant-scoped. No schema changes. Reports NEW rows only.
 */

type SeedPrisma = PrismaClient;

type EntityKey = 'invoice' | 'receipt' | 'trustWithdrawal' | 'payrollBatch' | 'leavePending' | 'creditNote' | 'vendorBill';
type Role = TenantRole;

type ApprovalSeed = {
  keySuffix: string;
  module: ApprovalModule;
  entityType: string;
  entityKey: EntityKey;
  action: ApprovalAction;
  level: ApprovalLevel;
  priority: ApprovalPriority;
  status: ApprovalStatus;
  currentState: WorkflowState;
  nextState: WorkflowState;
  requestedByRole: Role;
  approvedByRole: Role | null;
  assignedApproverRole: Role | null;
  delegate: boolean;
  escalate: boolean;
  comment: string;
};

export type ApprovalsSeedResult = {
  status: 'approvals_seed_complete';
  tenantId: string;
  approvalsCreatedOrPresent: number; // NEW (layer 27) only — excludes layer-09 MATTER approvals
};

const APPROVALS: ApprovalSeed[] = [
  { keySuffix: 'BILLING-INVOICE', module: ApprovalModule.BILLING, entityType: 'Invoice', entityKey: 'invoice', action: ApprovalAction.APPROVE, level: ApprovalLevel.PARTNER, priority: ApprovalPriority.HIGH, status: ApprovalStatus.APPROVED, currentState: WorkflowState.SUBMITTED, nextState: WorkflowState.APPROVED, requestedByRole: TenantRole.ACCOUNTANT, approvedByRole: TenantRole.FIRM_ADMIN, assignedApproverRole: TenantRole.FIRM_ADMIN, delegate: false, escalate: false, comment: 'Invoice issuance approved by partner.' },
  { keySuffix: 'FINANCE-RECEIPT', module: ApprovalModule.FINANCE, entityType: 'PaymentReceipt', entityKey: 'receipt', action: ApprovalAction.APPROVE, level: ApprovalLevel.CFO, priority: ApprovalPriority.NORMAL, status: ApprovalStatus.APPROVED, currentState: WorkflowState.SUBMITTED, nextState: WorkflowState.APPROVED, requestedByRole: TenantRole.ACCOUNTANT, approvedByRole: TenantRole.FIRM_ADMIN, assignedApproverRole: TenantRole.FIRM_ADMIN, delegate: false, escalate: false, comment: 'Payment receipt approved (CFO level).' },
  { keySuffix: 'TRUST-WITHDRAWAL', module: ApprovalModule.TRUST, entityType: 'TrustTransaction', entityKey: 'trustWithdrawal', action: ApprovalAction.APPROVE, level: ApprovalLevel.PARTNER, priority: ApprovalPriority.HIGH, status: ApprovalStatus.APPROVED, currentState: WorkflowState.SUBMITTED, nextState: WorkflowState.APPROVED, requestedByRole: TenantRole.ACCOUNTANT, approvedByRole: TenantRole.FIRM_ADMIN, assignedApproverRole: TenantRole.FIRM_ADMIN, delegate: false, escalate: false, comment: 'Trust withdrawal approved (ADR-004 control).' },
  { keySuffix: 'PAYROLL-BATCH', module: ApprovalModule.PAYROLL, entityType: 'PayrollBatch', entityKey: 'payrollBatch', action: ApprovalAction.APPROVE, level: ApprovalLevel.CFO, priority: ApprovalPriority.HIGH, status: ApprovalStatus.APPROVED, currentState: WorkflowState.SUBMITTED, nextState: WorkflowState.APPROVED, requestedByRole: TenantRole.ACCOUNTANT, approvedByRole: TenantRole.FIRM_ADMIN, assignedApproverRole: TenantRole.FIRM_ADMIN, delegate: false, escalate: false, comment: 'Monthly payroll batch approved for posting.' },
  { keySuffix: 'HR-LEAVE', module: ApprovalModule.HR, entityType: 'LeaveRequest', entityKey: 'leavePending', action: ApprovalAction.SUBMIT, level: ApprovalLevel.MANAGER, priority: ApprovalPriority.NORMAL, status: ApprovalStatus.PENDING, currentState: WorkflowState.SUBMITTED, nextState: WorkflowState.APPROVED, requestedByRole: TenantRole.ASSOCIATE, approvedByRole: null, assignedApproverRole: TenantRole.BRANCH_MANAGER, delegate: false, escalate: false, comment: 'Leave request awaiting manager approval.' },
  { keySuffix: 'BILLING-CREDITNOTE-DELEGATED', module: ApprovalModule.BILLING, entityType: 'CreditNote', entityKey: 'creditNote', action: ApprovalAction.DELEGATE, level: ApprovalLevel.PARTNER, priority: ApprovalPriority.NORMAL, status: ApprovalStatus.DELEGATED, currentState: WorkflowState.SUBMITTED, nextState: WorkflowState.APPROVED, requestedByRole: TenantRole.ACCOUNTANT, approvedByRole: null, assignedApproverRole: TenantRole.ACCOUNTANT, delegate: true, escalate: false, comment: 'Credit-note approval delegated to the firm admin.' },
  { keySuffix: 'PROCUREMENT-VENDORBILL-ESCALATED', module: ApprovalModule.PROCUREMENT, entityType: 'VendorBill', entityKey: 'vendorBill', action: ApprovalAction.ESCALATE, level: ApprovalLevel.MANAGER, priority: ApprovalPriority.CRITICAL, status: ApprovalStatus.ESCALATED, currentState: WorkflowState.SUBMITTED, nextState: WorkflowState.APPROVED, requestedByRole: TenantRole.ACCOUNTANT, approvedByRole: null, assignedApproverRole: TenantRole.BRANCH_MANAGER, delegate: false, escalate: true, comment: 'High-value vendor bill escalated to the firm admin.' },
];

async function resolveUsers(prisma: SeedPrisma, tenantId: string): Promise<{ adminId: string; byRole: (r: TenantRole) => string }> {
  const users = await prisma.user.findMany({ where: { tenantId, status: 'ACTIVE' }, select: { id: true, tenantRole: true } });
  const admin = users.find((u) => u.tenantRole === TenantRole.FIRM_ADMIN) ?? users[0];
  if (!admin) throw new Error(`seedApprovals: no user for tenant ${tenantId}. Run 02_users first.`);
  const byRole = (r: TenantRole) => users.find((u) => u.tenantRole === r)?.id ?? admin.id;
  return { adminId: admin.id, byRole };
}

export async function seedApprovals(prisma: PrismaClient, tenantId: string): Promise<ApprovalsSeedResult> {
  if (!tenantId || tenantId.trim().length === 0) throw new Error('seedApprovals requires a tenantId.');

  const { adminId, byRole } = await resolveUsers(prisma, tenantId);
  const tag = tenantId.slice(-6);
  const now = new Date();

  // Resolve real entities seeded by prior layers (cross-domain linkage).
  const [invoice, receipt, trustWithdrawal, payrollBatch, leavePending, creditNote, vendorBill] = await Promise.all([
    prisma.invoice.findFirst({ where: { tenantId, invoiceNumber: `INV-${tag}-002` }, select: { id: true } }),
    prisma.paymentReceipt.findFirst({ where: { tenantId, receiptNumber: `RCT-${tag}-003` }, select: { id: true } }),
    prisma.trustTransaction.findFirst({ where: { tenantId, transactionType: 'WITHDRAWAL' }, select: { id: true } }),
    prisma.payrollBatch.findFirst({ where: { tenantId }, select: { id: true } }),
    prisma.leaveRequest.findFirst({ where: { tenantId, status: 'PENDING' }, select: { id: true } }),
    prisma.creditNote.findFirst({ where: { tenantId, creditNoteNumber: `CRN-${tag}-001` }, select: { id: true } }),
    prisma.vendorBill.findFirst({ where: { tenantId, billNumber: `VB-${tag}-001` }, select: { id: true } }),
  ]);
  const entityId: Record<EntityKey, string | null> = {
    invoice: invoice?.id ?? null,
    receipt: receipt?.id ?? null,
    trustWithdrawal: trustWithdrawal?.id ?? null,
    payrollBatch: payrollBatch?.id ?? null,
    leavePending: leavePending?.id ?? null,
    creditNote: creditNote?.id ?? null,
    vendorBill: vendorBill?.id ?? null,
  };

  const keys: string[] = [];
  for (const a of APPROVALS) {
    const approvalKey = `SEED-${a.keySuffix}-${tag}`;
    keys.push(approvalKey);

    const eid = entityId[a.entityKey];
    // Defensive: only seed an approval whose linked entity exists.
    if (!eid) continue;

    const existing = await prisma.approval.findFirst({ where: { tenantId, approvalKey }, select: { id: true } });
    if (existing) continue;

    const approved = a.status === ApprovalStatus.APPROVED;
    await prisma.approval.create({
      data: {
        tenantId,
        module: a.module,
        approvalKey,
        entityType: a.entityType,
        entityId: eid,
        currentState: a.currentState,
        nextState: a.nextState,
        action: a.action,
        level: a.level,
        priority: a.priority,
        status: a.status,
        requestedById: byRole(a.requestedByRole),
        assignedApproverId: a.assignedApproverRole ? byRole(a.assignedApproverRole) : null,
        approvedBy: a.approvedByRole ? byRole(a.approvedByRole) : null,
        approvedAt: approved ? now : null,
        comment: a.comment,
        decisionReason: approved ? a.comment : null,
        deadlineAt: new Date(now.getTime() + 7 * 24 * 3600_000),
        delegatedFrom: a.delegate ? byRole(a.requestedByRole) : null,
        delegatedTo: a.delegate ? adminId : null,
        escalatedTo: a.escalate ? adminId : null,
        escalatedAt: a.escalate ? now : null,
        escalationReason: a.escalate ? 'Amount exceeds manager approval threshold (seed).' : null,
        beforeSnapshot: { state: a.currentState, status: 'PENDING' },
        afterSnapshot: { state: a.status === ApprovalStatus.APPROVED ? a.nextState : a.currentState, status: a.status, actor: a.approvedByRole ?? a.assignedApproverRole ?? a.requestedByRole },
        metadata: { seeded: true, layer: '27_approvals' },
      },
    });
  }

  // NEW rows only — layer-27 approvalKeys (excludes layer-09 SEED-MATTER-* approvals).
  const approvalsCreatedOrPresent = await prisma.approval.count({ where: { tenantId, approvalKey: { in: keys } } });

  return { status: 'approvals_seed_complete', tenantId, approvalsCreatedOrPresent };
}
