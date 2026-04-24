// apps/api/src/modules/analytics/AnalyticsCapabilityService.ts

type CapabilityStatus =
  | 'ACTIVE'
  | 'PENDING_REPORTING_BI'
  | 'PENDING_AI'
  | 'PENDING_PLATFORM';

type CapabilityRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type AnalyticsCapability = {
  key: string;
  status: CapabilityStatus;
  risk: CapabilityRisk;
  requiredForCloseout: boolean;
  description: string;
};

export class AnalyticsCapabilityService {
  static getCapabilities(): AnalyticsCapability[] {
    return [
      {
        key: 'analytics.schema_foundation',
        status: 'ACTIVE',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'AnalyticsMetric, AnalyticsSnapshot, and AnalyticsInsight support tenant-scoped analytics persistence.',
      },
      {
        key: 'analytics.operational_overview',
        status: 'ACTIVE',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'Tenant operational KPIs can be computed from clients, matters, billing, trust, compliance, notifications, and queues.',
      },
      {
        key: 'analytics.client_matter_billing_trust',
        status: 'ACTIVE',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'Client, matter, invoice, and trust analytics are available from existing ERP source models.',
      },
      {
        key: 'analytics.compliance_operations',
        status: 'ACTIVE',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'Compliance, notification, queue, and platform activity analytics are available.',
      },
      {
        key: 'analytics.snapshots_insights',
        status: 'ACTIVE',
        risk: 'MEDIUM',
        requiredForCloseout: true,
        description:
          'Analytics metrics, snapshots, and insights can be stored and searched.',
      },
      {
        key: 'analytics.legacy_dashboards_boundary',
        status: 'ACTIVE',
        risk: 'MEDIUM',
        requiredForCloseout: true,
        description:
          'Analytics remains separate from the legacy dashboards module until the later Reporting/BI consolidation.',
      },
      {
        key: 'analytics.reporting_bi',
        status: 'PENDING_REPORTING_BI',
        risk: 'HIGH',
        requiredForCloseout: false,
        description:
          'Report builder, exports, scheduled reports, and Power BI connectors remain reserved for Reporting/BI.',
      },
      {
        key: 'analytics.ai_forecasting',
        status: 'PENDING_AI',
        risk: 'MEDIUM',
        requiredForCloseout: false,
        description:
          'Forecasting, anomaly detection, and AI recommendations will be handled in the AI layer.',
      },
      {
        key: 'analytics.platform_wide_multi_tenant',
        status: 'PENDING_PLATFORM',
        risk: 'CRITICAL',
        requiredForCloseout: false,
        description:
          'Cross-tenant platform analytics will be connected during Platform/Super Admin buildout.',
      },
    ];
  }

  static getSummary() {
    const capabilities = this.getCapabilities();

    return {
      module: 'analytics',
      generatedAt: new Date(),
      status: 'SCHEMA_BACKED_OPERATIONAL_ANALYTICS_ACTIVE',
      active: capabilities.filter((item) => item.status === 'ACTIVE').length,
      pendingReportingBi: capabilities.filter(
        (item) => item.status === 'PENDING_REPORTING_BI',
      ).length,
      pendingAi: capabilities.filter((item) => item.status === 'PENDING_AI')
        .length,
      pendingPlatform: capabilities.filter(
        (item) => item.status === 'PENDING_PLATFORM',
      ).length,
      requiredForCloseoutRemaining: capabilities.filter(
        (item) => item.requiredForCloseout && item.status !== 'ACTIVE',
      ),
      capabilities,
    };
  }
}

export default AnalyticsCapabilityService;