// apps/api/src/modules/approval/ApprovalCapabilityService.ts

type CapabilityStatus =
  | 'ACTIVE'
  | 'PENDING_CROSS_MODULE_HOOKS'
  | 'PENDING_POLICY_AUTOMATION'
  | 'PENDING_PLATFORM';

type CapabilityRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type ApprovalCapability = {
  key: string;
  status: CapabilityStatus;
  risk: CapabilityRisk;
  requiredForCloseout: boolean;
  description: string;
};

export class ApprovalCapabilityService {
  static getCapabilities(): ApprovalCapability[] {
    return [
      {
        key: 'approval.schema_foundation',
        status: 'ACTIVE',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'Central Approval now supports module-aware, level-aware, priority-aware, escalated, delegated, and versioned workflows.',
      },
      {
        key: 'approval.cross_module_spine',
        status: 'ACTIVE',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'Approval is designed as a shared workflow spine for procurement, payroll, finance, trust, billing, compliance, and operational exceptions.',
      },
      {
        key: 'approval.audit_and_deadline_controls',
        status: 'ACTIVE',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'Approval requests support audit logging, deadlines, escalation, delegation, and before/after snapshots.',
      },
      {
        key: 'approval.policy_automation',
        status: 'PENDING_POLICY_AUTOMATION',
        risk: 'HIGH',
        requiredForCloseout: false,
        description:
          'Policy-driven threshold routing and auto-approval rules will be expanded as existing module hooks are absorbed.',
      },
      {
        key: 'approval.cross_module_hooks',
        status: 'PENDING_CROSS_MODULE_HOOKS',
        risk: 'CRITICAL',
        requiredForCloseout: false,
        description:
          'Existing procurement, payroll, finance, trust, and billing approval triggers still need full central hook integration.',
      },
      {
        key: 'approval.platform_visibility',
        status: 'PENDING_PLATFORM',
        risk: 'MEDIUM',
        requiredForCloseout: false,
        description:
          'Platform admin visibility and tenant-wide approval governance will be expanded during Platform module buildout.',
      },
    ];
  }

  static getSummary() {
    const capabilities = this.getCapabilities();

    return {
      module: 'approval',
      generatedAt: new Date(),
      status: 'CENTRAL_APPROVAL_WORKFLOW_FOUNDATION_ACTIVE',
      active: capabilities.filter((item) => item.status === 'ACTIVE').length,
      pendingCrossModuleHooks: capabilities.filter(
        (item) => item.status === 'PENDING_CROSS_MODULE_HOOKS'),
      pendingPolicyAutomation: capabilities.filter(
        (item) => item.status === 'PENDING_POLICY_AUTOMATION').length,
      pendingPlatform: capabilities.filter(
        (item) => item.status === 'PENDING_PLATFORM').length,
      requiredForCloseoutRemaining: capabilities.filter(
        (item) => item.requiredForCloseout && item.status !== 'ACTIVE',
      ),
      capabilities,
    };
  }
}

export default ApprovalCapabilityService;
