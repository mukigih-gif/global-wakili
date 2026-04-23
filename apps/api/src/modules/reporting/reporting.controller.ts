// apps/api/src/modules/reporting/reporting.controller.ts

import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { BIConnectorService } from './BIConnectorService';
import { DashboardService } from './DashboardService';
import { ExportService } from './ExportService';
import { ReportRunService } from './ReportRunService';
import { ReportingAuditService } from './ReportingAuditService';
import { ReportingCapabilityService } from './ReportingCapabilityService';
import { ReportingRegistryService } from './ReportingRegistryService';
import { ScheduleService } from './ScheduleService';

function requireTenantId(req: Request): string {
  if (!req.tenantId?.trim()) {
    throw Object.assign(new Error('Tenant context is required for reporting module'), {
      statusCode: 400,
      code: 'REPORTING_TENANT_CONTEXT_REQUIRED',
    });
  }

  return req.tenantId;
}

async function logAction(
  req: Request,
  action: Parameters<typeof ReportingAuditService.logAction>[1]['action'],
  params?: {
    entityId?: string | null;
    entityType?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  await ReportingAuditService.logAction(req.db, {
    tenantId: requireTenantId(req),
    userId: req.user?.sub ?? null,
    action,
    entityId: params?.entityId ?? null,
    entityType: params?.entityType ?? 'REPORTING',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    metadata: params?.metadata ?? {},
  });
}

export const getReportingHealth = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'reporting',
    status: 'mounted',
    service: 'global-wakili-api',
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

export const getReportingOverview = asyncHandler(async (req: Request, res: Response) => {
  const result = await ReportingRegistryService.getOverview(req.db, {
    tenantId: requireTenantId(req),
  });

  await logAction(req, 'OVERVIEW_VIEWED', {
    metadata: {
      reportDefinitions: result.summary.reportDefinitions,
      reportRuns: result.summary.reportRuns,
      reportExports: result.summary.reportExports,
      dashboardDefinitions: result.summary.dashboardDefinitions,
      scheduledReports: result.summary.scheduledReports,
    },
  });

  res.status(200).json(result);
});

export const getReportingCapabilities = asyncHandler(
  async (req: Request, res: Response) => {
    const result = ReportingCapabilityService.getSummary();

    await logAction(req, 'CAPABILITY_VIEWED', {
      metadata: {
        active: result.active,
        pendingLegacyAbsorption: result.pendingLegacyAbsorption,
        pendingExportPipeline: result.pendingExportPipeline,
        pendingBIDelivery: result.pendingBIDelivery,
      },
    });

    res.status(200).json(result);
  },
);

export const getReportingCatalog = asyncHandler(async (req: Request, res: Response) => {
  const catalog = ReportingRegistryService.getPrebuiltReportCatalog();
  const dashboards = DashboardService.getExecutiveDashboardBlueprints();

  await logAction(req, 'CATALOG_VIEWED', {
    metadata: {
      reportCatalogCount: catalog.length,
      dashboardBlueprintCount: dashboards.length,
    },
  });

  res.status(200).json({
    generatedAt: new Date(),
    reportCatalog: catalog,
    dashboardBlueprints: dashboards,
  });
});

export const upsertReportDefinition = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await ReportingRegistryService.upsertReportDefinition(req.db, {
      tenantId: requireTenantId(req),
      key: req.body.key,
      name: req.body.name,
      description: req.body.description,
      type: req.body.type,
      sourceLayer: req.body.sourceLayer,
      defaultFormat: req.body.defaultFormat,
      isSystem: req.body.isSystem,
      isActive: req.body.isActive,
      config: req.body.config,
      filterSchema: req.body.filterSchema,
      columnSchema: req.body.columnSchema,
      tags: req.body.tags,
      metadata: req.body.metadata,
    });

    await logAction(req, 'REPORT_DEFINITION_UPSERTED', {
      entityId: result.id,
      entityType: 'REPORT_DEFINITION',
      metadata: {
        key: result.key,
        type: result.type,
        sourceLayer: result.sourceLayer,
      },
    });

    res.status(200).json(result);
  },
);

export const searchReportDefinitions = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await ReportingRegistryService.searchReportDefinitions(req.db, {
      tenantId: requireTenantId(req),
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      filters: {
        key: req.query.key ? String(req.query.key) : null,
        name: req.query.name ? String(req.query.name) : null,
        type: req.query.type ? (String(req.query.type) as any) : null,
        sourceLayer: req.query.sourceLayer
          ? (String(req.query.sourceLayer) as any)
          : null,
        isActive:
          typeof req.query.isActive !== 'undefined'
            ? String(req.query.isActive) === 'true'
            : null,
        createdFrom: req.query.createdFrom ? String(req.query.createdFrom) : null,
        createdTo: req.query.createdTo ? String(req.query.createdTo) : null,
      },
    });

    await logAction(req, 'REPORT_DEFINITIONS_SEARCHED', {
      metadata: {
        total: result.meta.total,
      },
    });

    res.status(200).json(result);
  },
);

export const createReportRun = asyncHandler(async (req: Request, res: Response) => {
  const result = await ReportRunService.createRun(req.db, {
    tenantId: requireTenantId(req),
    reportDefinitionId: req.body.reportDefinitionId,
    triggeredByUserId: req.body.triggeredByUserId ?? req.user?.sub ?? null,
    sourceLayer: req.body.sourceLayer,
    parameters: req.body.parameters,
    snapshotRefType: req.body.snapshotRefType,
    snapshotRefId: req.body.snapshotRefId,
    metadata: req.body.metadata,
  });

  await logAction(req, 'REPORT_RUN_CREATED', {
    entityId: result.id,
    entityType: 'REPORT_RUN',
    metadata: {
      reportDefinitionId: result.reportDefinitionId,
      status: result.status,
      sourceLayer: result.sourceLayer,
      parameters: req.body.parameters ?? {},
    },
  });

  res.status(201).json(result);
});

export const searchReportRuns = asyncHandler(async (req: Request, res: Response) => {
  const result = await ReportRunService.searchRuns(req.db, {
    tenantId: requireTenantId(req),
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    filters: {
      reportDefinitionId: req.query.reportDefinitionId
        ? String(req.query.reportDefinitionId)
        : null,
      status: req.query.status ? (String(req.query.status) as any) : null,
      sourceLayer: req.query.sourceLayer
        ? (String(req.query.sourceLayer) as any)
        : null,
      createdFrom: req.query.createdFrom ? String(req.query.createdFrom) : null,
      createdTo: req.query.createdTo ? String(req.query.createdTo) : null,
    },
  });

  await logAction(req, 'REPORT_RUNS_SEARCHED', {
    metadata: {
      total: result.meta.total,
    },
  });

  res.status(200).json(result);
});

export const createReportExport = asyncHandler(async (req: Request, res: Response) => {
  const result = await ExportService.createExport(req.db, {
    tenantId: requireTenantId(req),
    reportDefinitionId: req.body.reportDefinitionId,
    reportRunId: req.body.reportRunId,
    format: req.body.format,
    deliveryChannel: req.body.deliveryChannel,
    fileName: req.body.fileName,
    mimeType: req.body.mimeType,
    expiresAt: req.body.expiresAt,
    metadata: req.body.metadata,
  });

  await logAction(req, 'REPORT_EXPORT_CREATED', {
    entityId: result.id,
    entityType: 'REPORT_EXPORT',
    metadata: {
      reportDefinitionId: result.reportDefinitionId,
      reportRunId: result.reportRunId,
      format: result.format,
      deliveryChannel: result.deliveryChannel,
      status: result.status,
    },
  });

  res.status(201).json(result);
});

export const searchReportExports = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await ExportService.searchExports(req.db, {
      tenantId: requireTenantId(req),
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      filters: {
        reportDefinitionId: req.query.reportDefinitionId
          ? String(req.query.reportDefinitionId)
          : null,
        status: req.query.status ? (String(req.query.status) as any) : null,
        format: req.query.format ? (String(req.query.format) as any) : null,
        deliveryChannel: req.query.deliveryChannel
          ? (String(req.query.deliveryChannel) as any)
          : null,
        createdFrom: req.query.createdFrom ? String(req.query.createdFrom) : null,
        createdTo: req.query.createdTo ? String(req.query.createdTo) : null,
      },
    });

    await logAction(req, 'REPORT_EXPORTS_SEARCHED', {
      metadata: {
        total: result.meta.total,
      },
    });

    res.status(200).json(result);
  },
);

export const upsertDashboardDefinition = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await DashboardService.upsertDashboardDefinition(req.db, {
      tenantId: requireTenantId(req),
      key: req.body.key,
      name: req.body.name,
      description: req.body.description,
      visibility: req.body.visibility,
      isSystem: req.body.isSystem,
      isActive: req.body.isActive,
      layout: req.body.layout,
      filters: req.body.filters,
      metadata: req.body.metadata,
    });

    await logAction(req, 'DASHBOARD_DEFINITION_UPSERTED', {
      entityId: result.id,
      entityType: 'DASHBOARD_DEFINITION',
      metadata: {
        key: result.key,
        visibility: result.visibility,
        isActive: result.isActive,
      },
    });

    res.status(200).json(result);
  },
);

export const searchDashboardDefinitions = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await DashboardService.searchDashboardDefinitions(req.db, {
      tenantId: requireTenantId(req),
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      filters: {
        key: req.query.key ? String(req.query.key) : null,
        name: req.query.name ? String(req.query.name) : null,
        visibility: req.query.visibility
          ? (String(req.query.visibility) as any)
          : null,
        isActive:
          typeof req.query.isActive !== 'undefined'
            ? String(req.query.isActive) === 'true'
            : null,
        createdFrom: req.query.createdFrom ? String(req.query.createdFrom) : null,
        createdTo: req.query.createdTo ? String(req.query.createdTo) : null,
      },
    });

    await logAction(req, 'DASHBOARD_DEFINITIONS_SEARCHED', {
      metadata: {
        total: result.meta.total,
      },
    });

    res.status(200).json(result);
  },
);

export const upsertDashboardWidget = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await DashboardService.upsertDashboardWidget(req.db, {
      tenantId: requireTenantId(req),
      dashboardDefinitionId: req.body.dashboardDefinitionId,
      key: req.body.key,
      title: req.body.title,
      widgetType: req.body.widgetType,
      dataSource: req.body.dataSource,
      config: req.body.config,
      position: req.body.position,
      visibilityRules: req.body.visibilityRules,
      refreshIntervalSec: req.body.refreshIntervalSec,
      isActive: req.body.isActive,
      metadata: req.body.metadata,
    });

    await logAction(req, 'DASHBOARD_WIDGET_UPSERTED', {
      entityId: result.id,
      entityType: 'DASHBOARD_WIDGET',
      metadata: {
        dashboardDefinitionId: result.dashboardDefinitionId,
        key: result.key,
        widgetType: result.widgetType,
      },
    });

    res.status(200).json(result);
  },
);

export const searchDashboardWidgets = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await DashboardService.searchDashboardWidgets(req.db, {
      tenantId: requireTenantId(req),
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      filters: {
        dashboardDefinitionId: req.query.dashboardDefinitionId
          ? String(req.query.dashboardDefinitionId)
          : null,
        key: req.query.key ? String(req.query.key) : null,
        isActive:
          typeof req.query.isActive !== 'undefined'
            ? String(req.query.isActive) === 'true'
            : null,
        createdFrom: req.query.createdFrom ? String(req.query.createdFrom) : null,
        createdTo: req.query.createdTo ? String(req.query.createdTo) : null,
      },
    });

    await logAction(req, 'DASHBOARD_WIDGETS_SEARCHED', {
      metadata: {
        total: result.meta.total,
      },
    });

    res.status(200).json(result);
  },
);

export const upsertScheduledReport = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await ScheduleService.upsertSchedule(req.db, {
      tenantId: requireTenantId(req),
      reportDefinitionId: req.body.reportDefinitionId,
      name: req.body.name,
      frequency: req.body.frequency,
      cronExpression: req.body.cronExpression,
      timezone: req.body.timezone,
      format: req.body.format,
      deliveryChannel: req.body.deliveryChannel,
      isEnabled: req.body.isEnabled,
      recipients: req.body.recipients,
      parameters: req.body.parameters,
      nextRunAt: req.body.nextRunAt,
      createdByUserId: req.body.createdByUserId ?? req.user?.sub ?? null,
      metadata: req.body.metadata,
    });

    await logAction(req, 'SCHEDULE_UPSERTED', {
      entityId: result.id,
      entityType: 'SCHEDULED_REPORT',
      metadata: {
        reportDefinitionId: result.reportDefinitionId,
        frequency: result.frequency,
        isEnabled: result.isEnabled,
      },
    });

    res.status(200).json(result);
  },
);

export const searchScheduledReports = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await ScheduleService.searchSchedules(req.db, {
      tenantId: requireTenantId(req),
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      filters: {
        reportDefinitionId: req.query.reportDefinitionId
          ? String(req.query.reportDefinitionId)
          : null,
        frequency: req.query.frequency
          ? (String(req.query.frequency) as any)
          : null,
        isEnabled:
          typeof req.query.isEnabled !== 'undefined'
            ? String(req.query.isEnabled) === 'true'
            : null,
        createdFrom: req.query.createdFrom ? String(req.query.createdFrom) : null,
        createdTo: req.query.createdTo ? String(req.query.createdTo) : null,
      },
    });

    await logAction(req, 'SCHEDULES_SEARCHED', {
      metadata: {
        total: result.meta.total,
      },
    });

    res.status(200).json(result);
  },
);

export const upsertBIConnector = asyncHandler(async (req: Request, res: Response) => {
  const result = await BIConnectorService.upsertConnector(req.db, {
    tenantId: requireTenantId(req),
    connectorType: req.body.connectorType,
    name: req.body.name,
    isEnabled: req.body.isEnabled,
    endpointUrl: req.body.endpointUrl,
    workspaceId: req.body.workspaceId,
    datasetId: req.body.datasetId,
    credentialsRef: req.body.credentialsRef,
    config: req.body.config,
    metadata: req.body.metadata,
  });

  await logAction(req, 'BI_CONNECTOR_UPSERTED', {
    entityId: result.id,
    entityType: 'BI_CONNECTOR_CONFIG',
    metadata: {
      connectorType: result.connectorType,
      name: result.name,
      isEnabled: result.isEnabled,
    },
  });

  res.status(200).json(result);
});

export const searchBIConnectors = asyncHandler(async (req: Request, res: Response) => {
  const result = await BIConnectorService.searchConnectors(req.db, {
    tenantId: requireTenantId(req),
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    filters: {
      connectorType: req.query.connectorType
        ? (String(req.query.connectorType) as any)
        : null,
      name: req.query.name ? String(req.query.name) : null,
      isEnabled:
        typeof req.query.isEnabled !== 'undefined'
          ? String(req.query.isEnabled) === 'true'
          : null,
      createdFrom: req.query.createdFrom ? String(req.query.createdFrom) : null,
      createdTo: req.query.createdTo ? String(req.query.createdTo) : null,
    },
  });

  await logAction(req, 'BI_CONNECTORS_SEARCHED', {
    metadata: {
      total: result.meta.total,
    },
  });

  res.status(200).json(result);
});