// apps/api/src/modules/compliance/ComplianceDashboardService.ts

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export class ComplianceDashboardService {
  static async getDashboard(
    db: any,
    params: {
      tenantId: string;
      from?: Date | string | null;
      to?: Date | string | null;
    },
  ) {
    if (!params.tenantId?.trim()) {
      throw Object.assign(new Error('Tenant ID is required for compliance dashboard'), {
        statusCode: 400,
        code: 'COMPLIANCE_DASHBOARD_TENANT_REQUIRED',
      });
    }

    const from = normalizeDate(params.from);
    const to = normalizeDate(params.to);

    const checkAnd: Record<string, unknown>[] = [];
    const reportAnd: Record<string, unknown>[] = [];

    if (from || to) {
      checkAnd.push({
        checkedAt: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
      });

      reportAnd.push({
        createdAt: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
      });
    }

    const checkWhere = {
      tenantId: params.tenantId,
      ...(checkAnd.length ? { AND: checkAnd } : {}),
    };

    const reportWhere = {
      tenantId: params.tenantId,
      ...(reportAnd.length ? { AND: reportAnd } : {}),
    };

    const [
      totalClients,
      highRiskClients,
      criticalRiskClients,
      eddClients,
      pendingKycClients,
      matchedPepClients,
      matchedSanctionsClients,
      totalChecks,
      totalReports,
      pendingReports,
      submittedReports,
      rejectedReports,
      recentChecks,
      recentReports,
      checksByType,
      reportsByType,
      reportsByStatus,
    ] = await Promise.all([
      db.client.count({ where: { tenantId: params.tenantId } }),
      db.client.count({ where: { tenantId: params.tenantId, riskBand: 'HIGH' } }),
      db.client.count({ where: { tenantId: params.tenantId, riskBand: 'CRITICAL' } }),
      db.client.count({
        where: {
          tenantId: params.tenantId,
          needsEnhancedDueDiligence: true,
        },
      }),
      db.client.count({ where: { tenantId: params.tenantId, kycStatus: 'PENDING' } }),
      db.client.count({ where: { tenantId: params.tenantId, pepStatus: 'MATCHED' } }),
      db.client.count({ where: { tenantId: params.tenantId, sanctionsStatus: 'MATCHED' } }),
      db.clientComplianceCheck.count({ where: checkWhere }),
      db.complianceReport.count({ where: reportWhere }),
      db.complianceReport.count({
        where: {
          ...reportWhere,
          status: 'PENDING_REVIEW',
        },
      }),
      db.complianceReport.count({
        where: {
          ...reportWhere,
          status: 'SUBMITTED',
        },
      }),
      db.complianceReport.count({
        where: {
          ...reportWhere,
          status: 'REJECTED',
        },
      }),
      db.clientComplianceCheck.findMany({
        where: checkWhere,
        orderBy: [{ checkedAt: 'desc' }, { id: 'desc' }],
        take: 20,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              clientCode: true,
              riskBand: true,
            },
          },
        },
      }),
      db.complianceReport.findMany({
        where: reportWhere,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 20,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              clientCode: true,
              riskBand: true,
            },
          },
        },
      }),
      db.clientComplianceCheck.groupBy
        ? db.clientComplianceCheck.groupBy({
            by: ['checkType'],
            where: checkWhere,
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.complianceReport.groupBy
        ? db.complianceReport.groupBy({
            by: ['reportType'],
            where: reportWhere,
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.complianceReport.groupBy
        ? db.complianceReport.groupBy({
            by: ['status'],
            where: reportWhere,
            _count: { id: true },
          })
        : Promise.resolve([]),
    ]);

    return {
      tenantId: params.tenantId,
      generatedAt: new Date(),
      summary: {
        totalClients,
        highRiskClients,
        criticalRiskClients,
        eddClients,
        pendingKycClients,
        matchedPepClients,
        matchedSanctionsClients,
        totalChecks,
        totalReports,
        pendingReports,
        submittedReports,
        rejectedReports,
        checksByType: checksByType.map((item: any) => ({
          checkType: item.checkType,
          count: item._count.id,
        })),
        reportsByType: reportsByType.map((item: any) => ({
          reportType: item.reportType,
          count: item._count.id,
        })),
        reportsByStatus: reportsByStatus.map((item: any) => ({
          status: item.status,
          count: item._count.id,
        })),
      },
      recentChecks,
      recentReports,
    };
  }
}

export default ComplianceDashboardService;