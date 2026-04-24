// apps/api/src/modules/notifications/NotificationDashboardService.ts

import { NotificationReportService } from './NotificationReportService';

export class NotificationDashboardService {
  static async getDashboard(
    db: any,
    params: {
      tenantId: string;
      from?: Date | string | null;
      to?: Date | string | null;
    },
  ) {
    const summary = await NotificationReportService.getSummary(db, params);

    const recentNotifications = await db.notification.findMany({
      where: {
        tenantId: params.tenantId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 25,
    });

    const pendingRetries = await db.notification.findMany({
      where: {
        tenantId: params.tenantId,
        status: 'FAILED',
        nextRetryAt: {
          not: null,
        },
      },
      orderBy: [{ nextRetryAt: 'asc' }],
      take: 25,
    });

    return {
      ...summary,
      recentNotifications,
      pendingRetries,
    };
  }
}

export default NotificationDashboardService;