// apps/api/src/modules/analytics/index.ts

export * from './analytics.types';
export * from './analytics.validators';

export * from './AnalyticsPermissionMap';
export * from './AnalyticsAuditService';
export * from './AnalyticsCapabilityService';
export * from './AnalyticsMetricService';
export * from './AnalyticsOverviewService';
export * from './AnalyticsClientService';
export * from './AnalyticsMatterService';
export * from './AnalyticsBillingService';
export * from './AnalyticsTrustService';
export * from './AnalyticsProductivityService';
export * from './AnalyticsComplianceService';
export * from './AnalyticsOperationsService';

export * from './analytics.controller';

export { default as analyticsRoutes } from './analytics.routes';