// apps/api/src/modules/platform/PlatformBillingWebhookService.ts

import type { PlatformDbClient } from './platform.types';
import { PlatformSubscriptionService } from './PlatformSubscriptionService';
import { PlatformTenantLifecycleService } from './PlatformTenantLifecycleService';

function deriveSubscriptionStatus(providerStatus?: string | null, eventType?: string | null) {
  const normalizedStatus = String(providerStatus ?? '').toUpperCase();
  const normalizedEvent = String(eventType ?? '').toLowerCase();

  if (normalizedEvent.includes('payment_failed') || normalizedStatus === 'PAST_DUE') {
    return 'PAST_DUE';
  }

  if (normalizedEvent.includes('subscription.deleted') || normalizedStatus === 'CANCELLED') {
    return 'CANCELLED';
  }

  if (normalizedEvent.includes('suspended') || normalizedStatus === 'SUSPENDED') {
    return 'SUSPENDED';
  }

  if (normalizedEvent.includes('trial') || normalizedStatus === 'TRIAL') {
    return 'TRIAL';
  }

  return 'ACTIVE';
}

function deriveLifecycle(subscriptionStatus: string) {
  switch (subscriptionStatus) {
    case 'PAST_DUE':
      return { lifecycleStatus: 'READ_ONLY', readOnlyMode: true, suspensionReason: 'Subscription is past due.' };
    case 'SUSPENDED':
      return { lifecycleStatus: 'SUSPENDED', readOnlyMode: true, suspensionReason: 'Subscription is suspended.' };
    case 'CANCELLED':
    case 'EXPIRED':
      return { lifecycleStatus: 'SUSPENDED', readOnlyMode: true, suspensionReason: 'Subscription is inactive.' };
    default:
      return { lifecycleStatus: 'ACTIVE', readOnlyMode: false, suspensionReason: null };
  }
}

export class PlatformBillingWebhookService {
  static async processWebhook(
    db: PlatformDbClient,
    input: {
      tenantId: string;
      provider: string;
      eventType: string;
      providerStatus?: string | null;
      providerCustomerRef?: string | null;
      providerSubscriptionRef?: string | null;
      plan?: string | null;
      currency?: string | null;
      billingEmail?: string | null;
      payload?: Record<string, unknown> | null;
      signatureVerified?: boolean;
      responseCode?: number | null;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    const tenant = await db.tenant.findFirst({
      where: { id: input.tenantId },
    });

    if (!tenant) {
      throw Object.assign(new Error('Tenant not found for billing webhook'), {
        statusCode: 404,
        code: 'TENANT_NOT_FOUND',
      });
    }

    const log = await db.platformWebhookLog.create({
      data: {
        tenantId: input.tenantId,
        provider: input.provider,
        eventType: input.eventType,
        direction: 'INBOUND',
        status: 'PENDING',
        signatureVerified: input.signatureVerified ?? false,
        payload: input.payload ?? {},
        responseCode: input.responseCode ?? null,
        receivedAt: new Date(),
        metadata: input.metadata ?? {},
      },
    });

    const subscriptionStatus = deriveSubscriptionStatus(input.providerStatus, input.eventType);

    const subscription = await PlatformSubscriptionService.upsertSubscription(db, {
      tenantId: input.tenantId,
      plan: input.plan ?? 'BASIC',
      status: subscriptionStatus,
      provider: input.provider,
      providerCustomerRef: input.providerCustomerRef ?? null,
      providerSubscriptionRef: input.providerSubscriptionRef ?? null,
      currency: input.currency ?? null,
      billingEmail: input.billingEmail ?? null,
      metadata: {
        lastWebhookEventType: input.eventType,
        providerStatus: input.providerStatus ?? null,
      },
    });

    const lifecycle = deriveLifecycle(subscriptionStatus);

    const tenantProfile = await PlatformTenantLifecycleService.upsertTenantProfile(db, {
      tenantId: input.tenantId,
      lifecycleStatus: lifecycle.lifecycleStatus,
      readOnlyMode: lifecycle.readOnlyMode,
      suspensionReason: lifecycle.suspensionReason,
      suspendedAt:
        lifecycle.lifecycleStatus === 'SUSPENDED' || lifecycle.lifecycleStatus === 'READ_ONLY'
          ? new Date()
          : null,
      activatedAt: lifecycle.lifecycleStatus === 'ACTIVE' ? new Date() : null,
      metadata: {
        billingWebhookDriven: true,
        lastWebhookEventType: input.eventType,
      },
    });

    await db.platformWebhookLog.update({
      where: { id: log.id },
      data: {
        status: 'SUCCEEDED',
        processedAt: new Date(),
        metadata: {
          subscriptionId: subscription.id,
          tenantProfileId: tenantProfile.id,
          ...(input.metadata ?? {}),
        },
      },
    });

    return {
      webhookLogId: log.id,
      subscription,
      tenantProfile,
    };
  }
}

export default PlatformBillingWebhookService;