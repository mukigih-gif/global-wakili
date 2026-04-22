// apps/api/src/modules/reception/ReceptionCapabilityService.ts

type CapabilityStatus =
  | 'ACTIVE'
  | 'PENDING_SCHEMA'
  | 'PENDING_CROSS_MODULE';

type CapabilityRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type ReceptionCapability = {
  key: string;
  status: CapabilityStatus;
  risk: CapabilityRisk;
  requiredForCloseout: boolean;
  description: string;
  notes?: string[];
};

export class ReceptionCapabilityService {
  static getCapabilities(): ReceptionCapability[] {
    return [
      {
        key: 'reception.visitor_logs',
        status: 'ACTIVE',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'Tenant-scoped visitor and walk-in logging through ReceptionLog type VISITOR.',
      },
      {
        key: 'reception.call_logs',
        status: 'ACTIVE',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'Tenant-scoped call logging through ReceptionLog type CALL_LOG.',
      },
      {
        key: 'reception.file_receipts',
        status: 'ACTIVE',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'File/document receipt logging using ReceptionLog delivery fields.',
        notes: [
          'Schema currently has LogType VISITOR and CALL_LOG only; file receipts are recorded as VISITOR with delivery metadata.',
        ],
      },
      {
        key: 'reception.matter_linkage',
        status: 'ACTIVE',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'Reception logs can be linked to matters when matterId is available.',
      },
      {
        key: 'reception.dashboard',
        status: 'ACTIVE',
        risk: 'MEDIUM',
        requiredForCloseout: true,
        description:
          'Reception dashboard summarizes urgent logs, visitor/call volumes, file receipts, and recent activity.',
      },
      {
        key: 'reception.audit',
        status: 'ACTIVE',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'Reception events are audit-logged with tenant, actor, matter, request, and metadata context.',
      },
      {
        key: 'reception.client_onboarding_handoff',
        status: 'PENDING_CROSS_MODULE',
        risk: 'HIGH',
        requiredForCloseout: false,
        description:
          'Quick client onboarding handoff should integrate with the Client onboarding workflow.',
      },
      {
        key: 'reception.matter_opening_handoff',
        status: 'PENDING_CROSS_MODULE',
        risk: 'HIGH',
        requiredForCloseout: false,
        description:
          'Quick matter opening handoff should integrate with the Matter onboarding workflow.',
      },
      {
        key: 'reception.task_handoff',
        status: 'PENDING_CROSS_MODULE',
        risk: 'MEDIUM',
        requiredForCloseout: false,
        description:
          'Front desk task handoff should be formally linked to Task Management when a schema bridge is added.',
      },
      {
        key: 'reception.document_handoff',
        status: 'PENDING_CROSS_MODULE',
        risk: 'HIGH',
        requiredForCloseout: false,
        description:
          'Received files should later link to Document Management with a formal document/reception bridge.',
      },
      {
        key: 'reception.notifications',
        status: 'PENDING_CROSS_MODULE',
        risk: 'MEDIUM',
        requiredForCloseout: false,
        description:
          'Reception notifications should wait for the full Notifications module buildout.',
      },
    ];
  }

  static getSummary() {
    const capabilities = this.getCapabilities();

    return {
      module: 'reception',
      generatedAt: new Date(),
      status: 'FOUNDATION_ACTIVE_WITH_RESERVED_ENTERPRISE_HANDOFFS',
      active: capabilities.filter((item) => item.status === 'ACTIVE').length,
      pendingSchema: capabilities.filter((item) => item.status === 'PENDING_SCHEMA').length,
      pendingCrossModule: capabilities.filter((item) => item.status === 'PENDING_CROSS_MODULE')
        .length,
      requiredForCloseoutRemaining: capabilities.filter(
        (item) => item.requiredForCloseout && item.status !== 'ACTIVE',
      ),
      capabilities,
    };
  }
}

export default ReceptionCapabilityService;