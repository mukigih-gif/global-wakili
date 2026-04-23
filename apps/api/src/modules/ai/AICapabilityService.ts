// apps/api/src/modules/ai/AICapabilityService.ts

type CapabilityStatus =
  | 'ACTIVE'
  | 'PENDING_EXTERNAL_PROVIDER_EXECUTION'
  | 'PENDING_CROSS_MODULE_BRIDGES'
  | 'PENDING_PLATFORM_GOVERNANCE';

type CapabilityRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type AICapability = {
  key: string;
  status: CapabilityStatus;
  risk: CapabilityRisk;
  requiredForCloseout: boolean;
  description: string;
};

export class AICapabilityService {
  static getCapabilities(): AICapability[] {
    return [
      {
        key: 'ai.governed_schema_foundation',
        status: 'ACTIVE',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'Provider configuration, prompt audit, usage logs, artifacts, review tasks, and recommendations are schema-backed.',
      },
      {
        key: 'ai.fail_closed_execution',
        status: 'ACTIVE',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'AI execution is tenant-scoped, permission-gated, provider-governed, and blocks unsafe or unconfigured execution paths.',
      },
      {
        key: 'ai.internal_rules_execution',
        status: 'ACTIVE',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'Document analysis, matter risk, deadline intelligence, billing insights, trust/compliance alerts, drafting assistance, and knowledge support run through governed internal rules.',
      },
      {
        key: 'ai.external_provider_execution',
        status: 'PENDING_EXTERNAL_PROVIDER_EXECUTION',
        risk: 'HIGH',
        requiredForCloseout: false,
        description:
          'External provider adapters remain policy-governed but are intentionally fail-closed until explicit provider execution integration is completed.',
      },
      {
        key: 'ai.cross_module_bridges',
        status: 'PENDING_CROSS_MODULE_BRIDGES',
        risk: 'CRITICAL',
        requiredForCloseout: false,
        description:
          'Document, matter, calendar, billing, trust, compliance, and other modules still need direct bridge adoption into the AI orchestrator.',
      },
      {
        key: 'ai.platform_governance',
        status: 'PENDING_PLATFORM_GOVERNANCE',
        risk: 'MEDIUM',
        requiredForCloseout: false,
        description:
          'Platform-wide AI governance, usage oversight, and tenant policy administration will expand during Platform module buildout.',
      },
    ];
  }

  static getSummary() {
    const capabilities = this.getCapabilities();

    return {
      module: 'ai',
      generatedAt: new Date(),
      status: 'GOVERNED_AI_MODULE_FOUNDATION_ACTIVE',
      active: capabilities.filter((item) => item.status === 'ACTIVE').length,
      pendingExternalProviderExecution: capabilities.filter(
        (item) => item.status === 'PENDING_EXTERNAL_PROVIDER_EXECUTION',
      ).length,
      pendingCrossModuleBridges: capabilities.filter(
        (item) => item.status === 'PENDING_CROSS_MODULE_BRIDGES',
      ).length,
      pendingPlatformGovernance: capabilities.filter(
        (item) => item.status === 'PENDING_PLATFORM_GOVERNANCE',
      ).length,
      requiredForCloseoutRemaining: capabilities.filter(
        (item) => item.requiredForCloseout && item.status !== 'ACTIVE',
      ),
      capabilities,
    };
  }
}

export default AICapabilityService;