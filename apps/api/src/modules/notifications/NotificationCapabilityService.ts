// apps/api/src/modules/notifications/NotificationCapabilityService.ts

type CapabilityStatus =
  | 'ACTIVE'
  | 'PENDING_SCHEMA'
  | 'PENDING_CROSS_MODULE'
  | 'PENDING_PROVIDER';

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
        status: 'ACTIVE',
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
        status: 'ACTIVE',
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
        status: 'ACTIVE',
        risk: 'HIGH',
        requiredForCloseout: true,
        description:
          'Provider webhook status updates can update Notification delivery state.',
      },
      {
        key: 'notifications.preferences',
        status: 'PENDING_SCHEMA',
        risk: 'MEDIUM',
        requiredForCloseout: false,
        description:
          'No NotificationPreference model exists; current filtering uses User.emailNotifications and User.smsNotifications.',
      },
      {
        key: 'notifications.templates',
        status: 'PENDING_SCHEMA',
        risk: 'MEDIUM',
        requiredForCloseout: false,
        description:
          'No NotificationTemplate model exists; current templates are code registry / request payload based.',
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
      status: 'FOUNDATION_DELIVERY_ORCHESTRATION_ACTIVE_PROVIDER_AND_WORKER_PENDING',
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
      requiredForCloseoutRemaining: capabilities.filter(
        (item) => item.requiredForCloseout && item.status !== 'ACTIVE',
      ),
      capabilities,
    };
  }
}

export default NotificationCapabilityService;
