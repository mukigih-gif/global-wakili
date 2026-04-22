// apps/api/src/modules/reception/ReceptionHandoffBridgeService.ts

import { ReceptionLogService } from './ReceptionLogService';
import { ReceptionAuditService } from './ReceptionAuditService';

type HandoffType =
  | 'CLIENT_ONBOARDING'
  | 'MATTER_OPENING'
  | 'TASK'
  | 'DOCUMENT'
  | 'NOTIFICATION';

function actionFor(type: HandoffType) {
  switch (type) {
    case 'CLIENT_ONBOARDING':
      return 'CLIENT_ONBOARDING_HANDOFF_REQUESTED' as const;
    case 'MATTER_OPENING':
      return 'MATTER_OPENING_HANDOFF_REQUESTED' as const;
    case 'TASK':
      return 'TASK_HANDOFF_REQUESTED' as const;
    case 'DOCUMENT':
      return 'DOCUMENT_HANDOFF_REQUESTED' as const;
    case 'NOTIFICATION':
      return 'NOTIFICATION_REQUESTED' as const;
    default:
      return 'TASK_HANDOFF_REQUESTED' as const;
  }
}

function codeFor(type: HandoffType): string {
  return `RECEPTION_${type}_HANDOFF_REQUIRES_CROSS_MODULE_WORKFLOW`;
}

export class ReceptionHandoffBridgeService {
  static async requestHandoff(
    db: any,
    params: {
      tenantId: string;
      logId: string;
      actorId: string;
      type: HandoffType;
      reason?: string | null;
      notes?: string | null;
      requestId?: string | null;
    },
  ) {
    const log = await ReceptionLogService.getLog(db, {
      tenantId: params.tenantId,
      logId: params.logId,
    });

    await ReceptionAuditService.logAction(db, {
      tenantId: params.tenantId,
      userId: params.actorId,
      logId: params.logId,
      matterId: log.matterId ?? null,
      action: actionFor(params.type),
      requestId: params.requestId ?? null,
      metadata: {
        handoffType: params.type,
        reason: params.reason?.trim() ?? null,
        notes: params.notes?.trim() ?? null,
      },
    });

    throw Object.assign(
      new Error(
        `${params.type} handoff requires the relevant cross-module workflow before activation`,
      ),
      {
        statusCode: 501,
        code: codeFor(params.type),
      },
    );
  }
}

export default ReceptionHandoffBridgeService;