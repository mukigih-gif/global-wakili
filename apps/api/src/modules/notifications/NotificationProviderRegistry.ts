// apps/api/src/modules/notifications/NotificationProviderRegistry.ts

import { EmailService } from './providers/EmailService';
import { SMSService } from './providers/SMSService';
import { PushService } from './providers/PushService';
import type { NotificationChannel } from './notification.types';

export class NotificationProviderRegistry {
  private static readonly DELIVERY_ORDER: NotificationChannel[] = [
    'SYSTEM_ALERT',
    'EMAIL',
    'SMS',
    'PUSH',
  ];

  static getDeliveryOrder(): NotificationChannel[] {
    return [...this.DELIVERY_ORDER];
  }

  static sortChannelsByDeliveryOrder(channels: NotificationChannel[]): NotificationChannel[] {
    const requested = new Set(channels);
    return this.DELIVERY_ORDER.filter((channel) => requested.has(channel));
  }

  static isSupported(channel: string): channel is NotificationChannel {
    return this.DELIVERY_ORDER.includes(channel as NotificationChannel);
  }

  static getProviderName(channel: NotificationChannel): string {
    switch (channel) {
      case 'SYSTEM_ALERT': return 'system';
      case 'EMAIL':        return 'smtp';
      case 'SMS':          return 'sms_gateway';
      case 'PUSH':         return 'fcm';
      default:
        throw Object.assign(new Error(`Unsupported notification channel: ${channel}`), {
          statusCode: 422,
          code: 'NOTIFICATION_CHANNEL_UNSUPPORTED',
        });
    }
  }

  static getEmailService() { return EmailService; }
  static getSmsService()   { return SMSService; }
  static getPushService()  { return PushService; }
}

export default NotificationProviderRegistry;
