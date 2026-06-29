import {
  ExternalCalendarAccountStatus,
  ExternalCalendarProvider,
  ExternalJobProvider,
  ExternalJobStatus,
  PlatformWebhookDirection,
  PlatformWebhookStatus,
  Prisma,
  PrismaClient,
  TenantRole,
} from '@prisma/client';

/*
 * 18_integrations.seed.ts — Per-tenant external integrations layer (CLAUDE.md §12;
 * WIP-006, TODO-008).
 *
 * Faithful seed of REAL models only — IntegrationConfig / IntegrationLog /
 * WebhookConfig / WebhookDelivery do NOT exist (logged FINDING-INTEG-001).
 * Mapping to real models:
 *   - Integration ACTIVITY  → ExternalJobQueue (providers ETIMS/BANKING/
 *     NOTIFICATIONS; there is no MPESA/SMS provider value, so M-PESA→BANKING,
 *     Africa's Talking SMS→NOTIFICATIONS).
 *   - Webhook CONFIG        → Webhook (tenant outbound webhook).
 *   - Webhook DELIVERY      → PlatformWebhookLog (the only webhook delivery log;
 *     platform-scoped but accepts tenantId).
 *   - MS365 / Google        → ExternalCalendarAccount (the only OAuth-account
 *     model; calendar-scoped). No CONFIGURED status → DISCONNECTED +
 *     metadata.configured=true/active=false (honest re: TODO-008).
 *   - There is NO unified IntegrationConfig table and NO eTIMS/M-PESA config
 *     model. Africa's Talking SMS config already exists as a
 *     NotificationProviderConfig (layer 14).
 *
 * Honesty (ADR-011): eTIMS/M-PESA seeded as SANDBOX/SIMULATED; MS365/Google
 * CONFIGURED-not-ACTIVE; NO real keys/secrets — masked placeholders only.
 *
 * DEMO/FIXTURE data — run only under the master demo-data gate.
 *
 * Policy:
 * - Idempotent: ExternalJobQueue gated by (tenantId,jobType); Webhook by
 *   (tenantId,name); PlatformWebhookLog by (tenantId,requestId);
 *   ExternalCalendarAccount upsert(tenantId,userId,provider,providerAccountId).
 * - Tenant-scoped. No schema changes, no destructive operations.
 */

type SeedPrisma = PrismaClient;

type JobSeed = { provider: ExternalJobProvider; jobType: string; entityType: string; payload: Prisma.InputJsonObject };
type CalendarSeed = { provider: ExternalCalendarProvider; label: string; accountSuffix: string };

export type IntegrationsSeedResult = {
  status: 'integrations_seed_complete';
  tenantId: string;
  externalJobs: number;
  webhooks: number;
  webhookDeliveries: number;
  externalCalendarAccounts: number;
};

const WEBHOOK_NAME = 'Client Matter Status Webhook';
const WEBHOOK_URL = 'https://client.example.co.ke/webhooks/matter-status';
const WEBHOOK_EVENT = 'matter.status.changed';

const INTEGRATION_JOBS: JobSeed[] = [
  { provider: ExternalJobProvider.ETIMS, jobType: 'etims.invoice.submit', entityType: 'Invoice', payload: { mode: 'SANDBOX', simulated: true, note: 'eTIMS invoice submission (simulated — AUTH-001 external/blocked)', controlNumber: 'SIM-0000' } },
  { provider: ExternalJobProvider.BANKING, jobType: 'mpesa.stk.callback', entityType: 'PaymentReceipt', payload: { mode: 'SANDBOX', channel: 'MPESA_DARAJA', note: 'M-PESA STK payment notification received (sandbox)', amount: '1000.00' } },
  { provider: ExternalJobProvider.NOTIFICATIONS, jobType: 'sms.send', entityType: 'Notification', payload: { channel: 'AFRICASTALKING', note: "SMS notification sent via Africa's Talking", recipients: 1 } },
];

const CALENDAR_ACCOUNTS: CalendarSeed[] = [
  { provider: ExternalCalendarProvider.MICROSOFT_365, label: 'Microsoft 365', accountSuffix: 'ms365' },
  { provider: ExternalCalendarProvider.GOOGLE, label: 'Google Workspace', accountSuffix: 'google' },
];

async function resolveAdmin(prisma: SeedPrisma, tenantId: string): Promise<{ id: string; email: string | null }> {
  const admin =
    (await prisma.user.findFirst({ where: { tenantId, tenantRole: TenantRole.FIRM_ADMIN }, select: { id: true, email: true } })) ??
    (await prisma.user.findFirst({ where: { tenantId, status: 'ACTIVE' }, select: { id: true, email: true } }));
  if (!admin) {
    throw new Error(`seedIntegrations: no user for tenant ${tenantId}. Run 02_users first.`);
  }
  return admin;
}

export async function seedIntegrations(prisma: PrismaClient, tenantId: string): Promise<IntegrationsSeedResult> {
  if (!tenantId || tenantId.trim().length === 0) {
    throw new Error('seedIntegrations requires a tenantId.');
  }

  const admin = await resolveAdmin(prisma, tenantId);
  const now = new Date();
  const tag = tenantId.slice(-6);

  // 1. Integration activity log (ExternalJobQueue) — eTIMS / M-PESA / SMS, sandbox/simulated.
  for (const job of INTEGRATION_JOBS) {
    const existing = await prisma.externalJobQueue.findFirst({ where: { tenantId, jobType: job.jobType }, select: { id: true } });
    if (!existing) {
      await prisma.externalJobQueue.create({
        data: {
          tenantId,
          provider: job.provider,
          jobType: job.jobType,
          entityType: job.entityType,
          status: ExternalJobStatus.COMPLETED,
          payload: job.payload,
          attempts: 1,
          processedAt: now,
        },
      });
    }
  }

  // 2. Webhook config (outbound: matter status change → client endpoint).
  let webhookId: string;
  const existingWebhook = await prisma.webhook.findFirst({ where: { tenantId, name: WEBHOOK_NAME }, select: { id: true } });
  if (existingWebhook) {
    webhookId = existingWebhook.id;
  } else {
    const created = await prisma.webhook.create({
      data: {
        tenantId,
        name: WEBHOOK_NAME,
        url: WEBHOOK_URL,
        events: [WEBHOOK_EVENT],
        secret: 'whsec-seed-***',
        isActive: true,
        lastDeliveryAt: now,
      },
      select: { id: true },
    });
    webhookId = created.id;
  }

  // 3. Webhook deliveries (PlatformWebhookLog) — 1 success + 1 retry.
  const deliveries = [
    { requestId: `whd-${tag}-1`, status: PlatformWebhookStatus.SUCCEEDED, responseCode: 200, errorMessage: null as string | null },
    { requestId: `whd-${tag}-2`, status: PlatformWebhookStatus.RETRYING, responseCode: 503, errorMessage: 'Endpoint timeout — scheduled for retry' },
  ];
  for (const d of deliveries) {
    const existing = await prisma.platformWebhookLog.findFirst({ where: { tenantId, requestId: d.requestId }, select: { id: true } });
    if (!existing) {
      await prisma.platformWebhookLog.create({
        data: {
          tenantId,
          provider: 'global-wakili',
          eventType: WEBHOOK_EVENT,
          direction: PlatformWebhookDirection.OUTBOUND,
          status: d.status,
          requestId: d.requestId,
          endpoint: WEBHOOK_URL,
          responseCode: d.responseCode,
          signatureVerified: true,
          payload: { event: WEBHOOK_EVENT, webhookId, simulated: true },
          errorMessage: d.errorMessage,
          processedAt: d.status === PlatformWebhookStatus.SUCCEEDED ? now : null,
        },
      });
    }
  }

  // 4. MS365 / Google integration accounts (ExternalCalendarAccount) — CONFIGURED, not ACTIVE.
  for (const cal of CALENDAR_ACCOUNTS) {
    const providerAccountId = `${cal.accountSuffix}-seed-${tag}`;
    await prisma.externalCalendarAccount.upsert({
      where: {
        tenantId_userId_provider_providerAccountId: {
          tenantId,
          userId: admin.id,
          provider: cal.provider,
          providerAccountId,
        },
      },
      update: { status: ExternalCalendarAccountStatus.DISCONNECTED, displayName: cal.label },
      create: {
        tenantId,
        userId: admin.id,
        provider: cal.provider,
        providerAccountId,
        externalEmail: admin.email,
        displayName: cal.label,
        status: ExternalCalendarAccountStatus.DISCONNECTED,
        accessTokenCiphertext: null,
        refreshTokenCiphertext: null,
        metadata: { configured: true, active: false, note: 'CONFIGURED not ACTIVE (TODO-008); no real credentials' },
      },
    });
  }

  // Final counts via queries (idempotent-safe).
  const jobTypes = INTEGRATION_JOBS.map((j) => j.jobType);
  const deliveryIds = deliveries.map((d) => d.requestId);
  const accountIds = CALENDAR_ACCOUNTS.map((c) => `${c.accountSuffix}-seed-${tag}`);
  const [externalJobs, webhooks, webhookDeliveries, externalCalendarAccounts] = await Promise.all([
    prisma.externalJobQueue.count({ where: { tenantId, jobType: { in: jobTypes } } }),
    prisma.webhook.count({ where: { tenantId, name: WEBHOOK_NAME } }),
    prisma.platformWebhookLog.count({ where: { tenantId, requestId: { in: deliveryIds } } }),
    prisma.externalCalendarAccount.count({ where: { tenantId, providerAccountId: { in: accountIds } } }),
  ]);

  return {
    status: 'integrations_seed_complete',
    tenantId,
    externalJobs,
    webhooks,
    webhookDeliveries,
    externalCalendarAccounts,
  };
}
