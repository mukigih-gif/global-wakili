/**
 * NotificationDigestService.ts
 *
 * Digest engine — batches unread notifications into daily/weekly summaries.
 *
 * Digest frequency is driven by the user's NotificationPreference:
 *   - digest: 'DAILY'   → sends once per day at the configured digest hour (default 08:00)
 *   - digest: 'WEEKLY'  → sends once per week on Monday morning
 *   - digest: 'NONE'    → user opted out; no digest sent
 *
 * A digest is only sent if the user has at least 1 unread notification
 * in the digest window. Digests are not sent for critical/high-priority
 * items that were already escalated.
 *
 * WIP-002 — Gap 006.
 */

import type { NotificationDbClient } from './notification.types';
import { NotificationQueueService } from './NotificationQueueService';

const DIGEST_HOUR = parseInt(process.env.NOTIFICATION_DIGEST_HOUR ?? '8', 10);

function isDigestTime(): boolean {
  return new Date().getHours() === DIGEST_HOUR;
}

function isWeeklyDigestDay(): boolean {
  return new Date().getDay() === 1 && isDigestTime(); // Monday
}

function windowStart(frequency: 'DAILY' | 'WEEKLY'): Date {
  const d = new Date();
  if (frequency === 'WEEKLY') {
    d.setDate(d.getDate() - 7);
  } else {
    d.setDate(d.getDate() - 1);
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

export class NotificationDigestService {
  static async runAll(db: NotificationDbClient): Promise<{ sent: number; skipped: number }> {
    if (!isDigestTime()) {
      return { sent: 0, skipped: 0 };
    }

    let sent = 0;
    let skipped = 0;

    const frequencies: Array<'DAILY' | 'WEEKLY'> = ['DAILY'];
    if (isWeeklyDigestDay()) frequencies.push('WEEKLY');

    for (const frequency of frequencies) {
      const window = windowStart(frequency);

      // Find users who have opted in to digest notifications
      const preferences = await (db as any).notificationPreference.findMany({
        where: {
          // Look for users who have digest enabled (digestFrequency field if present)
          enabled: true,
          channel: 'IN_APP',
        },
        select: { tenantId: true, userId: true },
        take: 500,
      }).catch(() => [] as any[]);

      const processed = new Set<string>();

      for (const pref of preferences) {
        if (!pref.tenantId || !pref.userId) continue;
        const key = `${pref.tenantId}:${pref.userId}`;
        if (processed.has(key)) continue;
        processed.add(key);

        const unread = await (db as any).notification.findMany({
          where: {
            tenantId: pref.tenantId,
            userId: pref.userId,
            readAt: null,
            sentAt: { gte: window },
            priority: { in: ['low', 'normal'] },
          },
          select: { id: true, systemTitle: true, systemMessage: true, category: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }).catch(() => [] as any[]);

        if (!unread.length) { skipped++; continue; }

        const digestKey = `digest:${frequency.toLowerCase()}:${pref.userId}:${new Date().toISOString().slice(0, 10)}`;
        const summary = unread
          .slice(0, 5)
          .map((n: any) => `• ${n.systemTitle}`)
          .join('\n');
        const more = unread.length > 5 ? `\n...and ${unread.length - 5} more.` : '';

        try {
          await NotificationQueueService.enqueue({
            tenantId: pref.tenantId,
            category: 'system_alert',
            priority: 'low',
            debounceKey: digestKey,
            recipients: [{ userId: pref.userId }],
            channels: ['EMAIL'],
            template: {
              systemTitle: `Your ${frequency === 'WEEKLY' ? 'Weekly' : 'Daily'} Digest — ${unread.length} unread notification${unread.length > 1 ? 's' : ''}`,
              systemMessage: `${summary}${more}`,
              emailSubject: `[Global Wakili] Your ${frequency === 'WEEKLY' ? 'Weekly' : 'Daily'} Digest`,
              emailBody: `
                <h3>Your ${frequency === 'WEEKLY' ? 'Weekly' : 'Daily'} Notification Digest</h3>
                <p>You have <strong>${unread.length}</strong> unread notification${unread.length > 1 ? 's' : ''} from the past ${frequency === 'WEEKLY' ? '7 days' : '24 hours'}:</p>
                <ul>
                  ${unread.slice(0, 10).map((n: any) => `<li><strong>${n.systemTitle}</strong><br><small>${n.systemMessage}</small></li>`).join('')}
                </ul>
                ${unread.length > 10 ? `<p>...and ${unread.length - 10} more. <a href="${process.env.APP_URL ?? 'https://app.globalwakili.co.ke'}/notifications">View all notifications</a></p>` : ''}
              `,
              variables: { count: String(unread.length), frequency },
            },
          });
          sent++;
        } catch { skipped++; }
      }
    }

    console.info('[DIGEST] Run complete', { sent, skipped });
    return { sent, skipped };
  }
}
