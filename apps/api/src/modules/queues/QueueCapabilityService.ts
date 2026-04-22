// apps/api/src/modules/queues/QueueCapabilityService.ts

type CapabilityStatus =
  | 'ACTIVE'
  | 'PENDING_WORKER'
  | 'PENDING_PLATFORM'
  | 'PENDING_PROVIDER';

type CapabilityRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type QueueCapability = {
  key: string;
  status: CapabilityStatus;
  risk: CapabilityRisk;
  requiredForCloseout: boolean;
  description: string;
  notes?: string[];
};

export class QueueCapabilityService {
  static getCapabilities(): QueueCapability[] {
    return [
      {
        key: 'queues.external_job_registry',
        status: 'ACTIVE',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'ExternalJobQueue persistence is active for ETIMS, BANKING, GOAML, NOTIFICATIONS, OUTLOOK, and GOOGLE jobs.',
      },
      {
        key: 'queues.integration_queue_adapter',
        status: 'ACTIVE',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'Integration jobs can be dispatched through the existing getIntegrationQueue adapter.',
      },
      {
        key: 'queues.reminder_queue_adapter',
        status: 'ACTIVE',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'Reminder jobs can continue using the existing getReminderQueue adapter.',
      },
      {
        key: 'queues.tenant_aware_payloads',
        status: 'ACTIVE',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'Tenant-scoped queue persistence validates tenant ownership before job creation.',
      },
      {
        key: 'queues.retry_dead_letter',
        status: 'ACTIVE',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'Retry and dead-letter transitions are persisted through ExternalJobQueue status, attempts, lastError, and nextRetryAt.',
      },
      {
        key: 'queues.dashboard_reports',
        status: 'ACTIVE',
        risk: 'MEDIUM',
        requiredForCloseout: true,
        description:
          'Operational dashboard and reports expose queue health, failed jobs, retries, and provider breakdown.',
      },
      {
        key: 'queues.worker_processors',
        status: 'PENDING_WORKER',
        risk: 'HIGH',
        requiredForCloseout: false,
        description:
          'Dedicated workers/processors will be added later under a clean workers/ structure, not the old jobs/ folder.',
      },
      {
        key: 'queues.platform_admin_visibility',
        status: 'PENDING_PLATFORM',
        risk: 'HIGH',
        requiredForCloseout: false,
        description:
          'Platform/SaaS admin queue observability will be connected when Platform control plane is built.',
      },
      {
        key: 'queues.provider_failover',
        status: 'PENDING_PROVIDER',
        risk: 'MEDIUM',
        requiredForCloseout: false,
        description:
          'Provider-specific failover needs finalized provider configuration strategy.',
      },
    ];
  }

  static getSummary() {
    const capabilities = this.getCapabilities();

    return {
      module: 'queues',
      generatedAt: new Date(),
      status: 'ENTERPRISE_QUEUE_CONTROL_ACTIVE_WITH_WORKERS_RESERVED',
      active: capabilities.filter((item) => item.status === 'ACTIVE').length,
      pendingWorker: capabilities.filter((item) => item.status === 'PENDING_WORKER').length,
      pendingPlatform: capabilities.filter((item) => item.status === 'PENDING_PLATFORM').length,
      pendingProvider: capabilities.filter((item) => item.status === 'PENDING_PROVIDER').length,
      requiredForCloseoutRemaining: capabilities.filter(
        (item) => item.requiredForCloseout && item.status !== 'ACTIVE',
      ),
      capabilities,
    };
  }
}

export default QueueCapabilityService;