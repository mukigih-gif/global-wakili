// apps/api/src/modules/document/Office365IntegrationService.ts

type MicrosoftTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

function assertOffice365Configured(): void {
  if (!process.env.MS365_CLIENT_ID || !process.env.MS365_CLIENT_SECRET) {
    throw Object.assign(
      new Error('Office 365 integration is not configured'),
      {
        statusCode: 501,
        code: 'OFFICE365_NOT_CONFIGURED',
      },
    );
  }
}

function assertRedirectUri(redirectUri: string): void {
  if (!redirectUri?.trim()) {
    throw Object.assign(new Error('Redirect URI is required'), {
      statusCode: 422,
      code: 'OFFICE365_REDIRECT_URI_REQUIRED',
    });
  }
}

export class Office365IntegrationService {
  static getAuthorizationUrl(params: {
    tenantId: string;
    userId: string;
    redirectUri: string;
    state: string;
  }) {
    assertOffice365Configured();
    assertRedirectUri(params.redirectUri);

    if (!params.tenantId?.trim() || !params.userId?.trim() || !params.state?.trim()) {
      throw Object.assign(new Error('Invalid Office 365 authorization request'), {
        statusCode: 422,
        code: 'OFFICE365_AUTH_REQUEST_INVALID',
      });
    }

    const base = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
    const query = new URLSearchParams({
      client_id: process.env.MS365_CLIENT_ID!,
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
    assertOffice365Configured();
    assertRedirectUri(params.redirectUri);

    if (!params.code?.trim()) {
      throw Object.assign(new Error('Office 365 authorization code is required'), {
        statusCode: 422,
        code: 'OFFICE365_AUTH_CODE_REQUIRED',
      });
    }

    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.MS365_CLIENT_ID!,
        client_secret: process.env.MS365_CLIENT_SECRET!,
        code: params.code,
        redirect_uri: params.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const payload = (await response.json()) as MicrosoftTokenResponse;

    if (!response.ok || payload.error) {
      throw Object.assign(new Error('Office 365 token exchange failed'), {
        statusCode: 502,
        code: 'OFFICE365_TOKEN_EXCHANGE_FAILED',
        details: {
          status: response.status,
          error: payload.error ?? null,
          errorDescription: payload.error_description ?? null,
        },
      });
    }

    if (!payload.access_token) {
      throw Object.assign(new Error('Office 365 token exchange returned no access token'), {
        statusCode: 502,
        code: 'OFFICE365_ACCESS_TOKEN_MISSING',
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
    assertOffice365Configured();

    if (
      !params.tenantId?.trim() ||
      !params.userId?.trim() ||
      !params.documentId?.trim() ||
      !params.fileUrl?.trim()
    ) {
      throw Object.assign(new Error('Invalid Office 365 edit session request'), {
        statusCode: 422,
        code: 'OFFICE365_EDIT_SESSION_INVALID',
      });
    }

    throw Object.assign(
      new Error('Office 365 WOPI/edit session adapter is not yet implemented'),
      {
        statusCode: 501,
        code: 'OFFICE365_EDIT_SESSION_NOT_IMPLEMENTED',
      },
    );
  }
}