// apps/api/src/modules/court/CourtFilingBridgeService.ts

import { CourtHearingService } from './CourtHearingService';
import { CourtAuditService } from './CourtAuditService';

type BridgeType =
  | 'FILING'
  | 'PLEADING'
  | 'DOCUMENT'
  | 'TASK'
  | 'NOTIFICATION';

function actionFor(type: BridgeType) {
  switch (type) {
    case 'FILING':
      return 'FILING_REQUESTED' as const;
    case 'PLEADING':
      return 'PLEADING_REQUESTED' as const;
    case 'DOCUMENT':
      return 'DOCUMENT_HANDOFF_REQUESTED' as const;
    case 'TASK':
      return 'TASK_HANDOFF_REQUESTED' as const;
    case 'NOTIFICATION':
      return 'NOTIFICATION_REQUESTED' as const;
    default:
      return 'FILING_REQUESTED' as const;
  }
}

function codeFor(type: BridgeType): string {
  return `COURT_${type}_BRIDGE_REQUIRES_SCHEMA_OR_CROSS_MODULE_WORKFLOW`;
}

export class CourtFilingBridgeService {
  static async requestBridge(
    db: any,
    params: {
      tenantId: string;
      hearingId: string;
      actorId: string;
      type: BridgeType;
      reason?: string | null;
      notes?: string | null;
      requestId?: string | null;
    },
  ) {
    const hearing = await CourtHearingService.getHearing(db, {
      tenantId: params.tenantId,
      hearingId: params.hearingId,
    });

    await CourtAuditService.logAction(db, {
      tenantId: params.tenantId,
      userId: params.actorId,
      hearingId: params.hearingId,
      matterId: hearing.matterId,
      action: actionFor(params.type),
      requestId: params.requestId ?? null,
      metadata: {
        bridgeType: params.type,
        reason: params.reason?.trim() ?? null,
        notes: params.notes?.trim() ?? null,
      },
    });

    throw Object.assign(
      new Error(`${params.type} bridge requires schema or cross-module workflow before activation`),
      {
        statusCode: 501,
        code: codeFor(params.type),
      },
    );
  }
}

export default CourtFilingBridgeService;