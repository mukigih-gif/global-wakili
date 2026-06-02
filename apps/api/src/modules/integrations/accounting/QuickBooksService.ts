/**
 * QuickBooksService.ts
 *
 * QuickBooks Online integration via Intuit OAuth 2.0 and REST API.
 *
 * Charter flow (MASTER_EXECUTION_CHARTER.md WIP-006):
 *   Invoice → Posting Queue → OAuth Validation → Synchronisation → Audit Event
 *
 * Required env vars:
 *   QB_CLIENT_ID      — Intuit app client ID
 *   QB_CLIENT_SECRET  — Intuit app client secret
 *   QB_ENV            — 'sandbox' | 'production' (default: sandbox)
 *
 * Per-tenant storage (in Tenant.settings.quickbooks):
 *   accessToken, refreshToken, realmId (company ID)
 *
 * Sync policy: Global Wakili is master of record. QBO is slave.
 *
 * WIP-006 — Gap 014.
 */

import { default as axios } from 'axios';

const QB_SANDBOX    = 'https://sandbox-quickbooks.api.intuit.com';
const QB_PRODUCTION = 'https://quickbooks.api.intuit.com';
const QB_TOKEN_URL  = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const QB_AUTH_URL   = 'https://appcenter.intuit.com/connect/oauth2';

function getBaseUrl(): string {
  return process.env.QB_ENV === 'production' ? QB_PRODUCTION : QB_SANDBOX;
}

function isConfigured(): boolean {
  return Boolean(process.env.QB_CLIENT_ID?.trim() && process.env.QB_CLIENT_SECRET?.trim());
}

type QBTokens = {
  accessToken: string;
  refreshToken: string;
  realmId: string;
};

type QBSyncResult = {
  success: boolean;
  qbId?: string | null;
  simulated: boolean;
  error?: string | null;
};

export class QuickBooksService {
  static getAuthorizationUrl(params: { redirectUri: string; state: string }): string {
    const query = new URLSearchParams({
      client_id: process.env.QB_CLIENT_ID ?? '',
      response_type: 'code',
      scope: 'com.intuit.quickbooks.accounting',
      redirect_uri: params.redirectUri,
      state: params.state,
    });
    return `${QB_AUTH_URL}?${query.toString()}`;
  }

  static async exchangeCode(
    code: string,
    realmId: string,
    redirectUri: string,
  ): Promise<QBTokens> {
    if (!isConfigured()) {
      return { accessToken: 'qb_access_placeholder', refreshToken: 'qb_refresh_placeholder', realmId };
    }

    const credentials = Buffer.from(`${process.env.QB_CLIENT_ID}:${process.env.QB_CLIENT_SECRET}`).toString('base64');
    const response = await axios.post(
      QB_TOKEN_URL,
      new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
      { headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15_000 },
    );
    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      realmId,
    };
  }

  static async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const credentials = Buffer.from(`${process.env.QB_CLIENT_ID}:${process.env.QB_CLIENT_SECRET}`).toString('base64');
    const response = await axios.post(
      QB_TOKEN_URL,
      new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
      { headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15_000 },
    );
    return { accessToken: response.data.access_token, refreshToken: response.data.refresh_token };
  }

  /**
   * Syncs a Global Wakili invoice to QuickBooks Online.
   * Charter flow: Invoice → Posting Queue → OAuth Validation → Sync → Audit Event
   */
  static async syncInvoice(
    tokens: QBTokens,
    invoice: {
      invoiceNumber: string;
      customerName: string;
      amount: number;
      currency: string;
      dueDate?: Date | null;
      lines: Array<{ description: string; amount: number }>;
    },
  ): Promise<QBSyncResult> {
    if (!isConfigured() || tokens.accessToken.includes('placeholder')) {
      console.info('[QB] Simulation mode — invoice sync', { invoiceNumber: invoice.invoiceNumber });
      return { success: true, qbId: `qb-inv-${Date.now()}`, simulated: true };
    }

    try {
      const body = {
        Line: invoice.lines.map((line, i) => ({
          Id: String(i + 1),
          Amount: line.amount,
          DetailType: 'SalesItemLineDetail',
          SalesItemLineDetail: { ItemRef: { value: '1', name: 'Services' } },
          Description: line.description,
        })),
        CustomerRef: { name: invoice.customerName },
        DueDate: invoice.dueDate?.toISOString().slice(0, 10),
        DocNumber: invoice.invoiceNumber,
        CurrencyRef: { value: invoice.currency },
      };

      const response = await axios.post(
        `${getBaseUrl()}/v3/company/${tokens.realmId}/invoice`,
        body,
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          timeout: 20_000,
        },
      );

      const qbId = response.data?.Invoice?.Id ?? null;
      console.info('[QB] Invoice synced', { invoiceNumber: invoice.invoiceNumber, qbId });
      return { success: true, qbId, simulated: false };
    } catch (error: unknown) {
      const msg = axios.isAxiosError(error) ? JSON.stringify(error.response?.data) ?? error.message : String(error);
      console.error('[QB] Invoice sync failed', { invoiceNumber: invoice.invoiceNumber, error: msg });
      return { success: false, error: msg, simulated: false };
    }
  }

  /**
   * Syncs a journal entry to QuickBooks Online.
   */
  static async syncJournalEntry(
    tokens: QBTokens,
    journal: {
      docNumber: string;
      date: Date;
      lines: Array<{ accountName: string; debit?: number; credit?: number; description?: string }>;
    },
  ): Promise<QBSyncResult> {
    if (!isConfigured() || tokens.accessToken.includes('placeholder')) {
      console.info('[QB] Simulation mode — journal sync', { docNumber: journal.docNumber });
      return { success: true, qbId: `qb-je-${Date.now()}`, simulated: true };
    }

    try {
      const body = {
        DocNumber: journal.docNumber,
        TxnDate: journal.date.toISOString().slice(0, 10),
        Line: journal.lines.map((line) => ({
          JournalEntryLineDetail: {
            PostingType: line.debit ? 'Debit' : 'Credit',
            AccountRef: { name: line.accountName },
          },
          Amount: line.debit ?? line.credit ?? 0,
          DetailType: 'JournalEntryLineDetail',
          Description: line.description ?? '',
        })),
      };

      const response = await axios.post(
        `${getBaseUrl()}/v3/company/${tokens.realmId}/journalentry`,
        body,
        {
          headers: { Authorization: `Bearer ${tokens.accessToken}`, 'Content-Type': 'application/json', Accept: 'application/json' },
          timeout: 20_000,
        },
      );

      const qbId = response.data?.JournalEntry?.Id ?? null;
      return { success: true, qbId, simulated: false };
    } catch (error: unknown) {
      const msg = axios.isAxiosError(error) ? JSON.stringify(error.response?.data) ?? error.message : String(error);
      return { success: false, error: msg, simulated: false };
    }
  }
}
