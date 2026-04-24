// apps/api/src/modules/reporting/ReportingRegistryService.ts

import type {
  PrebuiltReportCatalogEntry,
  ReportDefinitionInput,
  ReportDeliveryChannel,
  ReportExportFormat,
  ReportingDbClient,
  ReportingSearchFilters,
  ReportSensitivityLevel,
} from './reporting.types';

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for reporting registry'), {
      statusCode: 400,
      code: 'REPORTING_TENANT_REQUIRED',
    });
  }
}

async function assertTenantExists(
  db: ReportingDbClient,
  tenantId: string,
): Promise<void> {
  const tenant = await db.tenant.findFirst({
    where: { id: tenantId },
    select: { id: true },
  });

  if (!tenant) {
    throw Object.assign(new Error('Tenant not found for reporting module'), {
      statusCode: 404,
      code: 'REPORTING_TENANT_NOT_FOUND',
    });
  }
}

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid reporting date'), {
      statusCode: 422,
      code: 'REPORTING_DATE_INVALID',
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

function supportedFormats(
  base: ReportExportFormat[],
  sensitivity: ReportSensitivityLevel,
): ReportExportFormat[] {
  if (sensitivity === 'HIGHLY_RESTRICTED') {
    return base.filter((item) => item !== 'POWER_BI');
  }
  return base;
}

function deliveryChannels(
  sensitivity: ReportSensitivityLevel,
): ReportDeliveryChannel[] {
  if (sensitivity === 'HIGHLY_RESTRICTED') {
    return ['DOWNLOAD', 'INTERNAL'];
  }

  if (sensitivity === 'PRIVILEGED') {
    return ['DOWNLOAD', 'EMAIL', 'INTERNAL'];
  }

  return ['DOWNLOAD', 'EMAIL', 'WEBHOOK', 'INTERNAL'];
}

function buildDefinitionWhere(tenantId: string, filters?: ReportingSearchFilters | null) {
  const createdFrom = normalizeDate(filters?.createdFrom);
  const createdTo = normalizeDate(filters?.createdTo);

  return {
    tenantId,
    ...(filters?.key ? { key: filters.key } : {}),
    ...(filters?.name
      ? {
          OR: [
            { name: { contains: filters.name, mode: 'insensitive' } },
            { description: { contains: filters.name, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(filters?.type ? { type: filters.type } : {}),
    ...(filters?.sourceLayer ? { sourceLayer: filters.sourceLayer } : {}),
    ...(typeof filters?.isActive === 'boolean' ? { isActive: filters.isActive } : {}),
    ...(createdFrom || createdTo
      ? {
          createdAt: {
            ...(createdFrom ? { gte: createdFrom } : {}),
            ...(createdTo ? { lte: createdTo } : {}),
          },
        }
      : {}),
  };
}

export class ReportingRegistryService {
  static getPrebuiltReportCatalog(): PrebuiltReportCatalogEntry[] {
    const commonFormats: ReportExportFormat[] = ['JSON', 'CSV', 'XLSX', 'PDF'];

    return [
      {
        key: 'finance.executive_summary',
        name: 'Finance Executive Summary',
        category: 'FINANCIAL',
        sourceLayer: 'HYBRID',
        supportedFormats: supportedFormats(commonFormats, 'CONFIDENTIAL'),
        sensitivity: 'CONFIDENTIAL',
        deliveryChannels: deliveryChannels('CONFIDENTIAL'),
        tags: ['finance', 'executive', 'kpi'],
        summary: 'Executive-level overview of revenue, overheads, cash position, and utilization.',
        planFeatures: ['STANDARD_EXPORTS', 'EXECUTIVE_DASHBOARDS'],
      },
      {
        key: 'payroll.liability_breakdown',
        name: 'Payroll Liability Breakdown',
        category: 'FINANCIAL',
        sourceLayer: 'DIRECT_QUERY',
        supportedFormats: supportedFormats(commonFormats, 'HIGHLY_RESTRICTED'),
        sensitivity: 'HIGHLY_RESTRICTED',
        deliveryChannels: deliveryChannels('HIGHLY_RESTRICTED'),
        tags: ['payroll', 'statutory', 'liability'],
        summary:
          'Breakdown of gross payroll into net pay, PAYE, NSSF, SHA, Housing Levy, and related liabilities.',
        planFeatures: ['STANDARD_EXPORTS', 'EXECUTIVE_DASHBOARDS'],
      },
      {
        key: 'payroll.variance_report',
        name: 'Payroll Variance Report',
        category: 'FINANCIAL',
        sourceLayer: 'HYBRID',
        supportedFormats: supportedFormats(commonFormats, 'HIGHLY_RESTRICTED'),
        sensitivity: 'HIGHLY_RESTRICTED',
        deliveryChannels: deliveryChannels('HIGHLY_RESTRICTED'),
        tags: ['payroll', 'variance', 'audit'],
        summary:
          'Employee-level month-over-month payroll variance including increments, payouts, allowances, and deductions.',
        planFeatures: ['STANDARD_EXPORTS'],
      },
      {
        key: 'payroll.p9',
        name: 'Payroll P9',
        category: 'FINANCIAL',
        sourceLayer: 'DIRECT_QUERY',
        supportedFormats: supportedFormats(['XLSX', 'PDF', 'CSV'], 'HIGHLY_RESTRICTED'),
        sensitivity: 'HIGHLY_RESTRICTED',
        deliveryChannels: deliveryChannels('HIGHLY_RESTRICTED'),
        tags: ['payroll', 'p9', 'kra'],
        summary: 'P9 payroll tax statement output for statutory payroll compliance.',
        planFeatures: ['STANDARD_EXPORTS'],
      },
      {
        key: 'payroll.p10',
        name: 'Payroll P10',
        category: 'FINANCIAL',
        sourceLayer: 'DIRECT_QUERY',
        supportedFormats: supportedFormats(['XLSX', 'PDF', 'CSV'], 'HIGHLY_RESTRICTED'),
        sensitivity: 'HIGHLY_RESTRICTED',
        deliveryChannels: deliveryChannels('HIGHLY_RESTRICTED'),
        tags: ['payroll', 'p10', 'kra'],
        summary: 'P10 payroll output for statutory compliance workflows.',
        planFeatures: ['STANDARD_EXPORTS'],
      },
      {
        key: 'payroll.itax_csv',
        name: 'Payroll iTax-ready CSV',
        category: 'FINANCIAL',
        sourceLayer: 'DIRECT_QUERY',
        supportedFormats: supportedFormats(['CSV'], 'HIGHLY_RESTRICTED'),
        sensitivity: 'HIGHLY_RESTRICTED',
        deliveryChannels: deliveryChannels('HIGHLY_RESTRICTED'),
        tags: ['payroll', 'itax', 'csv'],
        summary: 'Structured payroll CSV export aligned for iTax ingestion workflows.',
        planFeatures: ['STANDARD_EXPORTS'],
      },
      {
        key: 'payroll.nssf_workbook',
        name: 'NSSF Payroll Workbook',
        category: 'FINANCIAL',
        sourceLayer: 'DIRECT_QUERY',
        supportedFormats: supportedFormats(['XLSX', 'CSV'], 'HIGHLY_RESTRICTED'),
        sensitivity: 'HIGHLY_RESTRICTED',
        deliveryChannels: deliveryChannels('HIGHLY_RESTRICTED'),
        tags: ['payroll', 'nssf', 'xlsx'],
        summary: 'Formatted NSSF payroll workbook for statutory filing support.',
        planFeatures: ['STANDARD_EXPORTS'],
      },
      {
        key: 'payroll.sha_workbook',
        name: 'SHA Payroll Workbook',
        category: 'FINANCIAL',
        sourceLayer: 'DIRECT_QUERY',
        supportedFormats: supportedFormats(['XLSX', 'CSV'], 'HIGHLY_RESTRICTED'),
        sensitivity: 'HIGHLY_RESTRICTED',
        deliveryChannels: deliveryChannels('HIGHLY_RESTRICTED'),
        tags: ['payroll', 'sha', 'xlsx'],
        summary: 'Formatted SHA payroll workbook for statutory filing support.',
        planFeatures: ['STANDARD_EXPORTS'],
      },
      {
        key: 'finance.weekly_cash_flow_summary',
        name: 'Weekly Cash Flow Summary',
        category: 'FINANCIAL',
        sourceLayer: 'HYBRID',
        supportedFormats: supportedFormats(commonFormats, 'CONFIDENTIAL'),
        sensitivity: 'CONFIDENTIAL',
        deliveryChannels: deliveryChannels('CONFIDENTIAL'),
        tags: ['finance', 'cashflow', 'weekly'],
        summary: 'Weekly firm cash flow summary designed for partner circulation and board-level review.',
        planFeatures: ['STANDARD_EXPORTS', 'ADVANCED_SCHEDULING'],
      },
      {
        key: 'trust.client_trial_balance',
        name: 'Client Trust Trial Balance',
        category: 'TRUST',
        sourceLayer: 'HYBRID',
        supportedFormats: supportedFormats(commonFormats, 'HIGHLY_RESTRICTED'),
        sensitivity: 'HIGHLY_RESTRICTED',
        deliveryChannels: deliveryChannels('HIGHLY_RESTRICTED'),
        tags: ['trust', 'client-ledger', 'trial-balance'],
        summary: 'Trust trial balance by client or matter, designed for strict client money governance.',
        planFeatures: ['STANDARD_EXPORTS'],
      },
      {
        key: 'matter.case_aging_summary',
        name: 'Case Aging Summary',
        category: 'OPERATIONAL',
        sourceLayer: 'HYBRID',
        supportedFormats: supportedFormats(commonFormats, 'CONFIDENTIAL'),
        sensitivity: 'CONFIDENTIAL',
        deliveryChannels: deliveryChannels('CONFIDENTIAL'),
        tags: ['matter', 'aging', 'operations'],
        summary: 'Aging summary across matters and case timelines for operational management.',
        planFeatures: ['STANDARD_EXPORTS'],
      },
      {
        key: 'billing.unbilled_time',
        name: 'Unbilled Time Report',
        category: 'OPERATIONAL',
        sourceLayer: 'HYBRID',
        supportedFormats: supportedFormats(commonFormats, 'CONFIDENTIAL'),
        sensitivity: 'CONFIDENTIAL',
        deliveryChannels: deliveryChannels('CONFIDENTIAL'),
        tags: ['billing', 'time', 'utilization'],
        summary: 'Unbilled time summary for fee capture, realization review, and billing discipline.',
        planFeatures: ['STANDARD_EXPORTS'],
      },
      {
        key: 'compliance.aml_case_summary',
        name: 'AML / Compliance Case Summary',
        category: 'COMPLIANCE',
        sourceLayer: 'HYBRID',
        supportedFormats: supportedFormats(commonFormats, 'HIGHLY_RESTRICTED'),
        sensitivity: 'HIGHLY_RESTRICTED',
        deliveryChannels: deliveryChannels('HIGHLY_RESTRICTED'),
        tags: ['compliance', 'aml', 'case'],
        summary: 'Governed compliance reporting surface for AML review and regulatory monitoring.',
        planFeatures: ['STANDARD_EXPORTS'],
      },
      {
        key: 'operations.pending_approvals',
        name: 'Pending Approvals Summary',
        category: 'APPROVAL',
        sourceLayer: 'ANALYTICS',
        supportedFormats: supportedFormats(commonFormats, 'CONFIDENTIAL'),
        sensitivity: 'CONFIDENTIAL',
        deliveryChannels: deliveryChannels('CONFIDENTIAL'),
        tags: ['approval', 'operations', 'queue'],
        summary: 'Pending approval backlog and escalation posture across workflow-heavy modules.',
        planFeatures: ['STANDARD_EXPORTS', 'EXECUTIVE_DASHBOARDS'],
      },
    ];
  }

  static async upsertReportDefinition(
    db: ReportingDbClient,
    input: ReportDefinitionInput,
  ) {
    assertTenant(input.tenantId);
    await assertTenantExists(db, input.tenantId);

    const existing = await db.reportDefinition.findFirst({
      where: {
        tenantId: input.tenantId,
        key: input.key.trim(),
      },
    });

    const seeded = this.getPrebuiltReportCatalog().find(
      (item) => item.key === input.key.trim(),
    );

    const payload = {
      tenantId: input.tenantId,
      key: input.key.trim(),
      name: input.name.trim(),
      description: input.description?.trim() || seeded?.summary || null,
      type: input.type ?? seeded?.category ?? 'OPERATIONAL',
      sourceLayer: input.sourceLayer ?? seeded?.sourceLayer ?? 'HYBRID',
      defaultFormat: input.defaultFormat ?? seeded?.supportedFormats[0] ?? 'JSON',
      isSystem: input.isSystem ?? Boolean(seeded),
      isActive: input.isActive ?? true,
      config: input.config ?? {},
      filterSchema: input.filterSchema ?? {},
      columnSchema: input.columnSchema ?? {},
      tags: input.tags ?? seeded?.tags ?? [],
      metadata: {
        sensitivity: seeded?.sensitivity ?? 'STANDARD',
        supportedFormats: seeded?.supportedFormats ?? ['JSON'],
        deliveryChannels: seeded?.deliveryChannels ?? ['DOWNLOAD'],
        planFeatures: seeded?.planFeatures ?? ['STANDARD_EXPORTS'],
        ...(input.metadata ?? {}),
      },
    };

    if (existing) {
      return db.reportDefinition.update({
        where: { id: existing.id },
        data: payload,
      });
    }

    return db.reportDefinition.create({
      data: payload,
    });
  }

  static async searchReportDefinitions(
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
    const where = buildDefinitionWhere(params.tenantId, params.filters);

    const [data, total] = await Promise.all([
      db.reportDefinition.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.reportDefinition.count({ where }),
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

  static async getOverview(
    db: ReportingDbClient,
    params: {
      tenantId: string;
    },
  ) {
    assertTenant(params.tenantId);

    const [
      reportDefinitions,
      reportRuns,
      reportExports,
      dashboardDefinitions,
      dashboardWidgets,
      scheduledReports,
      biConnectorConfigs,
      definitionsByType,
      runsByStatus,
      exportsByFormat,
    ] = await Promise.all([
      db.reportDefinition.count({ where: { tenantId: params.tenantId } }),
      db.reportRun.count({ where: { tenantId: params.tenantId } }),
      db.reportExport.count({ where: { tenantId: params.tenantId } }),
      db.dashboardDefinition.count({ where: { tenantId: params.tenantId } }),
      db.dashboardWidget.count({ where: { tenantId: params.tenantId } }),
      db.scheduledReport.count({ where: { tenantId: params.tenantId } }),
      db.bIConnectorConfig.count({ where: { tenantId: params.tenantId } }),
      db.reportDefinition.groupBy
        ? db.reportDefinition.groupBy({
            by: ['type'],
            where: { tenantId: params.tenantId },
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.reportRun.groupBy
        ? db.reportRun.groupBy({
            by: ['status'],
            where: { tenantId: params.tenantId },
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.reportExport.groupBy
        ? db.reportExport.groupBy({
            by: ['format'],
            where: { tenantId: params.tenantId },
            _count: { id: true },
          })
        : Promise.resolve([]),
    ]);

    return {
      tenantId: params.tenantId,
      generatedAt: new Date(),
      summary: {
        reportDefinitions,
        reportRuns,
        reportExports,
        dashboardDefinitions,
        dashboardWidgets,
        scheduledReports,
        biConnectorConfigs,
        definitionsByType: (definitionsByType as any[]).map((item) => ({
          type: item.type,
          count: item._count.id,
        })),
        runsByStatus: (runsByStatus as any[]).map((item) => ({
          status: item.status,
          count: item._count.id,
        })),
        exportsByFormat: (exportsByFormat as any[]).map((item) => ({
          format: item.format,
          count: item._count.id,
        })),
      },
      prebuiltReportCatalog: this.getPrebuiltReportCatalog(),
      recommendedSubscriptions: [
        {
          key: 'finance.weekly_cash_flow_summary',
          schedule: 'Every Monday at 08:00',
          deliveryChannel: 'EMAIL',
          note: 'Partner-facing finance summary.',
        },
      ],
    };
  }
}

export default ReportingRegistryService;