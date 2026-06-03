/**
 * CourtFilingBridgeService.ts
 *
 * Routes court cross-module requests to the appropriate service.
 *
 * FILING type → now ACTIVE via CourtFilingService (schema built).
 * NOTIFICATION type → now ACTIVE via NotificationQueueService (WIP-002 complete).
 * PLEADING, DOCUMENT, TASK → still PENDING (no schema / cross-module workflow yet).
 */

import { CourtHearingService } from './CourtHearingService';
import { CourtAuditService } from './CourtAuditService';
import { CourtFilingService } from './CourtFilingService';
import { NotificationQueueService } from '../notifications/NotificationQueueService';

type BridgeType = 'FILING' | 'PLEADING' | 'DOCUMENT' | 'TASK' | 'NOTIFICATION';

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
      // Filing-specific
      filingType?: string | null;
      title?: string | null;
      dueDate?: Date | string | null;
      scanUrl?: string | null;
      // Notification-specific
      notifyUserId?: string | null;
      channel?: 'SYSTEM_ALERT' | 'EMAIL' | 'SMS';
    },
  ) {
    const hearing = await CourtHearingService.getHearing(db, {
      tenantId: params.tenantId,
      hearingId: params.hearingId,
    });

    // ── FILING: now active ────────────────────────────────────────────────────
    if (params.type === 'FILING') {
      const filing = await CourtFilingService.createFiling(db, {
        tenantId: params.tenantId,
        matterId: (hearing as any).matterId,
        hearingId: params.hearingId,
        filingType: params.filingType ?? 'OTHER',
        title: params.title?.trim() || `${params.filingType ?? 'Filing'} — ${(hearing as any).title ?? 'Hearing'}`,
        dueDate: params.dueDate ?? null,
        scanUrl: params.scanUrl ?? null,
        filedById: params.actorId,
        notes: params.notes ?? null,
      });

      await CourtAuditService.logAction(db, {
        tenantId: params.tenantId,
        userId: params.actorId,
        hearingId: params.hearingId,
        matterId: (hearing as any).matterId,
        action: 'FILING_REQUESTED',
        requestId: params.requestId ?? null,
        metadata: { filingId: (filing as any).id, filingType: params.filingType, title: params.title },
      });

      return { created: true, filing };
    }

    // ── NOTIFICATION: now active ──────────────────────────────────────────────
    if (params.type === 'NOTIFICATION') {
      const hearingTitle: string = (hearing as any).title ?? 'Court Hearing';
      const hearingDate: string = (hearing as any).hearingDate
        ? new Date((hearing as any).hearingDate).toLocaleDateString('en-KE')
        : '';

      await NotificationQueueService.enqueue({
        tenantId: params.tenantId,
        category: 'court',
        priority: 'high',
        entityType: 'COURT_HEARING',
        entityId: params.hearingId,
        recipients: params.notifyUserId
          ? [{ userId: params.notifyUserId }]
          : [],
        channels: [params.channel ?? 'SYSTEM_ALERT'],
        template: {
          systemTitle: `Court Hearing: ${hearingTitle}`,
          systemMessage: params.notes?.trim() || `Court hearing "${hearingTitle}" is scheduled${hearingDate ? ` for ${hearingDate}` : ''}.`,
          emailSubject: `[Global Wakili] Court Hearing Notification: ${hearingTitle}`,
          emailBody: `<strong>Court Hearing Notice</strong><br><br>Hearing: <strong>${hearingTitle}</strong>${hearingDate ? `<br>Date: ${hearingDate}` : ''}<br><br>${params.notes?.trim() ?? ''}`,
          variables: { hearingTitle, hearingDate },
        },
      });

      await CourtAuditService.logAction(db, {
        tenantId: params.tenantId,
        userId: params.actorId,
        hearingId: params.hearingId,
        matterId: (hearing as any).matterId,
        action: 'NOTIFICATION_REQUESTED',
        requestId: params.requestId ?? null,
        metadata: { notifyUserId: params.notifyUserId, channel: params.channel },
      });

      return { notified: true, hearingId: params.hearingId };
    }

    // ── PLEADING, DOCUMENT, TASK: still pending ───────────────────────────────
    await CourtAuditService.logAction(db, {
      tenantId: params.tenantId,
      userId: params.actorId,
      hearingId: params.hearingId,
      matterId: (hearing as any).matterId,
      action: params.type === 'PLEADING' ? 'PLEADING_REQUESTED'
            : params.type === 'DOCUMENT' ? 'DOCUMENT_HANDOFF_REQUESTED'
            : 'TASK_HANDOFF_REQUESTED',
      requestId: params.requestId ?? null,
      metadata: { bridgeType: params.type, reason: params.reason, notes: params.notes },
    });

    throw Object.assign(
      new Error(`${params.type} bridge requires additional schema or cross-module workflow`),
      { statusCode: 501, code: `COURT_${params.type}_BRIDGE_PENDING` },
    );
  }
}

export default CourtFilingBridgeService;
