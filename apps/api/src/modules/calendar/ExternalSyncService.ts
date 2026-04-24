export class ExternalSyncService {
  static getGoogleAuthorizationUrl(params: {
    redirectUri: string;
    state: string;
  }) {
    const base = 'https://accounts.google.com/o/oauth2/v2/auth';
    const query = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      response_type: 'code',
      redirect_uri: params.redirectUri,
      scope: 'openid email profile https://www.googleapis.com/auth/calendar',
      access_type: 'offline',
      prompt: 'consent',
      state: params.state,
    });

    return `${base}?${query.toString()}`;
  }

  static getOutlookAuthorizationUrl(params: {
    redirectUri: string;
    state: string;
  }) {
    const base = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
    const query = new URLSearchParams({
      client_id: process.env.MS365_CLIENT_ID ?? '',
      response_type: 'code',
      redirect_uri: params.redirectUri,
      response_mode: 'query',
      scope: 'offline_access Calendars.ReadWrite User.Read',
      state: params.state,
    });

    return `${base}?${query.toString()}`;
  }

  static async exchangeGoogleCode(params: {
    code: string;
    redirectUri: string;
  }) {
    return {
      provider: 'GOOGLE',
      accessToken: 'google_calendar_access_token_placeholder',
      refreshToken: 'google_calendar_refresh_token_placeholder',
      expiresIn: 3600,
      redirectUri: params.redirectUri,
      codeUsed: Boolean(params.code),
    };
  }

  static async exchangeOutlookCode(params: {
    code: string;
    redirectUri: string;
  }) {
    return {
      provider: 'OUTLOOK',
      accessToken: 'outlook_calendar_access_token_placeholder',
      refreshToken: 'outlook_calendar_refresh_token_placeholder',
      expiresIn: 3600,
      redirectUri: params.redirectUri,
      codeUsed: Boolean(params.code),
    };
  }
}