/**
 * ReceptionHandoffBridgeService.ts
 *
 * Routes reception desk handoffs to appropriate cross-module workflows.
 *
 * DOCUMENT type → NOW ACTIVE:
 *   When a document is received (DOC_INCOMING) or dispatched (DOC_OUTGOING),
 *   creates a Document record in Document Management and fires a notification.
 *
 * NOTIFICATION type → NOW ACTIVE via NotificationQueueService (WIP-002).
 *
 * CLIENT_ONBOARDING, MATTER_OPENING, TASK → still PENDING_CROSS_MODULE.
 */

import { ReceptionLogService } from './ReceptionLogService';
import { ReceptionAuditService } from './ReceptionAuditService';
import { NotificationQueueService } from '../notifications/NotificationQueueService';

type HandoffType = 'CLIENT_ONBOARDING' | 'MATTER_OPENING' | 'TASK' | 'DOCUMENT' | 'NOTIFICATION';

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
      // Document-specific
      scanUrl?: string | null;
      documentTitle?: string | null;
      // Notification-specific
      notifyUserId?: string | null;
      channel?: 'SYSTEM_ALERT' | 'EMAIL' | 'SMS';
    },
  ) {
    const log = await ReceptionLogService.getLog(db, {
      tenantId: params.tenantId,
      logId: params.logId,
    });

    const logRecord = log as any;

    // ── DOCUMENT handoff: now active ──────────────────────────────────────────
    if (params.type === 'DOCUMENT') {
      const isIncoming = logRecord.type === 'DOC_INCOMING';
      const isOutgoing = logRecord.type === 'DOC_OUTGOING';
      const documentTitle = params.documentTitle?.trim() || logRecord.subject;
      const scanUrl = params.scanUrl?.trim() || logRecord.digitalCopyUrl || null;

      let documentId: string | null = null;

      // Create a Document record in Document Management if there's a scan URL
      if (scanUrl && logRecord.matterId) {
        try {
          const doc = await db.document.create({
            data: {
              tenantId: params.tenantId,
              matterId: logRecord.matterId,
              title: documentTitle,
              description: isIncoming
                ? `Document received at reception: ${logRecord.subject}`
                : `Document dispatched from firm: ${logRecord.subject}`,
              mimeType: 'application/octet-stream',
              fileSize: 0,
              fileUrl: scanUrl,
              fileHash: '0'.repeat(64),
              uploadedBy: params.actorId,
              status: 'ACTIVE',
              metadata: {
                source: isIncoming ? 'RECEPTION_INCOMING' : 'RECEPTION_OUTGOING',
                receptionLogId: params.logId,
                deliveryMethod: logRecord.deliveryMethod ?? null,
                trackingNumber: logRecord.trackingNumber ?? null,
                isUrgent: logRecord.isUrgent ?? false,
                recordedAt: new Date().toISOString(),
              },
            },
            select: { id: true },
          });
          documentId = doc.id;
        } catch { /* non-fatal — log proceeds even if doc creation fails */ }
      }

      // Fire notification for urgent incoming documents
      if (isIncoming && logRecord.isUrgent && logRecord.receivedById) {
        await NotificationQueueService.enqueue({
          tenantId: params.tenantId,
          category: 'system_alert',
          priority: 'high',
          entityType: 'RECEPTION_LOG',
          entityId: params.logId,
          debounceKey: `reception:urgent:${params.logId}`,
          recipients: [{ userId: logRecord.receivedById }],
          channels: ['SYSTEM_ALERT'],
          template: {
            systemTitle: `Urgent Document Received: ${logRecord.subject}`,
            systemMessage: `An urgent document has been received at reception: "${logRecord.subject}". ${logRecord.deliveryMethod ? `Via: ${logRecord.deliveryMethod}.` : ''}`,
            variables: { subject: logRecord.subject, deliveryMethod: logRecord.deliveryMethod ?? '' },
          },
        }).catch(() => {});
      }

      await ReceptionAuditService.logAction(db, {
        tenantId: params.tenantId,
        userId: params.actorId,
        logId: params.logId,
        matterId: logRecord.matterId ?? null,
        action: 'DOCUMENT_HANDOFF_REQUESTED',
        requestId: params.requestId ?? null,
        metadata: {
          direction: isIncoming ? 'INCOMING' : isOutgoing ? 'OUTGOING' : 'UNKNOWN',
          documentId,
          scanUrl,
          documentTitle,
          trackingNumber: logRecord.trackingNumber ?? null,
        },
      });

      return {
        linked: true,
        direction: isIncoming ? 'INCOMING' : 'OUTGOING',
        documentId,
        receptionLogId: params.logId,
      };
    }

    // ── NOTIFICATION handoff: now active ──────────────────────────────────────
    if (params.type === 'NOTIFICATION') {
      if (params.notifyUserId) {
        await NotificationQueueService.enqueue({
          tenantId: params.tenantId,
          category: 'reception',
          priority: logRecord.isUrgent ? 'high' : 'normal',
          entityType: 'RECEPTION_LOG',
          entityId: params.logId,
          debounceKey: `reception:notify:${params.logId}:${params.notifyUserId}`,
          recipients: [{ userId: params.notifyUserId }],
          channels: [params.channel ?? 'SYSTEM_ALERT'],
          template: {
            systemTitle: `Reception: ${logRecord.subject}`,
            systemMessage: params.notes?.trim() || `Reception desk item: "${logRecord.subject}". ${logRecord.isUrgent ? 'URGENT.' : ''}`,
            variables: { subject: logRecord.subject, isUrgent: String(logRecord.isUrgent ?? false) },
          },
        });
      }

      await ReceptionAuditService.logAction(db, {
        tenantId: params.tenantId,
        userId: params.actorId,
        logId: params.logId,
        matterId: logRecord.matterId ?? null,
        action: 'NOTIFICATION_REQUESTED',
        requestId: params.requestId ?? null,
        metadata: { notifyUserId: params.notifyUserId, channel: params.channel },
      });

      return { notified: true, logId: params.logId };
    }

    // ── CLIENT_ONBOARDING, MATTER_OPENING, TASK: still pending ───────────────
    await ReceptionAuditService.logAction(db, {
      tenantId: params.tenantId,
      userId: params.actorId,
      logId: params.logId,
      matterId: logRecord.matterId ?? null,
      action: params.type === 'CLIENT_ONBOARDING' ? 'CLIENT_ONBOARDING_HANDOFF_REQUESTED'
            : params.type === 'MATTER_OPENING'    ? 'MATTER_OPENING_HANDOFF_REQUESTED'
            : 'TASK_HANDOFF_REQUESTED',
      requestId: params.requestId ?? null,
      metadata: { handoffType: params.type, reason: params.reason, notes: params.notes },
    });

    throw Object.assign(
      new Error(`${params.type} handoff requires the relevant cross-module workflow before activation`),
      { statusCode: 501, code: `RECEPTION_${params.type}_HANDOFF_PENDING` },
    );
  }
}

export default ReceptionHandoffBridgeService;
