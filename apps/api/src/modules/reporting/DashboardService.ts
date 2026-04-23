// apps/api/src/modules/reporting/DashboardService.ts

import type {
  DashboardBlueprint,
  DashboardDefinitionInput,
  DashboardWidgetInput,
  ReportingDbClient,
  ReportingSearchFilters,
} from './reporting.types';

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for dashboard service'), {
      statusCode: 400,
      code: 'DASHBOARD_TENANT_REQUIRED',
    });
  }
}

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid dashboard date'), {
      statusCode: 422,
      code: 'DASHBOARD_DATE_INVALID',
    });
  }

  return parsed;
}

function pageParams(page?: number, limit?: number) {
  const safePage = page && page > 0 ? page : 1;
  const safeLimit = limit && limit > 0 ? Math.min(limit, 100) : 50;

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
}

async function assertDashboardExists(
  db: ReportingDbClient,
  params: {
    tenantId: string;
    dashboardDefinitionId: string;
  },
) {
  const dashboard = await db.dashboardDefinition.findFirst({
    where: {
      id: params.dashboardDefinitionId,
      tenantId: params.tenantId,
    },
    select: { id: true, key: true, name: true },
  });

  if (!dashboard) {
    throw Object.assign(new Error('Dashboard definition not found'), {
      statusCode: 404,
      code: 'DASHBOARD_DEFINITION_NOT_FOUND',
    });
  }

  return dashboard;
}

export class DashboardService {
  static getExecutiveDashboardBlueprints(): DashboardBlueprint[] {
    return [
      {
        key: 'executive.finance-overview',
        name: 'Executive Finance & Payroll Overview',
        roleScope: ['MANAGING_PARTNER', 'FINANCE_MANAGER', 'ACCOUNTANT', 'HR_MANAGER'],
        cache: {
          strategy: 'TENANT_ROLE_SCOPED_REDIS_READY',
          ttlSeconds: 120,
        },
        widgets: [
          {
            key: 'gross-payroll-kpi',
            title: 'Total Gross Payroll',
            widgetType: 'KPI_SPARKLINE',
            dataSource: 'reporting.executive.payroll.gross-total',
            refreshIntervalSec: 60,
            summary: 'Month-over-month payroll movement.',
            config: { trend: 'month_over_month', unit: 'KES' },
          },
          {
            key: 'active-clients-kpi',
            title: 'Total Active Clients',
            widgetType: 'KPI_SPARKLINE',
            dataSource: 'analytics.clients.active',
            refreshIntervalSec: 60,
            summary: 'Tenant-scoped active client count with trend delta.',
            config: { trend: 'month_over_month' },
          },
          {
            key: 'pending-approvals-kpi',
            title: 'Pending Approvals',
            widgetType: 'KPI_SPARKLINE',
            dataSource: 'analytics.approvals.pending',
            refreshIntervalSec: 45,
            summary: 'Open approvals requiring action.',
            config: { trend: 'week_over_week' },
          },
          {
            key: 'payroll-liability-donut',
            title: 'Payroll Liability Breakdown',
            widgetType: 'DONUT',
            dataSource: 'reporting.payroll.liability-breakdown',
            refreshIntervalSec: 300,
            summary: 'Net Pay, PAYE, NSSF, SHA, Housing Levy split.',
            config: {
              segments: ['netPay', 'paye', 'nssf', 'sha', 'housingLevy'],
              unit: 'KES',
            },
          },
          {
            key: 'practice-revenue-pie',
            title: 'Revenue by Practice Area',
            widgetType: 'PIE',
            dataSource: 'reporting.finance.revenue-by-practice-area',
            refreshIntervalSec: 300,
            summary: 'Part-to-whole revenue composition by practice area or department.',
            config: {
              groupBy: 'practiceArea',
              unit: 'KES',
            },
          },
          {
            key: 'overhead-vs-revenue-line',
            title: '12-Month Overhead vs Revenue',
            widgetType: 'LINE',
            dataSource: 'reporting.finance.overhead-vs-revenue-12m',
            refreshIntervalSec: 600,
            summary: 'Time-series view of overhead cost versus firm revenue.',
            config: {
              period: '12m',
              series: ['overheadCost', 'firmRevenue'],
              unit: 'KES',
            },
          },
          {
            key: 'headcount-growth-area',
            title: 'Headcount Growth',
            widgetType: 'AREA',
            dataSource: 'reporting.payroll.headcount-growth-fy',
            refreshIntervalSec: 600,
            summary: 'Headcount growth across the financial year.',
            config: {
              period: 'financial_year',
              series: ['headcount'],
            },
          },
          {
            key: 'hours-bar',
            title: 'Billable vs Non-billable Hours',
            widgetType: 'BAR',
            dataSource: 'reporting.matter.hours-by-associate',
            refreshIntervalSec: 300,
            summary: 'Category comparison across associates.',
            config: {
              series: ['billableHours', 'nonBillableHours'],
            },
          },
          {
            key: 'department-budget-column',
            title: 'Departmental Budget Utilization',
            widgetType: 'COLUMN',
            dataSource: 'reporting.finance.department-budget-utilization',
            refreshIntervalSec: 300,
            summary: 'Budget utilization by department.',
            config: {
              unit: 'KES',
              compareAgainst: 'budget',
            },
          },
        ],
      },
      {
        key: 'executive.compliance-trust',
        name: 'Executive Trust & Compliance Overview',
        roleScope: ['MANAGING_PARTNER', 'COMPLIANCE_OFFICER', 'TRUST_MANAGER'],
        cache: {
          strategy: 'TENANT_ROLE_SCOPED_REDIS_READY',
          ttlSeconds: 180,
        },
        widgets: [
          {
            key: 'trust-unreconciled-kpi',
            title: 'Unreconciled Trust Items',
            widgetType: 'KPI_SPARKLINE',
            dataSource: 'analytics.trust.unreconciled',
            refreshIntervalSec: 60,
            summary: 'Immediate trust exception visibility.',
            config: { trend: 'week_over_week' },
          },
          {
            key: 'high-risk-clients-kpi',
            title: 'High Risk Clients',
            widgetType: 'KPI_SPARKLINE',
            dataSource: 'analytics.clients.high-risk',
            refreshIntervalSec: 60,
            summary: 'High-risk and critical clients.',
            config: { trend: 'month_over_month' },
          },
          {
            key: 'trust-movement-line',
            title: 'Trust Movement Trend',
            widgetType: 'LINE',
            dataSource: 'analytics.trust.movement-trend',
            refreshIntervalSec: 600,
            summary: 'Trust inflow/outflow trend.',
            config: { unit: 'KES' },
          },
          {
            key: 'compliance-case-aging',
            title: 'Compliance Case Aging',
            widgetType: 'BAR',
            dataSource: 'reporting.compliance.case-aging',
            refreshIntervalSec: 300,
            summary: 'Operational backlog view across compliance items.',
            config: { groupBy: 'ageBand' },
          },
        ],
      },
    ];
  }

  static async upsertDashboardDefinition(
    db: ReportingDbClient,
    input: DashboardDefinitionInput,
  ) {
    assertTenant(input.tenantId);

    const existing = await db.dashboardDefinition.findFirst({
      where: {
        tenantId: input.tenantId,
        key: input.key.trim(),
      },
    });

    const blueprint = this.getExecutiveDashboardBlueprints().find(
      (item) => item.key === input.key.trim(),
    );

    const payload = {
      tenantId: input.tenantId,
      key: input.key.trim(),
      name: input.name.trim(),
      description:
        input.description?.trim() ||
        `ERP dashboard definition for ${input.name.trim()}.`,
      visibility: input.visibility ?? 'TENANT',
      isSystem: input.isSystem ?? Boolean(blueprint),
      isActive: input.isActive ?? true,
      layout: input.layout ?? {},
      filters: input.filters ?? {},
      metadata: {
        cachePolicy: blueprint?.cache ?? {
          strategy: 'TENANT_ROLE_SCOPED_REDIS_READY',
          ttlSeconds: 300,
        },
        ...(input.metadata ?? {}),
      },
    };

    if (existing) {
      return db.dashboardDefinition.update({
        where: { id: existing.id },
        data: payload,
      });
    }

    return db.dashboardDefinition.create({
      data: payload,
    });
  }

  static async searchDashboardDefinitions(
    db: ReportingDbClient,
    params: {
      tenantId: string;
      filters?: ReportingSearchFilters | null;
      page?: number;
      limit?: number;
    },
  ) {
    assertTenant(params.tenantId);

    const { page, limit, skip } = pageParams(params.page, params.limit);
    const createdFrom = normalizeDate(params.filters?.createdFrom);
    const createdTo = normalizeDate(params.filters?.createdTo);

    const where = {
      tenantId: params.tenantId,
      ...(params.filters?.key ? { key: params.filters.key } : {}),
      ...(params.filters?.name
        ? {
            OR: [
              { name: { contains: params.filters.name, mode: 'insensitive' } },
              { description: { contains: params.filters.name, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(params.filters?.visibility ? { visibility: params.filters.visibility } : {}),
      ...(typeof params.filters?.isActive === 'boolean'
        ? { isActive: params.filters.isActive }
        : {}),
      ...(createdFrom || createdTo
        ? {
            createdAt: {
              ...(createdFrom ? { gte: createdFrom } : {}),
              ...(createdTo ? { lte: createdTo } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      db.dashboardDefinition.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.dashboardDefinition.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      blueprintCatalog: this.getExecutiveDashboardBlueprints(),
    };
  }

  static async upsertDashboardWidget(
    db: ReportingDbClient,
    input: DashboardWidgetInput,
  ) {
    assertTenant(input.tenantId);
    await assertDashboardExists(db, {
      tenantId: input.tenantId,
      dashboardDefinitionId: input.dashboardDefinitionId,
    });

    const existing = await db.dashboardWidget.findFirst({
      where: {
        tenantId: input.tenantId,
        dashboardDefinitionId: input.dashboardDefinitionId,
        key: input.key.trim(),
      },
    });

    const payload = {
      tenantId: input.tenantId,
      dashboardDefinitionId: input.dashboardDefinitionId,
      key: input.key.trim(),
      title: input.title.trim(),
      widgetType: input.widgetType.trim(),
      dataSource: input.dataSource?.trim() || null,
      config: input.config ?? {},
      position: input.position ?? {},
      visibilityRules: input.visibilityRules ?? {},
      refreshIntervalSec: input.refreshIntervalSec ?? 300,
      isActive: input.isActive ?? true,
      metadata: input.metadata ?? {},
    };

    if (existing) {
      return db.dashboardWidget.update({
        where: { id: existing.id },
        data: payload,
      });
    }

    return db.dashboardWidget.create({
      data: payload,
    });
  }

  static async searchDashboardWidgets(
    db: ReportingDbClient,
    params: {
      tenantId: string;
      filters?: ReportingSearchFilters | null;
      page?: number;
      limit?: number;
    },
  ) {
    assertTenant(params.tenantId);

    const { page, limit, skip } = pageParams(params.page, params.limit);
    const createdFrom = normalizeDate(params.filters?.createdFrom);
    const createdTo = normalizeDate(params.filters?.createdTo);

    const where = {
      tenantId: params.tenantId,
      ...(params.filters?.dashboardDefinitionId
        ? { dashboardDefinitionId: params.filters.dashboardDefinitionId }
        : {}),
      ...(params.filters?.key ? { key: params.filters.key } : {}),
      ...(typeof params.filters?.isActive === 'boolean'
        ? { isActive: params.filters.isActive }
        : {}),
      ...(createdFrom || createdTo
        ? {
            createdAt: {
              ...(createdFrom ? { gte: createdFrom } : {}),
              ...(createdTo ? { lte: createdTo } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      db.dashboardWidget.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.dashboardWidget.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export default DashboardService;