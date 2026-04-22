// apps/api/src/modules/queues/QueueDashboardService.ts

import { QueueReportService } from './QueueReportService';

export class QueueDashboardService {
  static async getDashboard(
    db: any,
    params: {
      tenantId?: string | null;
      provider?: string | null;
      from?: Date | string | null;
      to?: Date | string | null;
    },
  ) {
    const summary = await QueueReportService.getSummary(db, params);

    const recentJobs = await db.externalJobQueue.findMany({
      where: {
        ...(params.tenantId ? { tenantId: params.tenantId } : {}),
        ...(params.provider ? { provider: params.provider } : {}),
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 25,
    });

    return {
      ...summary,
      recentJobs,
    };
  }
}

export default QueueDashboardService;