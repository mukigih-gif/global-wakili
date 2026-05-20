import type { NotificationDbClient } from '../notification.types';

type NotificationChannel = 'email' | 'sms' | 'portal';

type NotificationCategory =
  | 'system_alert'
  | 'trust'
  | 'billing'
  | 'payment'
  | 'procurement'
  | 'payroll'
  | 'hr'
  | 'client'
  | 'matter_update'
  | 'task'
  | 'calendar'
  | 'court'
  | 'reception'
  | 'compliance'
  | 'approval'
  | 'reporting'
  | 'platform';

type NotificationPreference = {
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  portalEnabled?: boolean;
  quietHoursStart?: number | null;
  quietHoursEnd?: number | null;
  blockedCategories?: NotificationCategory[];
  criticalBypass?: boolean;
};


type SchemaPreferenceChannel = 'EMAIL' | 'SMS' | 'IN_APP';

type NotificationPreferenceRow = {
  channel?: SchemaPreferenceChannel | string | null;
  category?: string | null;
  enabled?: boolean | null;
  quietHoursStart?: number | null;
  quietHoursEnd?: number | null;
  criticalBypass?: boolean | null;
  metadata?: Record<string, unknown> | null;
};

function normalizeLegacyPreference(value: unknown): NotificationPreference {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as NotificationPreference;
}


function mergePreferenceRows(
  base: NotificationPreference,
  rows: NotificationPreferenceRow[],
): NotificationPreference {
  const merged: NotificationPreference = { ...base };
  const blockedCategories = new Set<NotificationCategory>(base.blockedCategories ?? []);

  for (const row of rows) {
    if (typeof row.quietHoursStart === 'number') {
      merged.quietHoursStart = row.quietHoursStart;
    }

    if (typeof row.quietHoursEnd === 'number') {
      merged.quietHoursEnd = row.quietHoursEnd;
    }

    if (typeof row.criticalBypass === 'boolean') {
      merged.criticalBypass = row.criticalBypass;
    }

    const metadataBlocked = Array.isArray(row.metadata?.blockedCategories)
      ? row.metadata.blockedCategories
      : [];

    for (const item of metadataBlocked) {
      if (typeof item === 'string') {
        blockedCategories.add(item as NotificationCategory);
      }
    }

    if (row.enabled === undefined || row.enabled === null) {
      continue;
    }

    if (row.channel === 'EMAIL') {
      merged.emailEnabled = row.enabled;
    }

    if (row.channel === 'SMS') {
      merged.smsEnabled = row.enabled;
    }

    if (row.channel === 'IN_APP') {
      merged.portalEnabled = row.enabled;
    }
  }

  if (blockedCategories.size > 0) {
    merged.blockedCategories = Array.from(blockedCategories);
  }

  return merged;
}
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
  static async getUserPreferences(
    db: NotificationDbClient,
    userId: string,
    tenantId?: string | null,
    category?: NotificationCategory | string | null,
  ): Promise<NotificationPreference> {
    const user = await db.user.findFirst({
      where: { id: userId },
      select: {
        notificationPreferences: true,
      },
    });

    const legacyPreferences = normalizeLegacyPreference(user?.notificationPreferences);

    if (!tenantId?.trim()) {
      return legacyPreferences;
    }

    const schemaRows = (await db.notificationPreference.findMany({
      where: {
        tenantId: tenantId.trim(),
        scope: 'USER',
        scopeId: userId,
        OR: [
          { category: 'all' },
          ...(category ? [{ category: String(category) }] : []),
        ],
      },
    })) as NotificationPreferenceRow[];

    if (!schemaRows.length) {
      return legacyPreferences;
    }

    return mergePreferenceRows(legacyPreferences, schemaRows);
  }

  static async filterAllowedChannels(
    db: NotificationDbClient,
    params: {
      tenantId?: string | null;
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

    const preferences = await this.getUserPreferences(db, params.userId, params.tenantId ?? null, params.category);
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
