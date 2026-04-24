// apps/api/src/modules/task/TaskCapabilityService.ts

type CapabilityStatus =
  | 'ACTIVE'
  | 'RESERVED'
  | 'PENDING_SCHEMA'
  | 'PENDING_CROSS_MODULE';

type CapabilityRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type TaskCapability = {
  key: string;
  status: CapabilityStatus;
  risk: CapabilityRisk;
  description: string;
  requiredForCloseout: boolean;
  notes?: string[];
};

export class TaskCapabilityService {
  static getCapabilities(): TaskCapability[] {
    return [
      {
        key: 'task.matter_tasks',
        status: 'ACTIVE',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'Matter-linked tenant-scoped legal tasks using MatterTask.',
      },
      {
        key: 'task.client_tasks',
        status: 'ACTIVE',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'Client task visibility is derived through the linked matter/client relationship.',
        notes: [
          'Direct standalone client-only tasks require a future ClientTask model or clientId field.',
        ],
      },
      {
        key: 'task.comments_notes',
        status: 'ACTIVE',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'Task notes/comments are active through TaskComment.',
      },
      {
        key: 'task.assignment',
        status: 'ACTIVE',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'Tasks can be assigned to active users within the same tenant.',
      },
      {
        key: 'task.status_lifecycle',
        status: 'ACTIVE',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'Task lifecycle supports TODO, IN_PROGRESS, BLOCKED, DONE, and CANCELLED.',
      },
      {
        key: 'task.dashboard',
        status: 'ACTIVE',
        risk: 'MEDIUM',
        requiredForCloseout: true,
        description:
          'Task dashboard provides workload, status, priority, overdue, and assignment summaries.',
      },
      {
        key: 'task.audit',
        status: 'ACTIVE',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'Task actions are audit-logged with tenant, user, task, matter, request, and metadata context.',
      },
      {
        key: 'task.reminders',
        status: 'PENDING_CROSS_MODULE',
        risk: 'HIGH',
        requiredForCloseout: false,
        description:
          'Task reminders are reserved for the Notifications/Queues/Calendar reminder integration layer.',
      },
      {
        key: 'task.calendar_link',
        status: 'PENDING_CROSS_MODULE',
        risk: 'HIGH',
        requiredForCloseout: false,
        description:
          'Calendar linkage is reserved until a task-calendar schema bridge or event linkage standard is introduced.',
      },
      {
        key: 'task.subtasks_checklists',
        status: 'PENDING_SCHEMA',
        risk: 'MEDIUM',
        requiredForCloseout: false,
        description:
          'Subtasks/checklists require dedicated schema support before activation.',
      },
      {
        key: 'task.approvals',
        status: 'PENDING_CROSS_MODULE',
        risk: 'HIGH',
        requiredForCloseout: false,
        description:
          'Task approvals should integrate with the future Central Approval Workflow module.',
      },
      {
        key: 'task.documents',
        status: 'PENDING_CROSS_MODULE',
        risk: 'HIGH',
        requiredForCloseout: false,
        description:
          'Task-document linkage should be introduced through a formal schema bridge.',
      },
    ];
  }

  static getSummary() {
    const capabilities = this.getCapabilities();

    return {
      module: 'task',
      generatedAt: new Date(),
      status: 'MAJOR_FOUNDATION_ACTIVE_WITH_RESERVED_ENTERPRISE_EXTENSIONS',
      active: capabilities.filter((item) => item.status === 'ACTIVE').length,
      reserved: capabilities.filter((item) => item.status === 'RESERVED').length,
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

export default TaskCapabilityService;