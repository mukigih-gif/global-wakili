// apps/api/src/modules/court/CourtCapabilityService.ts

type CapabilityStatus =
  | 'ACTIVE'
  | 'PENDING_SCHEMA'
  | 'PENDING_CROSS_MODULE'
  | 'PENDING_PROVIDER';

type CapabilityRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type CourtCapability = {
  key: string;
  status: CapabilityStatus;
  risk: CapabilityRisk;
  requiredForCloseout: boolean;
  description: string;
  notes?: string[];
};

export class CourtCapabilityService {
  static getCapabilities(): CourtCapability[] {
    return [
      {
        key: 'court.hearing_registry',
        status: 'ACTIVE',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'Tenant-scoped court hearing registry using CourtHearing.',
      },
      {
        key: 'court.matter_linkage',
        status: 'ACTIVE',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'Court hearings are linked to legal matters and validated within tenant scope.',
      },
      {
        key: 'court.calendar_linkage',
        status: 'ACTIVE',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'Court hearings can link to existing tenant-scoped CalendarEvent records through calendarEventId.',
      },
      {
        key: 'court.status_lifecycle',
        status: 'ACTIVE',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'Court hearing statuses support scheduled, adjourned, completed, cancelled, and missed states.',
      },
      {
        key: 'court.outcome_notes',
        status: 'ACTIVE',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'Outcome and notes can be recorded for hearings.',
      },
      {
        key: 'court.dashboard',
        status: 'ACTIVE',
        risk: 'MEDIUM',
        requiredForCloseout: true,
        description:
          'Court dashboard summarizes hearing volumes, upcoming dates, overdue hearings, status, and court stations.',
      },
      {
        key: 'court.audit',
        status: 'ACTIVE',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'Court actions are audit-logged with tenant, actor, hearing, matter, request, and metadata context.',
      },
      {
        key: 'court.filing_registry',
        status: 'PENDING_SCHEMA',
        risk: 'CRITICAL',
        requiredForCloseout: false,
        description:
          'Court filing registry requires a CourtFiling or Filing model before activation.',
      },
      {
        key: 'court.pleadings_registry',
        status: 'PENDING_SCHEMA',
        risk: 'HIGH',
        requiredForCloseout: false,
        description:
          'Pleading registry requires a Pleading model or document-filing bridge before activation.',
      },
      {
        key: 'court.efiling',
        status: 'PENDING_PROVIDER',
        risk: 'CRITICAL',
        requiredForCloseout: false,
        description:
          'Electronic court filing integration requires provider/court portal integration, filing receipts, and audit controls.',
      },
      {
        key: 'court.document_handoff',
        status: 'PENDING_CROSS_MODULE',
        risk: 'HIGH',
        requiredForCloseout: false,
        description:
          'Court documents should link to Document Management through a formal court-document bridge.',
      },
      {
        key: 'court.task_handoff',
        status: 'PENDING_CROSS_MODULE',
        risk: 'MEDIUM',
        requiredForCloseout: false,
        description:
          'Filing and hearing follow-up tasks should link to Task Management through a formal schema bridge.',
      },
      {
        key: 'court.notifications',
        status: 'PENDING_CROSS_MODULE',
        risk: 'HIGH',
        requiredForCloseout: false,
        description:
          'Court notifications and reminders should wait for full Notifications and Queues buildout.',
      },
    ];
  }

  static getSummary() {
    const capabilities = this.getCapabilities();

    return {
      module: 'court',
      generatedAt: new Date(),
      status: 'HEARING_REGISTRY_ACTIVE_WITH_RESERVED_FILING_EXTENSIONS',
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

export default CourtCapabilityService;