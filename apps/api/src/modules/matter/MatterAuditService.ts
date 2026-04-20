import type { Request } from 'express';
import { logAdminAction } from '../../utils/audit-logger';
import { AuditSeverity } from '../../types/audit';

function changedFields(before: Record<string, any> | null, after: Record<string, any> | null): string[] {
  if (!before || !after) return [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed: string[] = [];

  for (const key of keys) {
    const a = JSON.stringify(before[key] ?? null);
    const b = JSON.stringify(after[key] ?? null);
    if (a !== b) changed.push(key);
  }

  return changed;
}

export class MatterAuditService {
  static async logCreate(req: Request, matter: any) {
    await logAdminAction({
      req,
      tenantId: req.tenantId!,
      action: 'MATTER_CREATED',
      severity: AuditSeverity.INFO,
      entityId: matter.id,
      payload: {
        matterId: matter.id,
        matterCode: matter.matterCode ?? null,
        title: matter.title,
        clientId: matter.clientId,
        branchId: matter.branchId ?? null,
        status: matter.status,
      },
    });
  }

  static async logUpdate(
    req: Request,
    params: {
      before: Record<string, any>;
      after: Record<string, any>;
    },
  ) {
    const changed = changedFields(params.before, params.after);

    await logAdminAction({
      req,
      tenantId: req.tenantId!,
      action: 'MATTER_UPDATED',
      severity: changed.includes('status') || changed.includes('assignedLawyerId')
        ? AuditSeverity.WARNING
        : AuditSeverity.INFO,
      entityId: params.after.id,
      payload: {
        matterId: params.after.id,
        changedFields: changed,
        before: params.before,
        after: params.after,
      },
    });
  }

  static async logConflictCheck(
    req: Request,
    result: {
      conflictLevel: string;
      conflictReason: string | null;
      searchedNames: string[];
      summary: Record<string, unknown>;
    },
  ) {
    await logAdminAction({
      req,
      tenantId: req.tenantId!,
      action: 'MATTER_CONFLICT_CHECK_RUN',
      severity: result.conflictLevel === 'HIGH_RISK' ? AuditSeverity.CRITICAL : AuditSeverity.INFO,
      payload: result,
    });
  }

  static async logWorkflowResolution(
    req: Request,
    params: {
      matterType: string;
      workflowType: string;
      recommendedStages: string[];
    },
  ) {
    await logAdminAction({
      req,
      tenantId: req.tenantId!,
      action: 'MATTER_WORKFLOW_RESOLVED',
      severity: AuditSeverity.INFO,
      payload: params,
    });
  }
}