export class GoogleWorkspaceService {
  static getAuthorizationUrl(params: {
    tenantId: string;
    userId: string;
    redirectUri: string;
    state: string;
  }) {
    const base = 'https://accounts.google.com/o/oauth2/v2/auth';
    const query = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      response_type: 'code',
      redirect_uri: params.redirectUri,
      scope: 'openid email profile https://www.googleapis.com/auth/drive.file',
      access_type: 'offline',
      prompt: 'consent',
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
      accessToken: 'google_access_token_placeholder',
      refreshToken: 'google_refresh_token_placeholder',
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
    return {
      provider: 'GOOGLE_WORKSPACE',
      documentId: params.documentId,
      mode: 'EDIT',
      launchUrl: params.fileUrl,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };
  }
}