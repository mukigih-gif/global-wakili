/**
 * lib/api.ts — Typed API client for the Global Wakili Express backend.
 *
 * All requests attach the JWT token from sessionStorage and the tenantId
 * resolved from the session. tenantId is never hardcoded.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

export type ApiError = { message: string; code?: string; statusCode?: number };

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('gw_token');
}

function getTenantId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('gw_tenant_id');
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: { signal?: AbortSignal },
): Promise<T> {
  const token = getToken();
  const tenantId = getTenantId();

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (tenantId) headers['x-tenant-id'] = tenantId;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: options?.signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    // Surface validation details so forms can show the real error
    const details = err.details?.map((d: { path: string; message: string }) => `${d.path}: ${d.message}`).join(', ');
    const error: ApiError = {
      message: details || err.message || err.error || `Request failed (${res.status})`,
      code: err.code,
      statusCode: res.status,
    };
    throw error;
  }

  if (res.status === 204) return undefined as unknown as T;
  const json = await res.json();
  // API wraps all responses as { success, data } — unwrap transparently
  return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
}

export const api = {
  get:    <T>(path: string, signal?: AbortSignal) => request<T>('GET',    path, undefined, { signal }),
  post:   <T>(path: string, body?: unknown)        => request<T>('POST',   path, body),
  put:    <T>(path: string, body?: unknown)        => request<T>('PUT',    path, body),
  patch:  <T>(path: string, body?: unknown)        => request<T>('PATCH',  path, body),
  delete: <T>(path: string)                        => request<T>('DELETE', path),
};

// ── Auth helpers ──────────────────────────────────────────────────────────────

export function setSession(token: string, tenantId: string, role?: string) {
  sessionStorage.setItem('gw_token', token);
  sessionStorage.setItem('gw_tenant_id', tenantId);
  if (role) sessionStorage.setItem('gw_role', role);
}

export function clearSession() {
  sessionStorage.removeItem('gw_token');
  sessionStorage.removeItem('gw_tenant_id');
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

export function getSessionTenantId(): string | null {
  return getTenantId();
}
