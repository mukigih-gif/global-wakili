// apps/api/src/modules/platform/PlatformSubscriptionService.ts

import type { PlatformDbClient } from './platform.types';

function pageParams(page?: number, limit?: number) {
  const safePage = page && page > 0 ? page : 1;
  const safeLimit = limit && limit > 0 ? Math.min(limit, 100) : 50;
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

export class PlatformSubscriptionService {
  static async upsertSubscription(
    db: PlatformDbClient,
    input: any,
  ) {
    const existing = await db.tenantSubscription.findFirst({
      where: { tenantId: input.tenantId, providerSubscriptionRef: input.providerSubscriptionRef ?? undefined },
    });

    const data = {
      tenantId: input.tenantId,
      plan: input.plan,
      status: input.status,
      provider: input.provider ?? null,
      providerCustomerRef: input.providerCustomerRef ?? null,
      providerSubscriptionRef: input.providerSubscriptionRef ?? null,
      currency: input.currency ?? null,
      billingEmail: input.billingEmail ?? null,
      seatLimit: input.seatLimit ?? null,
      seatsAllocated: input.seatsAllocated ?? 0,
      graceEndsAt: input.graceEndsAt ?? null,
      trialEndsAt: input.trialEndsAt ?? null,
      currentPeriodStart: input.currentPeriodStart ?? null,
      currentPeriodEnd: input.currentPeriodEnd ?? null,
      suspendedAt: input.suspendedAt ?? null,
      cancelledAt: input.cancelledAt ?? null,
      metadata: input.metadata ?? {},
    };

    if (existing) {
      return db.tenantSubscription.update({ where: { id: existing.id }, data });
    }

    return db.tenantSubscription.create({ data });
  }

  static async searchSubscriptions(db: PlatformDbClient, params: any) {
    const { page, limit, skip } = pageParams(params.page, params.limit);
    const where = {
      ...(params.tenantId ? { tenantId: params.tenantId } : {}),
      ...(params.plan ? { plan: params.plan } : {}),
      ...(params.status ? { status: params.status } : {}),
    };

    const [data, total] = await Promise.all([
      db.tenantSubscription.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.tenantSubscription.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  static async upsertEntitlement(db: PlatformDbClient, input: any) {
    const existing = await db.tenantModuleEntitlement.findFirst({
      where: { tenantId: input.tenantId, moduleKey: input.moduleKey.trim() },
    });

    const data = {
      tenantId: input.tenantId,
      moduleKey: input.moduleKey.trim(),
      isEnabled: input.isEnabled ?? true,
      planSource: input.planSource ?? null,
      seatLimit: input.seatLimit ?? null,
      usageLimit: input.usageLimit ?? null,
      effectiveAt: input.effectiveAt ?? new Date(),
      expiresAt: input.expiresAt ?? null,
      metadata: input.metadata ?? {},
    };

    if (existing) {
      return db.tenantModuleEntitlement.update({ where: { id: existing.id }, data });
    }

    return db.tenantModuleEntitlement.create({ data });
  }

  static async searchEntitlements(db: PlatformDbClient, params: any) {
    const { page, limit, skip } = pageParams(params.page, params.limit);
    const where = {
      ...(params.tenantId ? { tenantId: params.tenantId } : {}),
      ...(params.moduleKey ? { moduleKey: params.moduleKey } : {}),
      ...(typeof params.isEnabled === 'boolean' ? { isEnabled: params.isEnabled } : {}),
    };

    const [data, total] = await Promise.all([
      db.tenantModuleEntitlement.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.tenantModuleEntitlement.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}