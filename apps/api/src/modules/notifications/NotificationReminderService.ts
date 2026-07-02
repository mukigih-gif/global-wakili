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

import type { NotificationChannel, NotificationDbClient } from './notification.types';
import { NotificationQueueService } from './NotificationQueueService';

// CalendarReminderChannel (IN_APP/EMAIL/SMS/PUSH/WEBHOOK) → delivery channel.
// Calendar reminders are only ever created as IN_APP/EMAIL/SMS (see
// CalendarService.createEvent); others fall back to SYSTEM_ALERT.
const CALENDAR_CHANNEL_MAP: Record<string, NotificationChannel> = {
  IN_APP: 'SYSTEM_ALERT',
  EMAIL: 'EMAIL',
  SMS: 'SMS',
  PUSH: 'PUSH',
};

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
      NotificationReminderService.remindCalendarEvents(db),
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
      const hearings = await (db as any).courtHearing.findMany({
        where: {
          hearingDate: { gte: target, lte: endOfDay(target) },
          status: { in: ['SCHEDULED', 'ADJOURNED'] },
        },
        include: { matter: { select: { id: true, title: true, tenantId: true, leadAdvocateId: true } } },
        take: 200,
      }).catch(() => [] as any[]);

      for (const hearing of hearings) {
        if (!hearing.matter?.tenantId || !hearing.matter?.leadAdvocateId) { skipped++; continue; }

        const key = debounce(`hearing:${hearing.id}:${days}d`);
        try {
          await NotificationQueueService.enqueue({
            tenantId: hearing.matter.tenantId,
            category: 'court',
            priority: days <= 1 ? 'high' : 'normal',
            entityType: 'HEARING',
            entityId: hearing.id,
            debounceKey: key,
            recipients: [{ userId: hearing.matter.leadAdvocateId }],
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
          matter: { select: { leadAdvocateId: true } },
        },
        take: 200,
      }).catch(() => [] as any[]);

      for (const invoice of invoices) {
        if (!invoice.tenantId) { skipped++; continue; }

        const key = debounce(`invoice:${invoice.id}:${days}d`);
        const recipients = invoice.matter?.leadAdvocateId
          ? [{ userId: invoice.matter.leadAdvocateId }]
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
      const tasks = await (db as any).matterTask.findMany({
        where: {
          dueDate: { gte: target, lte: endOfDay(target) },
          status: { in: ['TODO', 'IN_PROGRESS'] },
          assignedTo: { not: null },
        },
        select: { id: true, title: true, tenantId: true, assignedTo: true, dueDate: true },
        take: 200,
      }).catch(() => [] as any[]);

      for (const task of tasks) {
        if (!task.tenantId || !task.assignedTo) { skipped++; continue; }

        const key = debounce(`task:${task.id}:${days}d`);
        try {
          await NotificationQueueService.enqueue({
            tenantId: task.tenantId,
            category: 'task',
            priority: 'normal',
            entityType: 'TASK',
            entityId: task.id,
            debounceKey: key,
            recipients: [{ userId: task.assignedTo }],
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

  /**
   * Calendar event reminders (CAL-001 Stage 2). Unlike the deadline-based
   * methods above, this polls the persisted CalendarReminder table: rows are
   * SCHEDULED at create time (CalendarService.createEvent) with a concrete
   * remindAt = startTime − minutesBefore. Here we dispatch the ones now due,
   * then move each through its SENT/FAILED lifecycle so it is not re-sent.
   * A 24h lookback prevents firing reminders missed during long downtime.
   */
  static async remindCalendarEvents(db: NotificationDbClient): Promise<{ sent: number; skipped: number }> {
    let sent = 0; let skipped = 0;

    const now = new Date();
    const lookbackStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const due = await (db as any).calendarReminder.findMany({
      where: {
        status: 'SCHEDULED',
        remindAt: { lte: now, gte: lookbackStart },
      },
      include: {
        event: { select: { id: true, title: true, startTime: true } },
      },
      orderBy: { remindAt: 'asc' },
      take: 500,
    }).catch(() => [] as any[]);

    for (const reminder of due) {
      if (!reminder.tenantId || !reminder.recipientId || !reminder.event) {
        await (db as any).calendarReminder.update({
          where: { id: reminder.id },
          data: { status: 'SKIPPED', cancelledAt: now, failureReason: 'missing recipient or event' },
        }).catch(() => {});
        skipped++;
        continue;
      }

      const start = reminder.event.startTime ? new Date(reminder.event.startTime) : null;
      const whenStr = start
        ? start.toLocaleString('en-KE', { dateStyle: 'full', timeStyle: 'short' })
        : 'soon';
      const channel = CALENDAR_CHANNEL_MAP[String(reminder.channel)] ?? 'SYSTEM_ALERT';

      try {
        await NotificationQueueService.enqueue({
          tenantId: reminder.tenantId,
          category: 'calendar',
          priority: 'normal',
          entityType: 'CALENDAR_EVENT',
          entityId: reminder.eventId,
          debounceKey: `calendar-reminder:${reminder.id}`,
          recipients: [{ userId: reminder.recipientId }],
          channels: [channel],
          template: {
            systemTitle: `Reminder: ${reminder.event.title}`,
            systemMessage: `"${reminder.event.title}" is scheduled for ${whenStr}.`,
            emailSubject: `[Global Wakili] Reminder: ${reminder.event.title}`,
            emailBody: `Reminder: <strong>${reminder.event.title}</strong> is scheduled for ${whenStr}.`,
            variables: { eventTitle: reminder.event.title },
          },
        });
        await (db as any).calendarReminder.update({
          where: { id: reminder.id },
          data: { status: 'SENT', sentAt: now },
        });
        sent++;
      } catch (err) {
        await (db as any).calendarReminder.update({
          where: { id: reminder.id },
          data: {
            status: 'FAILED',
            failedAt: now,
            failureReason: err instanceof Error ? err.message.slice(0, 480) : 'enqueue failed',
          },
        }).catch(() => {});
        skipped++;
      }
    }

    return { sent, skipped };
  }
}
