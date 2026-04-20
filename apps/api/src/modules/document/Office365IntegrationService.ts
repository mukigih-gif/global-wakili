export class Office365IntegrationService {
  static getAuthorizationUrl(params: {
    tenantId: string;
    userId: string;
    redirectUri: string;
    state: string;
  }) {
    const base = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
    const query = new URLSearchParams({
      client_id: process.env.MS365_CLIENT_ID ?? '',
      response_type: 'code',
      redirect_uri: params.redirectUri,
      response_mode: 'query',
      scope: 'offline_access Files.ReadWrite User.Read',
      state: params.state,
    });

    return `${base}?${query.toString()}`;
  }

  static async exchangeCodeForTokens(params: {
    code: string;
    redirectUri: string;
  }) {
    // Placeholder only. Replace with real token exchange.
    return {
      accessToken: 'ms365_access_token_placeholder',
      refreshToken: 'ms365_refresh_token_placeholder',
      expiresIn: 3600,
      redirectUri: params.redirectUri,
      codeUsed: Boolean(params.code),
    };
  }

  static async createEditSession(params: {
    tenantId: string;
    userId: string;
    documentId: string;
    fileUrl: string;
  }) {
    // In future, implement WOPI/session creation.
    return {
      provider: 'OFFICE365',
      documentId: params.documentId,
      mode: 'EDIT',
      launchUrl: params.fileUrl,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };
  }
}