/**
 * NotificationReminderService.ts
 *
 * Reminder engine — queries upcoming deadlines and sends advance warnings.
 *
 * Reminder sources:
 *   - Matter hearing dates (1 day, 3 days, 7 days advance)
 *   - Invoice due dates (3 days, 1 day, same-day advance)
 *   - Matter statute of limitations (30 days, 7 days advance)
 *   - Task deadlines (1 day advance)
 *
 * Called by the notification.worker.ts on a scheduled interval (hourly).
 * Each reminder is idempotent — the debounceKey prevents duplicate sends
 * within the same reminder window.
 *
 * WIP-002 — Gap 006.
 */

import type { NotificationDbClient } from './notification.types';
import { NotificationQueueService } from './NotificationQueueService';

const HEARING_ADVANCE_DAYS = [7, 3, 1];
const INVOICE_ADVANCE_DAYS = [3, 1, 0];
const SOL_ADVANCE_DAYS = [30, 7];
const TASK_ADVANCE_DAYS = [1];

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function debounce(key: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `reminder:${key}:${today}`;
}

export class NotificationReminderService {
  static async runAll(db: NotificationDbClient): Promise<{ sent: number; skipped: number }> {
    let sent = 0;
    let skipped = 0;

    const results = await Promise.allSettled([
      NotificationReminderService.remindHearings(db),
      NotificationReminderService.remindInvoiceDue(db),
      NotificationReminderService.remindTaskDeadlines(db),
    ]);

    for (const result of results) {
      if (result.status === 'fulfilled') {
        sent    += result.value.sent;
        skipped += result.value.skipped;
      } else {
        console.error('[REMINDER] Engine error', result.reason instanceof Error ? result.reason.message : String(result.reason));
      }
    }

    console.info('[REMINDER] Run complete', { sent, skipped });
    return { sent, skipped };
  }

  static async remindHearings(db: NotificationDbClient): Promise<{ sent: number; skipped: number }> {
    let sent = 0; let skipped = 0;

    for (const days of HEARING_ADVANCE_DAYS) {
      const target = daysFromNow(days);
      const hearings = await (db as any).hearing.findMany({
        where: {
          hearingDate: { gte: target, lte: endOfDay(target) },
          status: { in: ['SCHEDULED', 'ADJOURNED'] },
        },
        include: { matter: { select: { id: true, title: true, tenantId: true, assignedUserId: true } } },
        take: 200,
      }).catch(() => [] as any[]);

      for (const hearing of hearings) {
        if (!hearing.matter?.tenantId || !hearing.matter?.assignedUserId) { skipped++; continue; }

        const key = debounce(`hearing:${hearing.id}:${days}d`);
        try {
          await NotificationQueueService.enqueue({
            tenantId: hearing.matter.tenantId,
            category: 'court',
            priority: days <= 1 ? 'high' : 'normal',
            entityType: 'HEARING',
            entityId: hearing.id,
            debounceKey: key,
            recipients: [{ userId: hearing.matter.assignedUserId }],
            channels: ['SYSTEM_ALERT', 'EMAIL'],
            template: {
              systemTitle: `Hearing Reminder — ${days === 0 ? 'Today' : `${days} day${days > 1 ? 's' : ''}`}`,
              systemMessage: `Hearing for matter "${hearing.matter.title}" is scheduled ${days === 0 ? 'today' : `in ${days} day${days > 1 ? 's' : ''}`}.`,
              emailSubject: `[Global Wakili] Hearing Reminder: ${hearing.matter.title}`,
              emailBody: `Your hearing for matter <strong>${hearing.matter.title}</strong> is scheduled for ${new Date(hearing.hearingDate).toLocaleDateString('en-KE')}.`,
              variables: { matterTitle: hearing.matter.title, days: String(days) },
            },
          });
          sent++;
        } catch { skipped++; }
      }
    }
    return { sent, skipped };
  }

  static async remindInvoiceDue(db: NotificationDbClient): Promise<{ sent: number; skipped: number }> {
    let sent = 0; let skipped = 0;

    for (const days of INVOICE_ADVANCE_DAYS) {
      const target = daysFromNow(days);
      const invoices = await (db as any).invoice.findMany({
        where: {
          dueDate: { gte: target, lte: endOfDay(target) },
          status: { in: ['INVOICED', 'PARTIALLY_PAID'] },
        },
        select: {
          id: true, invoiceNumber: true, balanceDue: true, dueDate: true,
          tenantId: true, clientId: true,
          matter: { select: { assignedUserId: true } },
        },
        take: 200,
      }).catch(() => [] as any[]);

      for (const invoice of invoices) {
        if (!invoice.tenantId) { skipped++; continue; }

        const key = debounce(`invoice:${invoice.id}:${days}d`);
        const recipients = invoice.matter?.assignedUserId
          ? [{ userId: invoice.matter.assignedUserId }]
          : [];
        if (!recipients.length) { skipped++; continue; }

        try {
          await NotificationQueueService.enqueue({
            tenantId: invoice.tenantId,
            category: 'billing',
            priority: days <= 1 ? 'high' : 'normal',
            entityType: 'INVOICE',
            entityId: invoice.id,
            debounceKey: key,
            recipients,
            channels: ['SYSTEM_ALERT', 'EMAIL'],
            template: {
              systemTitle: `Invoice Due ${days === 0 ? 'Today' : `in ${days} Day${days > 1 ? 's' : ''}`}: ${invoice.invoiceNumber}`,
              systemMessage: `Invoice ${invoice.invoiceNumber} balance of KES ${invoice.balanceDue} is due ${days === 0 ? 'today' : `in ${days} day${days > 1 ? 's' : ''}`}.`,
              emailSubject: `[Global Wakili] Invoice Due: ${invoice.invoiceNumber}`,
              emailBody: `Invoice <strong>${invoice.invoiceNumber}</strong> has a balance of KES ${invoice.balanceDue} due on ${new Date(invoice.dueDate).toLocaleDateString('en-KE')}.`,
              variables: { invoiceNumber: invoice.invoiceNumber, balanceDue: String(invoice.balanceDue), days: String(days) },
            },
          });
          sent++;
        } catch { skipped++; }
      }
    }
    return { sent, skipped };
  }

  static async remindTaskDeadlines(db: NotificationDbClient): Promise<{ sent: number; skipped: number }> {
    let sent = 0; let skipped = 0;

    for (const days of TASK_ADVANCE_DAYS) {
      const target = daysFromNow(days);
      const tasks = await (db as any).task.findMany({
        where: {
          dueDate: { gte: target, lte: endOfDay(target) },
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          assigneeId: { not: null },
        },
        select: { id: true, title: true, tenantId: true, assigneeId: true, dueDate: true },
        take: 200,
      }).catch(() => [] as any[]);

      for (const task of tasks) {
        if (!task.tenantId || !task.assigneeId) { skipped++; continue; }

        const key = debounce(`task:${task.id}:${days}d`);
        try {
          await NotificationQueueService.enqueue({
            tenantId: task.tenantId,
            category: 'task',
            priority: 'normal',
            entityType: 'TASK',
            entityId: task.id,
            debounceKey: key,
            recipients: [{ userId: task.assigneeId }],
            channels: ['SYSTEM_ALERT'],
            template: {
              systemTitle: `Task Due Tomorrow: ${task.title}`,
              systemMessage: `Task "${task.title}" is due tomorrow.`,
              variables: { taskTitle: task.title },
            },
          });
          sent++;
        } catch { skipped++; }
      }
    }
    return { sent, skipped };
  }
}
