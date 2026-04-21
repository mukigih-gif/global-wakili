import type { NotificationChannel, NotificationCategory } from './NotificationService';

type NotificationPreference = {
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  portalEnabled?: boolean;
  quietHoursStart?: number | null;
  quietHoursEnd?: number | null;
  blockedCategories?: NotificationCategory[];
  criticalBypass?: boolean;
};

function isWithinQuietHours(
  hour: number,
  start?: number | null,
  end?: number | null,
): boolean {
  if (start === null || start === undefined || end === null || end === undefined) {
    return false;
  }

  if (start === end) {
    return true;
  }

  if (start < end) {
    return hour >= start && hour < end;
  }

  return hour >= start || hour < end;
}

export class NotificationPreferenceService {
  static async getUserPreferences(db: any, userId: string): Promise<NotificationPreference> {
    const user = await db.user.findFirst({
      where: { id: userId },
      select: {
        notificationPreferences: true,
      },
    });

    return (user?.notificationPreferences ?? {}) as NotificationPreference;
  }

  static async filterAllowedChannels(
    db: any,
    params: {
      userId?: string | null;
      channels: NotificationChannel[];
      category: NotificationCategory;
      priority: 'low' | 'normal' | 'high' | 'critical';
      now?: Date;
    },
  ): Promise<NotificationChannel[]> {
    if (!params.userId) {
      return params.channels;
    }

    const preferences = await this.getUserPreferences(db, params.userId);
    const now = params.now ?? new Date();
    const currentHour = now.getHours();

    const categoryBlocked = preferences.blockedCategories?.includes(params.category);

    if (categoryBlocked && !(preferences.criticalBypass && params.priority === 'critical')) {
      return [];
    }

    const quiet = isWithinQuietHours(
      currentHour,
      preferences.quietHoursStart,
      preferences.quietHoursEnd,
    );

    return params.channels.filter((channel) => {
      if (quiet && params.priority !== 'critical') {
        if (channel === 'sms') return false;
      }

      if (channel === 'email' && preferences.emailEnabled === false) return false;
      if (channel === 'sms' && preferences.smsEnabled === false) return false;
      if (channel === 'portal' && preferences.portalEnabled === false) return false;

      return true;
    });
  }
}