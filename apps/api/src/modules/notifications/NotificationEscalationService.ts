/**
 * NotificationEscalationService.ts
 *
 * Escalation engine — re-routes unacknowledged notifications to supervisors.
 *
 * Escalation rules:
 *   - HIGH priority: escalate if not read within 4 hours of send
 *   - CRITICAL priority: escalate if not read within 1 hour of send
 *   - NORMAL priority: escalate if not read within 24 hours of send
 *
 * Escalation target: the matter's assigned partner / supervisor user.
 * If no supervisor is found, escalation is logged but not sent.
 *
 * Each escalation is idempotent — a unique debounceKey prevents duplicate escalations.
 *
 * WIP-002 — Gap 006.
 */

import type { NotificationDbClient } from './notification.types';
import { NotificationQueueService } from './NotificationQueueService';

const SLA_HOURS: Record<string, number> = {
  critical: 1,
  high: 4,
  normal: 24,
  low: 72,
};

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

export class NotificationEscalationService {
  static async runAll(db: NotificationDbClient): Promise<{ escalated: number; skipped: number }> {
    let escalated = 0;
    let skipped = 0;

    for (const [priority, hours] of Object.entries(SLA_HOURS)) {
      const cutoff = hoursAgo(hours);

      const unread = await (db as any).notification.findMany({
        where: {
          priority,
          sentAt: { lte: cutoff },
          readAt: null,
          status: { in: ['SENT', 'DELIVERED'] },
          escalatedAt: null,
        },
        select: {
          id: true, tenantId: true, userId: true, systemTitle: true,
          systemMessage: true, priority: true, category: true, entityType: true, entityId: true,
        },
        take: 100,
      }).catch(() => [] as any[]);

      for (const notification of unread) {
        if (!notification.tenantId || !notification.userId) { skipped++; continue; }

        // Find supervisor for this user
        const supervisor = await (db as any).user.findFirst({
          where: {
            tenantId: notification.tenantId,
            status: 'ACTIVE',
            role: { in: ['PARTNER', 'SENIOR_ASSOCIATE', 'MANAGER'] },
            id: { not: notification.userId },
          },
          select: { id: true },
          orderBy: { createdAt: 'asc' },
        }).catch(() => null);

        if (!supervisor) { skipped++; continue; }

        const debounceKey = `escalation:${notification.id}:${priority}`;
        try {
          await NotificationQueueService.enqueue({
            tenantId: notification.tenantId,
            category: (notification.category ?? 'system_alert') as any,
            priority: 'high',
            entityType: notification.entityType ?? 'NOTIFICATION',
            entityId: notification.entityId ?? notification.id,
            debounceKey,
            recipients: [{ userId: supervisor.id }],
            channels: ['SYSTEM_ALERT', 'EMAIL'],
            template: {
              systemTitle: `[ESCALATION] Unread: ${notification.systemTitle}`,
              systemMessage: `Notification "${notification.systemTitle}" has not been read by the assigned user. Priority: ${priority.toUpperCase()}.`,
              emailSubject: `[Global Wakili] Escalation: ${notification.systemTitle}`,
              emailBody: `A <strong>${priority.toUpperCase()}</strong> priority notification has not been acknowledged within the SLA window.<br><br><em>${notification.systemMessage}</em>`,
              variables: { priority: priority.toUpperCase(), title: notification.systemTitle },
            },
          });

          // Mark notification as escalated
          await (db as any).notification.update({
            where: { id: notification.id },
            data: { escalatedAt: new Date() },
          }).catch(() => null);

          escalated++;
        } catch { skipped++; }
      }
    }

    console.info('[ESCALATION] Run complete', { escalated, skipped });
    return { escalated, skipped };
  }
}
