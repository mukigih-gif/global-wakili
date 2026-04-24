// apps/api/src/modules/platform/PlatformHealthScoringService.ts

import type { PlatformDbClient } from './platform.types';
import { PlatformHealthService } from './PlatformHealthService';

function healthBand(score: number) {
  if (score >= 85) return 'HEALTHY';
  if (score >= 65) return 'DEGRADED';
  if (score >= 40) return 'AT_RISK';
  return 'CRITICAL';
}

export class PlatformHealthScoringService {
  static async recomputeTenantHealth(
    db: PlatformDbClient,
    params: {
      tenantId: string;
    },
  ) {
    const [profile, subscription, usageMetrics, quotaPolicies, incidents, webhooks, queuedJobs] =
      await Promise.all([
        db.platformTenantProfile.findFirst({
          where: { tenantId: params.tenantId },
          orderBy: [{ updatedAt: 'desc' }],
        }),
        db.tenantSubscription.findFirst({
          where: { tenantId: params.tenantId },
          orderBy: [{ updatedAt: 'desc' }],
        }),
        db.tenantUsageMetric.findMany({
          where: { tenantId: params.tenantId },
          take: 50,
          orderBy: [{ updatedAt: 'desc' }],
        }),
        db.tenantQuotaPolicy.findMany({
          where: { tenantId: params.tenantId },
        }),
        db.platformIncident.findMany({
          where: {
            targetTenantId: params.tenantId,
            status: { in: ['OPEN', 'INVESTIGATING', 'MONITORING'] },
          },
          take: 50,
        }),
        db.platformWebhookLog.findMany({
          where: {
            tenantId: params.tenantId,
            status: { in: ['FAILED', 'RETRYING'] },
          },
          take: 50,
        }),
        db.externalJobQueue.findMany({
          where: {
            tenantId: params.tenantId,
            status: { in: ['PENDING', 'FAILED'] },
          },
          take: 100,
        }),
      ]);

    let score = 100;

    if (profile?.lifecycleStatus === 'READ_ONLY') score -= 20;
    if (profile?.lifecycleStatus === 'SUSPENDED') score -= 40;
    if (subscription?.status === 'PAST_DUE') score -= 20;
    if (subscription?.status === 'SUSPENDED') score -= 35;

    const criticalIncidents = incidents.filter((item: any) => item.severity === 'CRITICAL').length;
    const highIncidents = incidents.filter((item: any) => item.severity === 'HIGH').length;
    score -= criticalIncidents * 20;
    score -= highIncidents * 10;

    const failedWebhookCount = webhooks.length;
    if (failedWebhookCount > 5) score -= 10;

    const queueBacklog = queuedJobs.length;
    if (queueBacklog > 25) score -= 10;

    let storageUsagePercent: number | null = null;
    for (const metric of usageMetrics) {
      const quota = quotaPolicies.find((item: any) => item.metricType === metric.metricType);
      if (!quota?.softLimit) continue;

      const currentValue = Number(metric.currentValue ?? 0);
      const softLimit = Number(quota.softLimit ?? 0);
      if (softLimit <= 0) continue;

      const usagePercent = (currentValue / softLimit) * 100;
      if (metric.metricType === 'FILE_STORAGE') {
        storageUsagePercent = usagePercent;
      }

      if (usagePercent >= 120) score -= 20;
      else if (usagePercent >= 100) score -= 10;
      else if (usagePercent >= 80) score -= 5;
    }

    score = Math.max(0, Math.min(100, score));

    return PlatformHealthService.upsertTenantHealth(db, {
      tenantId: params.tenantId,
      status: healthBand(score),
      healthScore: score,
      queueBacklog,
      failedWebhookCount,
      storageUsagePercent,
      rateLimitEvents: 0,
      apiErrorRate: null,
      lastEvaluatedAt: new Date(),
      metadata: {
        criticalIncidents,
        highIncidents,
        failedWebhookCount,
        queueBacklog,
      },
    });
  }

  static async recomputeAllTenantHealth(db: PlatformDbClient) {
    const tenants = await db.tenant.findMany({
      select: { id: true },
      take: 500,
    });

    const results = [];
    for (const tenant of tenants) {
      const snapshot = await this.recomputeTenantHealth(db, {
        tenantId: tenant.id,
      });
      results.push(snapshot);
    }

    return {
      evaluated: results.length,
      results,
    };
  }
}

export default PlatformHealthScoringService;