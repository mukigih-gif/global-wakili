// apps/api/src/modules/compliance/ComplianceCapabilityService.ts

type CapabilityStatus =
  | 'ACTIVE'
  | 'PENDING_SCHEMA'
  | 'PENDING_CROSS_MODULE'
  | 'PENDING_PROVIDER';

type CapabilityRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type ComplianceCapability = {
  key: string;
  status: CapabilityStatus;
  risk: CapabilityRisk;
  requiredForCloseout: boolean;
  description: string;
  notes?: string[];
};

function hasGoamlEnv(): boolean {
  return Boolean(
    process.env.GOAML_BASE_URL ||
      process.env.GOAML_API_KEY ||
      process.env.GOAML_USERNAME,
  );
}

export class ComplianceCapabilityService {
  static getCapabilities(): ComplianceCapability[] {
    return [
      {
        key: 'compliance.client_kyc',
        status: 'ACTIVE',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'Client KYC review is orchestrated through the existing ClientKYCService and ClientComplianceCheck schema.',
      },
      {
        key: 'compliance.pep_screening',
        status: 'ACTIVE',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'PEP screening is orchestrated through the existing PEPCheckService.',
      },
      {
        key: 'compliance.sanctions_screening',
        status: 'ACTIVE',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'Sanctions screening is orchestrated through the existing SanctionsCheckService.',
      },
      {
        key: 'compliance.risk_scoring',
        status: 'ACTIVE',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'AML risk scoring is orchestrated through RiskScoringService and persisted on Client.',
      },
      {
        key: 'compliance.check_history',
        status: 'ACTIVE',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'ClientComplianceCheck records can be searched and reviewed by compliance users.',
      },
      {
        key: 'compliance.aml_reports',
        status: 'ACTIVE',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'ComplianceReport supports STR, CTR, KYC_EXCEPTION, and AML_REVIEW reporting workflows.',
      },
      {
        key: 'compliance.goaml_str_bridge',
        status: hasGoamlEnv() ? 'ACTIVE' : 'PENDING_PROVIDER',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'STR reports can be submitted/synced through the integrations/goAML STRService when tenant goAML configuration exists.',
        notes: [
          'CTR provider submission remains reserved until a provider-specific CTR pathway is implemented.',
        ],
      },
      {
        key: 'compliance.dashboard',
        status: 'ACTIVE',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'Compliance dashboard summarizes AML clients, high-risk exposure, checks, reports, and exceptions.',
      },
      {
        key: 'compliance.calendar',
        status: 'ACTIVE',
        risk: 'MEDIUM',
        requiredForCloseout: true,
        description:
          'Compliance calendar identifies review deadlines from client KYC/screening dates and report periods.',
      },
      {
        key: 'compliance.transaction_monitoring',
        status: 'PENDING_SCHEMA',
        risk: 'CRITICAL',
        requiredForCloseout: false,
        description:
          'Automated transaction monitoring and CTR detection require formal rule configuration and monitoring schema.',
      },
      {
        key: 'compliance.mlro_case_workflow',
        status: 'PENDING_CROSS_MODULE',
        risk: 'CRITICAL',
        requiredForCloseout: false,
        description:
          'MLRO case workflows should integrate with approvals, tasks, notifications, and platform role controls.',
      },
      {
        key: 'compliance.notifications',
        status: 'PENDING_CROSS_MODULE',
        risk: 'HIGH',
        requiredForCloseout: false,
        description:
          'Compliance escalations should wait for full Notifications and Queues module buildout.',
      },
    ];
  }

  static getSummary() {
    const capabilities = this.getCapabilities();

    return {
      module: 'compliance',
      generatedAt: new Date(),
      status: 'AML_ORCHESTRATION_ACTIVE_WITH_RESERVED_MONITORING_EXTENSIONS',
      active: capabilities.filter((item) => item.status === 'ACTIVE').length,
      pendingSchema: capabilities.filter((item) => item.status === 'PENDING_SCHEMA').length,
      pendingCrossModule: capabilities.filter((item) => item.status === 'PENDING_CROSS_MODULE')
        .length,
      pendingProvider: capabilities.filter((item) => item.status === 'PENDING_PROVIDER').length,
      requiredForCloseoutRemaining: capabilities.filter(
        (item) => item.requiredForCloseout && item.status !== 'ACTIVE',
      ),
      capabilities,
    };
  }
}

export default ComplianceCapabilityService;