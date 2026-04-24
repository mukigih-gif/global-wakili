// apps/api/src/modules/analytics/analytics.controller.ts

import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { AnalyticsAuditService } from './AnalyticsAuditService';
import { AnalyticsBillingService } from './AnalyticsBillingService';
import { AnalyticsCapabilityService } from './AnalyticsCapabilityService';
import { AnalyticsClientService } from './AnalyticsClientService';
import { AnalyticsComplianceService } from './AnalyticsComplianceService';
import { AnalyticsMatterService } from './AnalyticsMatterService';
import { AnalyticsMetricService } from './AnalyticsMetricService';
import { AnalyticsOperationsService } from './AnalyticsOperationsService';
import { AnalyticsOverviewService } from './AnalyticsOverviewService';
import { AnalyticsProductivityService } from './AnalyticsProductivityService';
import { AnalyticsTrustService } from './AnalyticsTrustService';

function analyticsPeriod(req: Request) {
  return {
    from: req.query.from ? String(req.query.from) : null,
    to: req.query.to ? String(req.query.to) : null,
  };
}

async function log(
  req: Request,
  action: Parameters<typeof AnalyticsAuditService.logAction>[1]['action'],
  metadata?: Record<string, unknown>,
  entityId?: string | null,
  entityType?: string | null,
) {
  await AnalyticsAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    action,
    entityId: entityId ?? null,
    entityType: entityType ?? 'ANALYTICS',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    metadata: metadata ?? {},
  });
}

export const getAnalyticsOverview = asyncHandler(async (req: Request, res: Response) => {
  const result = await AnalyticsOverviewService.getOverview(req.db, {
    tenantId: req.tenantId!,
    period: analyticsPeriod(req),
  });

  await log(req, 'OVERVIEW_VIEWED', { period: result.period });
  res.status(200).json(result);
});

export const getAnalyticsKpis = asyncHandler(async (req: Request, res: Response) => {
  const result = await AnalyticsOverviewService.getKpis(req.db, {
    tenantId: req.tenantId!,
    period: analyticsPeriod(req),
  });

  await log(req, 'KPI_VIEWED', {
    period: result.period,
    kpiCount: result.kpis.length,
  });

  res.status(200).json(result);
});

export const getClientAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const result = await AnalyticsClientService.getAnalytics(req.db, {
    tenantId: req.tenantId!,
    period: analyticsPeriod(req),
  });

  await log(req, 'CLIENT_ANALYTICS_VIEWED', { period: result.period });
  res.status(200).json(result);
});

export const getMatterAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const result = await AnalyticsMatterService.getAnalytics(req.db, {
    tenantId: req.tenantId!,
    period: analyticsPeriod(req),
  });

  await log(req, 'MATTER_ANALYTICS_VIEWED', { period: result.period });
  res.status(200).json(result);
});

export const getBillingAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const result = await AnalyticsBillingService.getAnalytics(req.db, {
    tenantId: req.tenantId!,
    period: analyticsPeriod(req),
  });

  await log(req, 'BILLING_ANALYTICS_VIEWED', { period: result.period });
  res.status(200).json(result);
});

export const getTrustAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const result = await AnalyticsTrustService.getAnalytics(req.db, {
    tenantId: req.tenantId!,
    period: analyticsPeriod(req),
  });

  await log(req, 'TRUST_ANALYTICS_VIEWED', { period: result.period });
  res.status(200).json(result);
});

export const getProductivityAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const result = await AnalyticsProductivityService.getAnalytics(req.db, {
    tenantId: req.tenantId!,
    period: analyticsPeriod(req),
  });

  await log(req, 'PRODUCTIVITY_ANALYTICS_VIEWED', { period: result.period });
  res.status(200).json(result);
});

export const getComplianceAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const result = await AnalyticsComplianceService.getAnalytics(req.db, {
    tenantId: req.tenantId!,
    period: analyticsPeriod(req),
  });

  await log(req, 'COMPLIANCE_ANALYTICS_VIEWED', { period: result.period });
  res.status(200).json(result);
});

export const getOperationsAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const result = await AnalyticsOperationsService.getAnalytics(req.db, {
    tenantId: req.tenantId!,
    period: analyticsPeriod(req),
  });

  await log(req, 'OPERATIONS_ANALYTICS_VIEWED', { period: result.period });
  res.status(200).json(result);
});

export const createAnalyticsMetric = asyncHandler(async (req: Request, res: Response) => {
  const result = await AnalyticsMetricService.createMetric(req.db, {
    tenantId: req.tenantId!,
    module: req.body.module,
    scope: req.body.scope,
    metricKey: req.body.metricKey,
    metricName: req.body.metricName,
    value: req.body.value,
    valueType: req.body.valueType,
    unit: req.body.unit,
    periodStart: req.body.periodStart,
    periodEnd: req.body.periodEnd,
    sourceEntityType: req.body.sourceEntityType,
    sourceEntityId: req.body.sourceEntityId,
    dimensions: req.body.dimensions,
    metadata: req.body.metadata,
  });

  await log(
    req,
    'METRIC_CREATED',
    {
      module: result.module,
      metricKey: result.metricKey,
      scope: result.scope,
    },
    result.id,
    'ANALYTICS_METRIC',
  );

  res.status(201).json(result);
});

export const searchAnalyticsMetrics = asyncHandler(async (req: Request, res: Response) => {
  const result = await AnalyticsMetricService.searchMetrics(req.db, {
    tenantId: req.tenantId!,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    filters: {
      module: req.query.module ? (String(req.query.module) as any) : null,
      metricKey: req.query.metricKey ? String(req.query.metricKey) : null,
      scope: req.query.scope ? (String(req.query.scope) as any) : null,
      sourceEntityType: req.query.sourceEntityType
        ? String(req.query.sourceEntityType)
        : null,
      sourceEntityId: req.query.sourceEntityId ? String(req.query.sourceEntityId) : null,
      periodStartFrom: req.query.periodStartFrom
        ? String(req.query.periodStartFrom)
        : null,
      periodStartTo: req.query.periodStartTo ? String(req.query.periodStartTo) : null,
      periodEndFrom: req.query.periodEndFrom ? String(req.query.periodEndFrom) : null,
      periodEndTo: req.query.periodEndTo ? String(req.query.periodEndTo) : null,
      createdFrom: req.query.createdFrom ? String(req.query.createdFrom) : null,
      createdTo: req.query.createdTo ? String(req.query.createdTo) : null,
    },
  });

  await log(req, 'METRIC_SEARCHED', { resultCount: result.meta.total });
  res.status(200).json(result);
});

export const createAnalyticsSnapshot = asyncHandler(async (req: Request, res: Response) => {
  const result = await AnalyticsMetricService.createSnapshot(req.db, {
    tenantId: req.tenantId!,
    module: req.body.module,
    snapshotKey: req.body.snapshotKey,
    title: req.body.title,
    description: req.body.description,
    periodStart: req.body.periodStart,
    periodEnd: req.body.periodEnd,
    payload: req.body.payload,
    metrics: req.body.metrics,
    metadata: req.body.metadata,
  });

  await log(
    req,
    'SNAPSHOT_CREATED',
    {
      module: result.module,
      snapshotKey: result.snapshotKey,
      status: result.status,
    },
    result.id,
    'ANALYTICS_SNAPSHOT',
  );

  res.status(201).json(result);
});

export const searchAnalyticsSnapshots = asyncHandler(async (req: Request, res: Response) => {
  const result = await AnalyticsMetricService.searchSnapshots(req.db, {
    tenantId: req.tenantId!,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    filters: {
      module: req.query.module ? (String(req.query.module) as any) : null,
      snapshotKey: req.query.snapshotKey ? String(req.query.snapshotKey) : null,
      status: req.query.status ? (String(req.query.status) as any) : null,
    },
  });

  await log(req, 'SNAPSHOT_SEARCHED', { resultCount: result.meta.total });
  res.status(200).json(result);
});

export const createAnalyticsInsight = asyncHandler(async (req: Request, res: Response) => {
  const result = await AnalyticsMetricService.createInsight(req.db, {
    tenantId: req.tenantId!,
    module: req.body.module,
    insightKey: req.body.insightKey,
    title: req.body.title,
    summary: req.body.summary,
    severity: req.body.severity,
    status: req.body.status,
    entityType: req.body.entityType,
    entityId: req.body.entityId,
    score: req.body.score,
    payload: req.body.payload,
    metadata: req.body.metadata,
  });

  await log(
    req,
    'INSIGHT_CREATED',
    {
      module: result.module,
      insightKey: result.insightKey,
      severity: result.severity,
      status: result.status,
    },
    result.id,
    'ANALYTICS_INSIGHT',
  );

  res.status(201).json(result);
});

export const searchAnalyticsInsights = asyncHandler(async (req: Request, res: Response) => {
  const result = await AnalyticsMetricService.searchInsights(req.db, {
    tenantId: req.tenantId!,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    filters: {
      module: req.query.module ? (String(req.query.module) as any) : null,
      insightKey: req.query.insightKey ? String(req.query.insightKey) : null,
      severity: req.query.severity ? (String(req.query.severity) as any) : null,
      status: req.query.status ? (String(req.query.status) as any) : null,
      entityType: req.query.entityType ? String(req.query.entityType) : null,
      entityId: req.query.entityId ? String(req.query.entityId) : null,
    },
  });

  await log(req, 'INSIGHT_SEARCHED', { resultCount: result.meta.total });
  res.status(200).json(result);
});

export const getAnalyticsCapabilities = asyncHandler(async (req: Request, res: Response) => {
  const result = AnalyticsCapabilityService.getSummary();

  await log(req, 'CAPABILITY_VIEWED', {
    active: result.active,
    pendingReportingBi: result.pendingReportingBi,
    pendingAi: result.pendingAi,
    pendingPlatform: result.pendingPlatform,
  });

  res.status(200).json(result);
});