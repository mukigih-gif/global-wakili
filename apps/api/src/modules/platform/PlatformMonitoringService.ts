// apps/api/src/modules/platform/PlatformMonitoringService.ts

import type { PlatformDbClient } from './platform.types';

function pageParams(page?: number, limit?: number) {
  const safePage = page && page > 0 ? page : 1;
  const safeLimit = limit && limit > 0 ? Math.min(limit, 100) : 50;
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

export class PlatformMonitoringService {
  static async getOverview(db: PlatformDbClient) {
    const [
      tenants,
      activeSubscriptions,
      pastDueSubscriptions,
      openIncidents,
      criticalIncidents,
      pendingBackups,
      failedWebhooks,
      openTickets,
      atRiskTenants,
      queuedJobs,
    ] = await Promise.all([
      db.tenant.count({}),
      db.tenantSubscription.count({ where: { status: 'ACTIVE' } }),
      db.tenantSubscription.count({ where: { status: 'PAST_DUE' } }),
      db.platformIncident.count({ where: { status: { in: ['OPEN', 'INVESTIGATING', 'MONITORING'] } } }),
      db.platformIncident.count({ where: { severity: 'CRITICAL', status: { in: ['OPEN', 'INVESTIGATING', 'MONITORING'] } } }),
      db.platformBackupJob.count({ where: { status: { in: ['PENDING', 'RUNNING'] } } }),
      db.platformWebhookLog.count({ where: { status: { in: ['FAILED', 'RETRYING'] } } }),
      db.platformSupportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'WAITING_ON_INTERNAL'] } } }),
      db.tenantHealthSnapshot.count({ where: { status: { in: ['AT_RISK', 'CRITICAL'] } } }),
      db.externalJobQueue.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      generatedAt: new Date(),
      summary: {
        tenants,
        activeSubscriptions,
        pastDueSubscriptions,
        openIncidents,
        criticalIncidents,
        pendingBackups,
        failedWebhooks,
        openTickets,
        atRiskTenants,
        queuedJobs,
      },
    };
  }

  static async searchWebhookLogs(db: PlatformDbClient, params: any) {
    const { page, limit, skip } = pageParams(params.page, params.limit);
    const where = {
      ...(params.tenantId ? { tenantId: params.tenantId } : {}),
      ...(params.provider ? { provider: params.provider } : {}),
      ...(params.eventType ? { eventType: params.eventType } : {}),
      ...(params.direction ? { direction: params.direction } : {}),
      ...(params.status ? { status: params.status } : {}),
    };

    const [data, total] = await Promise.all([
      db.platformWebhookLog.findMany({ where, orderBy: [{ createdAt: 'desc' }], skip, take: limit }),
      db.platformWebhookLog.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}