// apps/api/src/modules/reporting/ReportingCapabilityService.ts

type CapabilityStatus =
  | 'ACTIVE'
  | 'PENDING_LEGACY_ABSORPTION'
  | 'PENDING_EXPORT_PIPELINE'
  | 'PENDING_BI_DELIVERY'
  | 'PENDING_PLATFORM';

type CapabilityRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type ReportingCapability = {
  key: string;
  status: CapabilityStatus;
  risk: CapabilityRisk;
  requiredForCloseout: boolean;
  description: string;
};

export class ReportingCapabilityService {
  static getCapabilities(): ReportingCapability[] {
    return [
      {
        key: 'reporting.schema_foundation',
        status: 'ACTIVE',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'Central report definitions, runs, exports, dashboard definitions, widgets, BI connectors, and schedules are schema-backed.',
      },
      {
        key: 'reporting.canonical_module',
        status: 'ACTIVE',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'Reporting is the canonical reporting/BI consolidation layer above analytics, while legacy dashboards and legacy reports remain temporary.',
      },
      {
        key: 'reporting.executive_dashboards',
        status: 'ACTIVE',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'Role-aware executive dashboard blueprints support KPI cards, pie/donut, line/area, bar/column, and ERP management views with tenant-role cache policy metadata.',
      },
      {
        key: 'reporting.prebuilt_operational_catalog',
        status: 'ACTIVE',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'Registry catalog includes payroll, finance, trust, compliance, client, matter, and operational reporting baselines ready for governed execution.',
      },
      {
        key: 'reporting.legacy_absorption',
        status: 'PENDING_LEGACY_ABSORPTION',
        risk: 'HIGH',
        requiredForCloseout: false,
        description:
          'Legacy dashboards and legacy reports still need to be absorbed into the canonical reporting module before old files are retired.',
      },
      {
        key: 'reporting.export_pipeline',
        status: 'PENDING_EXPORT_PIPELINE',
        risk: 'HIGH',
        requiredForCloseout: false,
        description:
          'Queue-backed file generation and storage-backed export fulfillment still need to be wired into the central export pipeline.',
      },
      {
        key: 'reporting.bi_delivery',
        status: 'PENDING_BI_DELIVERY',
        risk: 'MEDIUM',
        requiredForCloseout: false,
        description:
          'Power BI and BI connector delivery are schema-backed and service-ready but still await active secure delivery implementation.',
      },
      {
        key: 'reporting.platform_feature_gating',
        status: 'PENDING_PLATFORM',
        risk: 'MEDIUM',
        requiredForCloseout: false,
        description:
          'Plan-aware feature gating and platform-wide reporting governance will mature during Platform module buildout.',
      },
    ];
  }

  static getFeatureGates() {
    return [
      {
        feature: 'STANDARD_EXPORTS',
        includedInPlans: ['BASIC', 'PRO', 'ENTERPRISE'],
        notes: 'JSON/CSV/XLSX/PDF export capability.',
      },
      {
        feature: 'ADVANCED_SCHEDULING',
        includedInPlans: ['PRO', 'ENTERPRISE'],
        notes: 'Recurring scheduled report delivery and cron-driven subscriptions.',
      },
      {
        feature: 'BI_CONNECTORS',
        includedInPlans: ['PRO', 'ENTERPRISE'],
        notes: 'Secure read-only BI delivery connector configuration.',
      },
      {
        feature: 'EXECUTIVE_DASHBOARDS',
        includedInPlans: ['PRO', 'ENTERPRISE'],
        notes: 'Enhanced executive role dashboards and advanced operational visuals.',
      },
      {
        feature: 'CUSTOM_REPORTS',
        includedInPlans: ['ENTERPRISE'],
        notes: 'Tenant-tailored custom reporting surfaces.',
      },
    ];
  }

  static getSummary() {
    const capabilities = this.getCapabilities();
    const featureGates = this.getFeatureGates();

    return {
      module: 'reporting',
      generatedAt: new Date(),
      status: 'CANONICAL_REPORTING_BI_MODULE_FOUNDATION_ACTIVE',
      active: capabilities.filter((item) => item.status === 'ACTIVE').length,
      pendingLegacyAbsorption: capabilities.filter(
        (item) => item.status === 'PENDING_LEGACY_ABSORPTION',
      ).length,
      pendingExportPipeline: capabilities.filter(
        (item) => item.status === 'PENDING_EXPORT_PIPELINE',
      ).length,
      pendingBIDelivery: capabilities.filter(
        (item) => item.status === 'PENDING_BI_DELIVERY',
      ).length,
      pendingPlatform: capabilities.filter(
        (item) => item.status === 'PENDING_PLATFORM',
      ).length,
      requiredForCloseoutRemaining: capabilities.filter(
        (item) => item.requiredForCloseout && item.status !== 'ACTIVE',
      ),
      featureGates,
      capabilities,
    };
  }
}

export default ReportingCapabilityService;