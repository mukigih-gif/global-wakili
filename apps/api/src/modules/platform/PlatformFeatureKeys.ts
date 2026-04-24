// apps/api/src/modules/platform/PlatformFeatureKeys.ts

export const PLATFORM_FEATURE_KEYS = {
  FINANCE_REPORT_EXPORTS: 'finance_report_exports',
  TRUST_STATEMENT_EXPORTS: 'trust_statement_exports',
  PAYROLL_STATUTORY_ENGINE: 'kenya_statutory_payroll_engine',
  REPORTING_BI_CONNECTORS: 'bi_connectors',
  REPORTING_ADVANCED_SCHEDULING: 'advanced_scheduling',
  DOCUMENT_SECURE_FILE_OPERATIONS: 'document_secure_file_operations',
  INTEGRATIONS_ACTIVE_SYNC: 'integrations_active_sync',
  QUEUES_OPERATOR_ACTIONS: 'queues_operator_actions',
  COMPLIANCE_REGULATORY_OPERATIONS: 'compliance_regulatory_operations',
  AI_TENANT_WORKFLOWS: 'ai_tenant_workflows',
} as const;

export type PlatformFeatureKey =
  (typeof PLATFORM_FEATURE_KEYS)[keyof typeof PLATFORM_FEATURE_KEYS];

export default PLATFORM_FEATURE_KEYS;