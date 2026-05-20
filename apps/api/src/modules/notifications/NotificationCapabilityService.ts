// apps/api/src/modules/notifications/NotificationCapabilityService.ts

type CapabilityStatus =
  | 'ACTIVE'
  | 'PENDING_SCHEMA'
  | 'PENDING_CROSS_MODULE'
  | 'PENDING_PROVIDER'
  | 'PENDING_INTEGRATION';

type CapabilityRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type NotificationCapability = {
  key: string;
  status: CapabilityStatus;
  risk: CapabilityRisk;
  requiredForCloseout: boolean;
  description: string;
  notes?: string[];
};

export class NotificationCapabilityService {
  static getCapabilities(): NotificationCapability[] {
    return [
      {
        key: 'notifications.system_alert',
        status: 'ACTIVE',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'System notifications are delivered first and persisted using Notification.channel SYSTEM_ALERT.',
      },
      {
        key: 'notifications.email',
        status: 'PENDING_PROVIDER',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'Email delivery currently uses a foundation provider adapter and remains pending production provider configuration.',
        notes: [
          'Current adapter returns simulated provider acceptance for development/foundation workflows.',
          'Production SMTP/API credentials and provider-specific delivery confirmation are deferred to Notifications N2C.',
        ],
      },
      {
        key: 'notifications.sms',
        status: 'PENDING_PROVIDER',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'SMS delivery currently uses a foundation provider adapter and remains pending production SMS gateway configuration.',
        notes: [
          'Current adapter returns simulated provider acceptance for development/foundation workflows.',
          'Production SMS gateway credentials and provider-specific delivery confirmation are deferred to Notifications N2C.',
        ],
      },
      {
        key: 'notifications.delivery_order',
        status: 'ACTIVE',
        risk: 'CRITICAL',
        requiredForCloseout: true,
        description:
          'Delivery channel order is enforced as SYSTEM_ALERT, then EMAIL, then SMS.',
      },
      {
        key: 'notifications.dashboard',
        status: 'ACTIVE',
        risk: 'MEDIUM',
        requiredForCloseout: true,
        description:
          'Dashboard summarizes delivery volume, channel split, failures, retries, and recent notifications.',
      },
      {
        key: 'notifications.reports',
        status: 'ACTIVE',
        risk: 'MEDIUM',
        requiredForCloseout: true,
        description:
          'Report service supports notification search and delivery analytics.',
      },
      {
        key: 'notifications.provider_webhooks',
        status: 'PENDING_PROVIDER',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'Provider webhook status updates are tenant-scoped, but provider-specific authentication/signature verification remains pending production provider configuration.',
        notes: [
          'Tenant-scoped callback lookup is active after Notifications N1.',
          'Provider-specific webhook secrets/signature verification are deferred to Notifications N2C.',
        ],
      },
      {
        key: 'notifications.preferences',
        status: 'PENDING_INTEGRATION',
        risk: 'MEDIUM',
        requiredForCloseout: false,
        description:
          'NotificationPreference schema is present after Notifications N2B; runtime preference filtering still needs N2C integration while preserving User.emailNotifications and User.smsNotifications as safe fallback.',
        notes: [
          'N2B added the NotificationPreference persistence model.',
          'N2C must wire read/write behavior without breaking existing user-level notification flags.',
        ],
      },
      {
        key: 'notifications.templates',
        status: 'PENDING_INTEGRATION',
        risk: 'MEDIUM',
        requiredForCloseout: false,
        description:
          'NotificationTemplate schema is present after Notifications N2B; runtime template loading still uses the code registry/request payload path until N2C integration is completed.',
        notes: [
          'N2B added the NotificationTemplate persistence model.',
          'N2C must preserve the static registry as fallback while introducing tenant/system template persistence.',
        ],
      },
      {
        key: 'notifications.worker_processor',
        status: 'PENDING_CROSS_MODULE',
        risk: 'HIGH',
        requiredForCloseout: false,
        description:
          'Queue worker/processor finalization should happen during Queues module buildout.',
      },
      {
        key: 'notifications.push_whatsapp',
        status: 'PENDING_PROVIDER',
        risk: 'LOW',
        requiredForCloseout: false,
        description:
          'Push/WhatsApp are not activated until provider and schema strategy are finalized.',
      },
    ];
  }

  static getSummary() {
    const capabilities = this.getCapabilities();

    return {
      module: 'notifications',
      generatedAt: new Date(),
      status: 'N2B_SCHEMA_AVAILABLE_PROVIDER_AND_WORKER_PENDING',
      deliveryOrder: ['SYSTEM_ALERT', 'EMAIL', 'SMS'],
      providerMode: {
        systemAlert: 'LOCAL_SYSTEM_RECORD',
        email: 'SIMULATED_PROVIDER_PENDING_PRODUCTION_CONFIGURATION',
        sms: 'SIMULATED_PROVIDER_PENDING_PRODUCTION_CONFIGURATION',
      },
      workerMode: 'ENQUEUE_ONLY_PENDING_NOTIFICATION_WORKER',
      active: capabilities.filter((item) => item.status === 'ACTIVE').length,
      pendingSchema: capabilities.filter((item) => item.status === 'PENDING_SCHEMA').length,
      pendingCrossModule: capabilities.filter((item) => item.status === 'PENDING_CROSS_MODULE')
        .length,
      pendingProvider: capabilities.filter((item) => item.status === 'PENDING_PROVIDER').length,
      pendingIntegration: capabilities.filter((item) => item.status === 'PENDING_INTEGRATION').length,
      requiredForCloseoutRemaining: capabilities.filter(
        (item) => item.requiredForCloseout && item.status !== 'ACTIVE',
      ),
      capabilities,
    };
  }
}

export default NotificationCapabilityService;
