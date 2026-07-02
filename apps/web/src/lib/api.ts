/**
 * lib/api.ts — Typed API client for the Global Wakili Express backend.
 *
 * All requests attach the JWT token from localStorage and the tenantId
 * resolved from the session. tenantId is never hardcoded.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

export type ApiError = { message: string; code?: string; statusCode?: number };

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('gw_token');
}

function getTenantId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('gw_tenant_id');
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
  // No envelope unwrapping — responses are returned as-is for ONE consistent shape.
  // List callers read `r.data`; single-resource callers read `(r.data ?? r)`.
  // This removes the prior unwrap/r.data mismatch that left lists silently empty.
  return json as T;
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
  localStorage.setItem('gw_token', token);
  localStorage.setItem('gw_tenant_id', tenantId);
  if (role) localStorage.setItem('gw_role', role);
}

export function clearSession() {
  // Clear ALL session keys (localStorage persists across tabs/restarts).
  localStorage.removeItem('gw_token');
  localStorage.removeItem('gw_tenant_id');
  localStorage.removeItem('gw_role');
  localStorage.removeItem('gw_system_role');
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

export function getSessionTenantId(): string | null {
  return getTenantId();
}
