/**
 * ExternalSyncService.ts
 *
 * Microsoft Graph and Google Workspace OAuth token exchange and calendar sync.
 *
 * Required env vars:
 *   Google: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 *   Microsoft: MS365_CLIENT_ID, MS365_CLIENT_SECRET, MS365_TENANT_ID (or 'common')
 *
 * Tokens are returned to the caller for encrypted storage.
 * Callers must store access_token + refresh_token encrypted in the DB.
 *
 * WIP-006 — Gap 012, Gap 013.
 */

import { default as axios } from 'axios';

type OAuthTokenResult = {
  provider: 'GOOGLE' | 'OUTLOOK';
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  scope?: string;
  simulated: boolean;
};

type CalendarEvent = {
  externalId: string;
  title: string;
  start: Date;
  end: Date;
  description?: string | null;
  location?: string | null;
  attendees?: string[];
};

// ── Google ────────────────────────────────────────────────────────────────────

async function exchangeGoogleCodeReal(code: string, redirectUri: string): Promise<OAuthTokenResult> {
  const response = await axios.post(
    'https://oauth2.googleapis.com/token',
    new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15_000 },
  );

  const data = response.data;
  return {
    provider: 'GOOGLE',
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in ?? 3600,
    scope: data.scope,
    simulated: false,
  };
}

async function refreshGoogleToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const response = await axios.post(
    'https://oauth2.googleapis.com/token',
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      grant_type: 'refresh_token',
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15_000 },
  );
  return { accessToken: response.data.access_token, expiresIn: response.data.expires_in ?? 3600 };
}

async function fetchGoogleCalendarEvents(
  accessToken: string,
  params: { calendarId?: string; from?: Date; to?: Date },
): Promise<CalendarEvent[]> {
  const calendarId = encodeURIComponent(params.calendarId ?? 'primary');
  const query: Record<string, string> = { singleEvents: 'true', orderBy: 'startTime' };
  if (params.from) query.timeMin = params.from.toISOString();
  if (params.to) query.timeMax = params.to.toISOString();

  const response = await axios.get(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
    { headers: { Authorization: `Bearer ${accessToken}` }, params: query, timeout: 15_000 },
  );

  return (response.data.items ?? []).map((item: any): CalendarEvent => ({
    externalId: item.id,
    title: item.summary ?? 'Untitled',
    start: new Date(item.start?.dateTime ?? item.start?.date),
    end: new Date(item.end?.dateTime ?? item.end?.date),
    description: item.description ?? null,
    location: item.location ?? null,
    attendees: (item.attendees ?? []).map((a: any) => a.email).filter(Boolean),
  }));
}

// ── Microsoft Graph ───────────────────────────────────────────────────────────

function getMsTenantId(): string {
  return process.env.MS365_TENANT_ID?.trim() || 'common';
}

async function exchangeOutlookCodeReal(code: string, redirectUri: string): Promise<OAuthTokenResult> {
  const tenantId = getMsTenantId();
  const response = await axios.post(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    new URLSearchParams({
      code,
      client_id: process.env.MS365_CLIENT_ID ?? '',
      client_secret: process.env.MS365_CLIENT_SECRET ?? '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      scope: 'offline_access Calendars.ReadWrite User.Read',
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15_000 },
  );

  const data = response.data;
  return {
    provider: 'OUTLOOK',
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in ?? 3600,
    scope: data.scope,
    simulated: false,
  };
}

async function refreshOutlookToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const tenantId = getMsTenantId();
  const response = await axios.post(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.MS365_CLIENT_ID ?? '',
      client_secret: process.env.MS365_CLIENT_SECRET ?? '',
      grant_type: 'refresh_token',
      scope: 'offline_access Calendars.ReadWrite User.Read',
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15_000 },
  );
  return { accessToken: response.data.access_token, expiresIn: response.data.expires_in ?? 3600 };
}

async function fetchOutlookCalendarEvents(
  accessToken: string,
  params: { from?: Date; to?: Date },
): Promise<CalendarEvent[]> {
  const filter: string[] = [];
  if (params.from) filter.push(`start/dateTime ge '${params.from.toISOString()}'`);
  if (params.to)   filter.push(`end/dateTime le '${params.to.toISOString()}'`);

  const url = filter.length
    ? `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${params.from?.toISOString() ?? new Date().toISOString()}&endDateTime=${params.to?.toISOString() ?? new Date(Date.now() + 30 * 86400000).toISOString()}`
    : 'https://graph.microsoft.com/v1.0/me/events?$top=50&$orderby=start/dateTime';

  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    timeout: 15_000,
  });

  return (response.data.value ?? []).map((item: any): CalendarEvent => ({
    externalId: item.id,
    title: item.subject ?? 'Untitled',
    start: new Date(item.start?.dateTime),
    end: new Date(item.end?.dateTime),
    description: item.body?.content ?? null,
    location: item.location?.displayName ?? null,
    attendees: (item.attendees ?? []).map((a: any) => a.emailAddress?.address).filter(Boolean),
  }));
}

// ── Service ───────────────────────────────────────────────────────────────────

export class ExternalSyncService {
  static getGoogleAuthorizationUrl(params: { redirectUri: string; state: string }) {
    const base = 'https://accounts.google.com/o/oauth2/v2/auth';
    const query = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      response_type: 'code',
      redirect_uri: params.redirectUri,
      scope: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/gmail.readonly',
      ].join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: params.state,
    });
    return `${base}?${query.toString()}`;
  }

  static getOutlookAuthorizationUrl(params: { redirectUri: string; state: string }) {
    const tenantId = getMsTenantId();
    const base = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`;
    const query = new URLSearchParams({
      client_id: process.env.MS365_CLIENT_ID ?? '',
      response_type: 'code',
      redirect_uri: params.redirectUri,
      response_mode: 'query',
      scope: 'offline_access Calendars.ReadWrite User.Read Mail.Read',
      state: params.state,
    });
    return `${base}?${query.toString()}`;
  }

  static async exchangeGoogleCode(params: { code: string; redirectUri: string }): Promise<OAuthTokenResult> {
    if (!process.env.GOOGLE_CLIENT_SECRET?.trim()) {
      console.info('[GOOGLE] Simulation mode — GOOGLE_CLIENT_SECRET not configured');
      return {
        provider: 'GOOGLE',
        accessToken: 'google_access_token_placeholder',
        refreshToken: 'google_refresh_token_placeholder',
        expiresIn: 3600,
        simulated: true,
      };
    }
    return exchangeGoogleCodeReal(params.code, params.redirectUri);
  }

  static async exchangeOutlookCode(params: { code: string; redirectUri: string }): Promise<OAuthTokenResult> {
    if (!process.env.MS365_CLIENT_SECRET?.trim()) {
      console.info('[OUTLOOK] Simulation mode — MS365_CLIENT_SECRET not configured');
      return {
        provider: 'OUTLOOK',
        accessToken: 'outlook_access_token_placeholder',
        refreshToken: 'outlook_refresh_token_placeholder',
        expiresIn: 3600,
        simulated: true,
      };
    }
    return exchangeOutlookCodeReal(params.code, params.redirectUri);
  }

  static async refreshGoogleToken(refreshToken: string) {
    return refreshGoogleToken(refreshToken);
  }

  static async refreshOutlookToken(refreshToken: string) {
    return refreshOutlookToken(refreshToken);
  }

  static async fetchGoogleCalendarEvents(
    accessToken: string,
    params: { calendarId?: string; from?: Date; to?: Date },
  ): Promise<CalendarEvent[]> {
    if (accessToken.includes('placeholder')) return [];
    return fetchGoogleCalendarEvents(accessToken, params);
  }

  static async fetchOutlookCalendarEvents(
    accessToken: string,
    params: { from?: Date; to?: Date },
  ): Promise<CalendarEvent[]> {
    if (accessToken.includes('placeholder')) return [];
    return fetchOutlookCalendarEvents(accessToken, params);
  }
}
