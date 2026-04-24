// apps/api/src/modules/reception/ReceptionDashboardService.ts

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export class ReceptionDashboardService {
  static async getDashboard(
    db: any,
    params: {
      tenantId: string;
      matterId?: string | null;
      from?: Date | string | null;
      to?: Date | string | null;
    },
  ) {
    if (!params.tenantId?.trim()) {
      throw Object.assign(new Error('Tenant ID is required for reception dashboard'), {
        statusCode: 400,
        code: 'RECEPTION_DASHBOARD_TENANT_REQUIRED',
      });
    }

    const from = normalizeDate(params.from);
    const to = normalizeDate(params.to);

    const andClauses: Record<string, unknown>[] = [];

    if (params.matterId) andClauses.push({ matterId: params.matterId });

    if (from || to) {
      andClauses.push({
        timestamp: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
      });
    }

    const baseWhere = {
      tenantId: params.tenantId,
      ...(andClauses.length ? { AND: andClauses } : {}),
    };

    const [
      totalLogs,
      urgentLogs,
      visitorLogs,
      callLogs,
      fileReceiptLogs,
      unplannedLogs,
      recentLogs,
      byType,
      byReceiver,
    ] = await Promise.all([
      db.receptionLog.count({ where: baseWhere }),
      db.receptionLog.count({ where: { ...baseWhere, isUrgent: true } }),
      db.receptionLog.count({ where: { ...baseWhere, type: 'VISITOR' } }),
      db.receptionLog.count({ where: { ...baseWhere, type: 'CALL_LOG' } }),
      db.receptionLog.count({
        where: {
          ...baseWhere,
          OR: [
            { trackingNumber: { not: null } },
            { deliveryMethod: { not: null } },
            { digitalCopyUrl: { not: null } },
          ],
        },
      }),
      db.receptionLog.count({ where: { ...baseWhere, isPlanned: false } }),
      db.receptionLog.findMany({
        where: baseWhere,
        take: 20,
        orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
        include: {
          matter: {
            select: {
              id: true,
              title: true,
              matterCode: true,
            },
          },
          receivedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      db.receptionLog.groupBy
        ? db.receptionLog.groupBy({
            by: ['type'],
            where: baseWhere,
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.receptionLog.groupBy
        ? db.receptionLog.groupBy({
            by: ['receivedById'],
            where: baseWhere,
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10,
          })
        : Promise.resolve([]),
    ]);

    const receiverIds = byReceiver
      .map((item: any) => item.receivedById)
      .filter(Boolean);

    const receivers =
      receiverIds.length && db.user?.findMany
        ? await db.user.findMany({
            where: {
              tenantId: params.tenantId,
              id: { in: receiverIds },
            },
            select: {
              id: true,
              name: true,
              email: true,
            },
          })
        : [];

    const receiverMap = new Map(receivers.map((user: any) => [user.id, user]));

    return {
      tenantId: params.tenantId,
      matterId: params.matterId ?? null,
      generatedAt: new Date(),
      summary: {
        totalLogs,
        urgentLogs,
        visitorLogs,
        callLogs,
        fileReceiptLogs,
        unplannedLogs,
        byType: byType.map((item: any) => ({
          type: item.type,
          count: item._count.id,
        })),
        byReceiver: byReceiver.map((item: any) => ({
          receivedById: item.receivedById,
          receiver: receiverMap.get(item.receivedById) ?? null,
          count: item._count.id,
        })),
      },
      recentLogs,
    };
  }
}

export default ReceptionDashboardService;