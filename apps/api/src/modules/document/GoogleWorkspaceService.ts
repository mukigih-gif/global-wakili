// apps/api/src/modules/document/GoogleWorkspaceService.ts

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

function assertGoogleConfigured(): void {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw Object.assign(
      new Error('Google Workspace integration is not configured'),
      {
        statusCode: 501,
        code: 'GOOGLE_WORKSPACE_NOT_CONFIGURED',
      },
    );
  }
}

function assertRedirectUri(redirectUri: string): void {
  if (!redirectUri?.trim()) {
    throw Object.assign(new Error('Redirect URI is required'), {
      statusCode: 422,
      code: 'GOOGLE_REDIRECT_URI_REQUIRED',
    });
  }
}

export class GoogleWorkspaceService {
  static getAuthorizationUrl(params: {
    tenantId: string;
    userId: string;
    redirectUri: string;
    state: string;
  }) {
    assertGoogleConfigured();
    assertRedirectUri(params.redirectUri);

    if (!params.tenantId?.trim() || !params.userId?.trim() || !params.state?.trim()) {
      throw Object.assign(new Error('Invalid Google Workspace authorization request'), {
        statusCode: 422,
        code: 'GOOGLE_AUTH_REQUEST_INVALID',
      });
    }

    const base = 'https://accounts.google.com/o/oauth2/v2/auth';
    const query = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
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
    assertGoogleConfigured();
    assertRedirectUri(params.redirectUri);

    if (!params.code?.trim()) {
      throw Object.assign(new Error('Google authorization code is required'), {
        statusCode: 422,
        code: 'GOOGLE_AUTH_CODE_REQUIRED',
      });
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code: params.code,
        redirect_uri: params.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const payload = (await response.json()) as GoogleTokenResponse;

    if (!response.ok || payload.error) {
      throw Object.assign(new Error('Google token exchange failed'), {
        statusCode: 502,
        code: 'GOOGLE_TOKEN_EXCHANGE_FAILED',
        details: {
          status: response.status,
          error: payload.error ?? null,
          errorDescription: payload.error_description ?? null,
        },
      });
    }

    if (!payload.access_token) {
      throw Object.assign(new Error('Google token exchange returned no access token'), {
        statusCode: 502,
        code: 'GOOGLE_ACCESS_TOKEN_MISSING',
      });
    }

    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token ?? null,
      expiresIn: payload.expires_in ?? null,
      tokenType: payload.token_type ?? null,
      scope: payload.scope ?? null,
    };
  }

  static async createEditSession(params: {
    tenantId: string;
    userId: string;
    documentId: string;
    fileUrl: string;
  }) {
    assertGoogleConfigured();

    if (
      !params.tenantId?.trim() ||
      !params.userId?.trim() ||
      !params.documentId?.trim() ||
      !params.fileUrl?.trim()
    ) {
      throw Object.assign(new Error('Invalid Google Workspace edit session request'), {
        statusCode: 422,
        code: 'GOOGLE_EDIT_SESSION_INVALID',
      });
    }

    throw Object.assign(
      new Error('Google Workspace edit session adapter is not yet implemented'),
      {
        statusCode: 501,
        code: 'GOOGLE_EDIT_SESSION_NOT_IMPLEMENTED',
      },
    );
  }
}