import {
  NotificationChannel,
  NotificationDeliveryAttemptStatus,
  NotificationPreferenceScope,
  NotificationProviderConfigStatus,
  NotificationStatus,
  NotificationTemplateStatus,
  NotificationWebhookVerificationStatus,
  PrismaClient,
  TenantRole,
} from '@prisma/client';

/*
 * 14_notifications.seed.ts — Per-tenant notification platform layer (CLAUDE.md §12).
 *
 * Comprehensive notification-domain seed: ALL six models populated
 * (standing directive — whole domain, not a minimal subset):
 *   NotificationProviderConfig, NotificationTemplate, NotificationPreference,
 *   Notification, NotificationDeliveryAttempt, NotificationWebhookEvent.
 *
 * Schema realities handled:
 *   - Read state is the `readAt` timestamp (set = read, null = unread) — there is
 *     NO READ/UNREAD status. `status` is the delivery state
 *     (DELIVERED/SENT/BOUNCED).
 *   - Notification "type" (HEARING_REMINDER, INVOICE_DUE, …) is a String
 *     `category` + `templateKey`; the source row is linked via
 *     entityType/entityId.
 *   - `channel` is single-valued per row, so a multi-channel event fans out to
 *     multiple Notification rows (IN_APP always; EMAIL/SMS for some) — mirroring
 *     the real delivery engine.
 *   - "DeliveryTracking" = NotificationDeliveryAttempt.
 *
 * DEMO/FIXTURE data — run only under the master demo-data gate.
 *
 * Policy:
 * - Idempotent: provider upsert(tenantId,channel,providerKey); template upsert(
 *   tenantId,key,version); preference upsert(tenantId,scope,scopeId,category,
 *   channel); Notification gated by findFirst(tenantId,debounceKey); delivery
 *   attempt gated by (tenantId,notificationId,attemptNumber); webhook event
 *   gated by (tenantId,providerMessageId).
 * - Tenant-scoped. No schema changes, no destructive operations.
 */

type SeedPrisma = PrismaClient;

type EntityKey = 'hearing' | 'matter' | 'leave' | 'payroll' | 'task';

type ProviderSeed = { channel: NotificationChannel; providerKey: string; displayName: string };
type TemplateSeed = { key: string; name: string; subject: string; smsContent: string; systemTitle: string; systemMessage: string };
type NotifSeed = {
  category: string;
  channel: NotificationChannel;
  recipientRole: TenantRole;
  entityKey: EntityKey;
  entityType: string;
  title: string;
  message: string;
  read: boolean;
  status: NotificationStatus;
  deliver: boolean;
  deliveryStatus?: NotificationDeliveryAttemptStatus;
  webhook?: boolean;
};

export type NotificationsSeedResult = {
  status: 'notifications_seed_complete';
  tenantId: string;
  notificationProviderConfigs: number;
  notificationTemplates: number;
  notificationPreferences: number;
  notifications: number;
  unreadNotifications: number;
  notificationDeliveryAttempts: number;
  notificationWebhookEvents: number;
};

const PROVIDERS: ProviderSeed[] = [
  { channel: NotificationChannel.EMAIL, providerKey: 'sendgrid', displayName: 'SendGrid' },
  { channel: NotificationChannel.SMS, providerKey: 'africastalking', displayName: "Africa's Talking" },
  { channel: NotificationChannel.IN_APP, providerKey: 'internal', displayName: 'In-App' },
];

const TEMPLATES: TemplateSeed[] = [
  { key: 'HEARING_REMINDER', name: 'Court Hearing Reminder', subject: 'Upcoming Court Hearing', smsContent: 'Reminder: court hearing scheduled.', systemTitle: 'Hearing Reminder', systemMessage: 'You have an upcoming court hearing.' },
  { key: 'INVOICE_DUE', name: 'Invoice Due Reminder', subject: 'Invoice Due', smsContent: 'An invoice is due.', systemTitle: 'Invoice Due', systemMessage: 'A client invoice is due for payment.' },
  { key: 'LEAVE_APPROVED', name: 'Leave Approved', subject: 'Leave Request Approved', smsContent: 'Your leave was approved.', systemTitle: 'Leave Approved', systemMessage: 'Your leave request has been approved.' },
  { key: 'PAYROLL_PROCESSED', name: 'Payroll Processed', subject: 'Payroll Processed', smsContent: 'Payroll has been processed.', systemTitle: 'Payroll Processed', systemMessage: 'The monthly payroll run has completed.' },
  { key: 'TASK_ASSIGNED', name: 'Task Assigned', subject: 'New Task Assigned', smsContent: 'A new task was assigned to you.', systemTitle: 'New Task', systemMessage: 'A new task has been assigned to you.' },
  { key: 'MATTER_UPDATE', name: 'Matter Update', subject: 'Matter Status Update', smsContent: 'A matter you follow was updated.', systemTitle: 'Matter Update', systemMessage: 'A matter has a new status update.' },
];

/* Multi-channel fan-out: IN_APP for every event; EMAIL/SMS for some.
 * 11 rows: 6 IN_APP + 3 EMAIL + 2 SMS; 5 unread / 6 read; one BOUNCED. */
const NOTIFICATIONS: NotifSeed[] = [
  { category: 'HEARING_REMINDER', channel: NotificationChannel.IN_APP, recipientRole: TenantRole.ADVOCATE, entityKey: 'hearing', entityType: 'CourtHearing', title: 'Hearing Reminder', message: 'You have an upcoming court hearing this week.', read: false, status: NotificationStatus.DELIVERED, deliver: false },
  { category: 'HEARING_REMINDER', channel: NotificationChannel.EMAIL, recipientRole: TenantRole.ADVOCATE, entityKey: 'hearing', entityType: 'CourtHearing', title: 'Upcoming Court Hearing', message: 'Reminder of your upcoming court hearing.', read: true, status: NotificationStatus.DELIVERED, deliver: true, deliveryStatus: NotificationDeliveryAttemptStatus.DELIVERED, webhook: true },
  { category: 'INVOICE_DUE', channel: NotificationChannel.IN_APP, recipientRole: TenantRole.ACCOUNTANT, entityKey: 'matter', entityType: 'Matter', title: 'Invoice Due', message: 'A client invoice linked to a matter is due.', read: true, status: NotificationStatus.DELIVERED, deliver: false },
  { category: 'INVOICE_DUE', channel: NotificationChannel.EMAIL, recipientRole: TenantRole.ACCOUNTANT, entityKey: 'matter', entityType: 'Matter', title: 'Invoice Due', message: 'A client invoice is due for payment.', read: false, status: NotificationStatus.DELIVERED, deliver: true, deliveryStatus: NotificationDeliveryAttemptStatus.DELIVERED, webhook: true },
  { category: 'LEAVE_APPROVED', channel: NotificationChannel.IN_APP, recipientRole: TenantRole.ADVOCATE, entityKey: 'leave', entityType: 'LeaveRequest', title: 'Leave Approved', message: 'Your annual leave request has been approved.', read: true, status: NotificationStatus.DELIVERED, deliver: false },
  { category: 'PAYROLL_PROCESSED', channel: NotificationChannel.IN_APP, recipientRole: TenantRole.FIRM_ADMIN, entityKey: 'payroll', entityType: 'PayrollBatch', title: 'Payroll Processed', message: 'The monthly payroll run has completed.', read: false, status: NotificationStatus.DELIVERED, deliver: false },
  { category: 'PAYROLL_PROCESSED', channel: NotificationChannel.EMAIL, recipientRole: TenantRole.FIRM_ADMIN, entityKey: 'payroll', entityType: 'PayrollBatch', title: 'Payroll Processed', message: 'Payroll has been processed and posted.', read: true, status: NotificationStatus.DELIVERED, deliver: true, deliveryStatus: NotificationDeliveryAttemptStatus.DELIVERED },
  { category: 'TASK_ASSIGNED', channel: NotificationChannel.IN_APP, recipientRole: TenantRole.ASSOCIATE, entityKey: 'task', entityType: 'MatterTask', title: 'New Task', message: 'A new task has been assigned to you.', read: false, status: NotificationStatus.DELIVERED, deliver: false },
  { category: 'TASK_ASSIGNED', channel: NotificationChannel.SMS, recipientRole: TenantRole.ASSOCIATE, entityKey: 'task', entityType: 'MatterTask', title: 'New Task', message: 'A new task was assigned to you.', read: true, status: NotificationStatus.SENT, deliver: true, deliveryStatus: NotificationDeliveryAttemptStatus.DELIVERED },
  { category: 'MATTER_UPDATE', channel: NotificationChannel.IN_APP, recipientRole: TenantRole.ADVOCATE, entityKey: 'matter', entityType: 'Matter', title: 'Matter Update', message: 'A matter has a new status update.', read: true, status: NotificationStatus.DELIVERED, deliver: false },
  { category: 'MATTER_UPDATE', channel: NotificationChannel.SMS, recipientRole: TenantRole.ADVOCATE, entityKey: 'matter', entityType: 'Matter', title: 'Matter Update', message: 'A matter you follow was updated.', read: false, status: NotificationStatus.BOUNCED, deliver: true, deliveryStatus: NotificationDeliveryAttemptStatus.BOUNCED },
];

const SMS_PLACEHOLDER_PHONE = '+254700000000';

function providerForChannel(channel: NotificationChannel): string | null {
  const p = PROVIDERS.find((x) => x.channel === channel);
  return p ? p.providerKey : null;
}

async function seedEntityRefs(prisma: SeedPrisma, tenantId: string): Promise<Record<EntityKey, string | null>> {
  const [hearing, matter, leave, payroll, task] = await Promise.all([
    prisma.courtHearing.findFirst({ where: { tenantId }, select: { id: true } }),
    prisma.matter.findFirst({ where: { tenantId }, select: { id: true } }),
    prisma.leaveRequest.findFirst({ where: { tenantId, status: 'APPROVED' }, select: { id: true } }),
    prisma.payrollBatch.findFirst({ where: { tenantId }, select: { id: true } }),
    prisma.matterTask.findFirst({ where: { tenantId }, select: { id: true } }),
  ]);
  return {
    hearing: hearing?.id ?? null,
    matter: matter?.id ?? null,
    leave: leave?.id ?? null,
    payroll: payroll?.id ?? null,
    task: task?.id ?? null,
  };
}

export async function seedNotifications(prisma: PrismaClient, tenantId: string): Promise<NotificationsSeedResult> {
  if (!tenantId || tenantId.trim().length === 0) {
    throw new Error('seedNotifications requires a tenantId.');
  }

  const allUsers = await prisma.user.findMany({
    where: { tenantId, status: 'ACTIVE' },
    select: { id: true, name: true, email: true, tenantRole: true },
  });
  if (allUsers.length === 0) {
    throw new Error(`seedNotifications: no active users for tenant ${tenantId}. Run 02_users first.`);
  }
  const admin = allUsers.find((u) => u.tenantRole === TenantRole.FIRM_ADMIN) ?? allUsers[0];
  const userByRole = (role: TenantRole) => allUsers.find((u) => u.tenantRole === role) ?? admin;

  // 1. Provider configs (EMAIL / SMS / IN_APP).
  for (const p of PROVIDERS) {
    await prisma.notificationProviderConfig.upsert({
      where: { tenantId_channel_providerKey: { tenantId, channel: p.channel, providerKey: p.providerKey } },
      update: { displayName: p.displayName, status: NotificationProviderConfigStatus.ACTIVE, isDefault: true },
      create: {
        tenantId,
        channel: p.channel,
        providerKey: p.providerKey,
        displayName: p.displayName,
        status: NotificationProviderConfigStatus.ACTIVE,
        isDefault: true,
        config: { simulated: true },
      },
    });
  }

  // 2. Templates (one per category).
  for (const t of TEMPLATES) {
    await prisma.notificationTemplate.upsert({
      where: { tenantId_key_version: { tenantId, key: t.key, version: 1 } },
      update: { name: t.name, subject: t.subject, smsContent: t.smsContent, systemTitle: t.systemTitle, systemMessage: t.systemMessage, status: NotificationTemplateStatus.ACTIVE },
      create: {
        tenantId,
        key: t.key,
        version: 1,
        name: t.name,
        category: t.key,
        subject: t.subject,
        body: t.systemMessage,
        smsContent: t.smsContent,
        systemTitle: t.systemTitle,
        systemMessage: t.systemMessage,
        status: NotificationTemplateStatus.ACTIVE,
        variables: ['recipientName'],
      },
    });
  }

  // 3. Preferences — per user: IN_APP on, EMAIL on, SMS off.
  const prefChannels: { channel: NotificationChannel; enabled: boolean }[] = [
    { channel: NotificationChannel.IN_APP, enabled: true },
    { channel: NotificationChannel.EMAIL, enabled: true },
    { channel: NotificationChannel.SMS, enabled: false },
  ];
  for (const user of allUsers) {
    for (const pref of prefChannels) {
      await prisma.notificationPreference.upsert({
        where: {
          tenantId_scope_scopeId_category_channel: {
            tenantId,
            scope: NotificationPreferenceScope.USER,
            scopeId: user.id,
            category: 'all',
            channel: pref.channel,
          },
        },
        update: { enabled: pref.enabled, userId: user.id },
        create: {
          tenantId,
          scope: NotificationPreferenceScope.USER,
          scopeId: user.id,
          userId: user.id,
          category: 'all',
          channel: pref.channel,
          enabled: pref.enabled,
        },
      });
    }
  }

  // 4. Notifications (+ 5. delivery attempts, 6. webhook events).
  const entityRefs = await seedEntityRefs(prisma, tenantId);
  const now = new Date();
  let notifications = 0;
  let deliveryAttempts = 0;
  let webhookEvents = 0;

  for (const seed of NOTIFICATIONS) {
    const recipient = userByRole(seed.recipientRole);
    const debounceKey = `${seed.category}:${seed.channel}`;
    const provider = providerForChannel(seed.channel);
    const providerMessageId = seed.deliver ? `msg-${tenantId.slice(-6)}-${debounceKey}` : null;
    const isEmail = seed.channel === NotificationChannel.EMAIL;
    const isSms = seed.channel === NotificationChannel.SMS;

    let notificationId: string;
    const existing = await prisma.notification.findFirst({ where: { tenantId, debounceKey }, select: { id: true } });
    if (existing) {
      notificationId = existing.id;
    } else {
      const created = await prisma.notification.create({
        data: {
          tenantId,
          userId: recipient.id,
          recipientEmail: isEmail ? recipient.email : null,
          recipientPhone: isSms ? SMS_PLACEHOLDER_PHONE : null,
          recipientName: recipient.name,
          channel: seed.channel,
          systemTitle: seed.title,
          systemMessage: seed.message,
          emailSubject: isEmail ? seed.title : null,
          emailBody: isEmail ? seed.message : null,
          smsContent: isSms ? seed.message : null,
          status: seed.status,
          sentAt: now,
          deliveredAt: seed.status === NotificationStatus.DELIVERED ? now : null,
          failedAt: seed.status === NotificationStatus.BOUNCED ? now : null,
          readAt: seed.read ? now : null,
          attemptCount: seed.deliver ? 1 : 0,
          category: seed.category,
          priority: 'NORMAL',
          templateKey: seed.category,
          entityType: seed.entityType,
          entityId: entityRefs[seed.entityKey],
          provider,
          providerMessageId,
          debounceKey,
          metadata: { seeded: true },
        },
        select: { id: true },
      });
      notificationId = created.id;
    }
    notifications += 1;

    // 5. Delivery attempt (external channels only).
    if (seed.deliver) {
      const existingAttempt = await prisma.notificationDeliveryAttempt.findFirst({
        where: { tenantId, notificationId, attemptNumber: 1 },
        select: { id: true },
      });
      if (!existingAttempt) {
        const attemptStatus = seed.deliveryStatus ?? NotificationDeliveryAttemptStatus.DELIVERED;
        await prisma.notificationDeliveryAttempt.create({
          data: {
            tenantId,
            notificationId,
            channel: seed.channel,
            provider,
            providerMessageId,
            status: attemptStatus,
            attemptNumber: 1,
            acceptedAt: now,
            deliveredAt: attemptStatus === NotificationDeliveryAttemptStatus.DELIVERED ? now : null,
            bouncedAt: attemptStatus === NotificationDeliveryAttemptStatus.BOUNCED ? now : null,
            errorMessage: attemptStatus === NotificationDeliveryAttemptStatus.BOUNCED ? 'Recipient address bounced' : null,
          },
        });
      }
      deliveryAttempts += 1;
    }

    // 6. Webhook event (provider delivery callback).
    if (seed.webhook && providerMessageId) {
      const existingWebhook = await prisma.notificationWebhookEvent.findFirst({
        where: { tenantId, providerMessageId },
        select: { id: true },
      });
      if (!existingWebhook) {
        await prisma.notificationWebhookEvent.create({
          data: {
            tenantId,
            notificationId,
            provider: provider ?? 'sendgrid',
            providerMessageId,
            eventType: 'delivered',
            status: NotificationStatus.DELIVERED,
            verificationStatus: NotificationWebhookVerificationStatus.VERIFIED,
            processedAt: now,
            payload: { event: 'delivered', simulated: true },
          },
        });
      }
      webhookEvents += 1;
    }
  }

  // Final counts via queries (idempotent-safe).
  const debounceKeys = NOTIFICATIONS.map((n) => `${n.category}:${n.channel}`);
  const userIds = allUsers.map((u) => u.id);
  const [
    notificationProviderConfigs,
    notificationTemplates,
    notificationPreferences,
    notificationsCount,
    unreadNotifications,
    notificationDeliveryAttempts,
    notificationWebhookEvents,
  ] = await Promise.all([
    prisma.notificationProviderConfig.count({ where: { tenantId, providerKey: { in: PROVIDERS.map((p) => p.providerKey) } } }),
    prisma.notificationTemplate.count({ where: { tenantId, key: { in: TEMPLATES.map((t) => t.key) } } }),
    prisma.notificationPreference.count({ where: { tenantId, scope: NotificationPreferenceScope.USER, scopeId: { in: userIds } } }),
    prisma.notification.count({ where: { tenantId, debounceKey: { in: debounceKeys } } }),
    prisma.notification.count({ where: { tenantId, debounceKey: { in: debounceKeys }, readAt: null } }),
    prisma.notificationDeliveryAttempt.count({ where: { tenantId, notification: { debounceKey: { in: debounceKeys } } } }),
    prisma.notificationWebhookEvent.count({ where: { tenantId, notification: { debounceKey: { in: debounceKeys } } } }),
  ]);

  return {
    status: 'notifications_seed_complete',
    tenantId,
    notificationProviderConfigs,
    notificationTemplates,
    notificationPreferences,
    notifications: notificationsCount,
    unreadNotifications,
    notificationDeliveryAttempts,
    notificationWebhookEvents,
  };
}
