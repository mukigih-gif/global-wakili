/**
 * ZohoService.ts
 *
 * Zoho Books integration via Zoho OAuth 2.0 and REST API.
 *
 * Charter flow (MASTER_EXECUTION_CHARTER.md WIP-006):
 *   Invoice → Journal Aggregation → Synchronisation → Audit Event
 *
 * Required env vars:
 *   ZOHO_CLIENT_ID      — Zoho app client ID
 *   ZOHO_CLIENT_SECRET  — Zoho app client secret
 *   ZOHO_REGION         — 'com' | 'eu' | 'in' | 'com.au' (default: com)
 *
 * Per-tenant storage (in Tenant.settings.zoho):
 *   accessToken, refreshToken, organizationId
 *
 * WIP-006 — Gap 015.
 */

import { default as axios } from 'axios';

function getRegion(): string {
  return process.env.ZOHO_REGION?.trim() || 'com';
}

function getAccountsUrl(): string {
  return `https://accounts.zoho.${getRegion()}`;
}

function getBooksUrl(organizationId: string): string {
  return `https://books.zoho.${getRegion()}/api/v3?organization_id=${organizationId}`;
}

function isConfigured(): boolean {
  return Boolean(process.env.ZOHO_CLIENT_ID?.trim() && process.env.ZOHO_CLIENT_SECRET?.trim());
}

type ZohoTokens = {
  accessToken: string;
  refreshToken: string;
  organizationId: string;
};

type ZohoSyncResult = {
  success: boolean;
  zohoId?: string | null;
  simulated: boolean;
  error?: string | null;
};

export class ZohoService {
  static getAuthorizationUrl(params: { redirectUri: string; state: string }): string {
    const query = new URLSearchParams({
      client_id: process.env.ZOHO_CLIENT_ID ?? '',
      response_type: 'code',
      scope: 'ZohoBooks.fullaccess.all',
      redirect_uri: params.redirectUri,
      access_type: 'offline',
      state: params.state,
    });
    return `${getAccountsUrl()}/oauth/v2/auth?${query.toString()}`;
  }

  static async exchangeCode(code: string, redirectUri: string): Promise<{ accessToken: string; refreshToken: string }> {
    if (!isConfigured()) {
      return { accessToken: 'zoho_access_placeholder', refreshToken: 'zoho_refresh_placeholder' };
    }

    const response = await axios.post(
      `${getAccountsUrl()}/oauth/v2/token`,
      new URLSearchParams({
        code,
        client_id: process.env.ZOHO_CLIENT_ID ?? '',
        client_secret: process.env.ZOHO_CLIENT_SECRET ?? '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15_000 },
    );

    return { accessToken: response.data.access_token, refreshToken: response.data.refresh_token };
  }

  static async refreshTokens(refreshToken: string): Promise<{ accessToken: string }> {
    const response = await axios.post(
      `${getAccountsUrl()}/oauth/v2/token`,
      new URLSearchParams({
        refresh_token: refreshToken,
        client_id: process.env.ZOHO_CLIENT_ID ?? '',
        client_secret: process.env.ZOHO_CLIENT_SECRET ?? '',
        grant_type: 'refresh_token',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15_000 },
    );
    return { accessToken: response.data.access_token };
  }

  /**
   * Syncs a Global Wakili invoice to Zoho Books.
   * Charter flow: Invoice → Journal Aggregation → Sync → Audit Event
   */
  static async syncInvoice(
    tokens: ZohoTokens,
    invoice: {
      invoiceNumber: string;
      customerName: string;
      amount: number;
      currency: string;
      date: Date;
      dueDate?: Date | null;
      lines: Array<{ description: string; amount: number }>;
    },
  ): Promise<ZohoSyncResult> {
    if (!isConfigured() || tokens.accessToken.includes('placeholder')) {
      console.info('[ZOHO] Simulation mode — invoice sync', { invoiceNumber: invoice.invoiceNumber });
      return { success: true, zohoId: `zoho-inv-${Date.now()}`, simulated: true };
    }

    try {
      const body = {
        invoice_number: invoice.invoiceNumber,
        customer_name: invoice.customerName,
        date: invoice.date.toISOString().slice(0, 10),
        due_date: invoice.dueDate?.toISOString().slice(0, 10),
        currency_code: invoice.currency,
        line_items: invoice.lines.map((line) => ({
          description: line.description,
          rate: line.amount,
          quantity: 1,
        })),
      };

      const response = await axios.post(
        `${getBooksUrl(tokens.organizationId)}/invoices`,
        { JSONString: JSON.stringify(body) },
        {
          headers: { Authorization: `Zoho-oauthtoken ${tokens.accessToken}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 20_000,
        },
      );

      const zohoId = response.data?.invoice?.invoice_id ?? null;
      console.info('[ZOHO] Invoice synced', { invoiceNumber: invoice.invoiceNumber, zohoId });
      return { success: true, zohoId, simulated: false };
    } catch (error: unknown) {
      const msg = axios.isAxiosError(error) ? JSON.stringify(error.response?.data) ?? error.message : String(error);
      console.error('[ZOHO] Invoice sync failed', { error: msg });
      return { success: false, error: msg, simulated: false };
    }
  }

  /**
   * Syncs a journal entry to Zoho Books.
   * Charter flow: Journal → Aggregation → Sync → Audit Event
   */
  static async syncJournalEntry(
    tokens: ZohoTokens,
    journal: {
      referenceNumber: string;
      date: Date;
      notes?: string;
      lines: Array<{ accountName: string; debit?: number; credit?: number; description?: string }>;
    },
  ): Promise<ZohoSyncResult> {
    if (!isConfigured() || tokens.accessToken.includes('placeholder')) {
      console.info('[ZOHO] Simulation mode — journal sync', { ref: journal.referenceNumber });
      return { success: true, zohoId: `zoho-je-${Date.now()}`, simulated: true };
    }

    try {
      const body = {
        journal_date: journal.date.toISOString().slice(0, 10),
        reference_number: journal.referenceNumber,
        notes: journal.notes ?? '',
        line_items: journal.lines.map((line) => ({
          account_name: line.accountName,
          debit_or_credit: line.debit ? 'debit' : 'credit',
          amount: line.debit ?? line.credit ?? 0,
          description: line.description ?? '',
        })),
      };

      const response = await axios.post(
        `${getBooksUrl(tokens.organizationId)}/journals`,
        { JSONString: JSON.stringify(body) },
        {
          headers: { Authorization: `Zoho-oauthtoken ${tokens.accessToken}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 20_000,
        },
      );

      const zohoId = response.data?.journal?.journal_id ?? null;
      return { success: true, zohoId, simulated: false };
    } catch (error: unknown) {
      const msg = axios.isAxiosError(error) ? JSON.stringify(error.response?.data) ?? error.message : String(error);
      return { success: false, error: msg, simulated: false };
    }
  }
}
