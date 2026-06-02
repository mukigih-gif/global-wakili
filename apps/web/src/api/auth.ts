export async function login(email: string, password: string, tenantId?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // tenantId resolved from subdomain, user selection, or env — never hardcoded
  if (tenantId) headers['x-tenant-id'] = tenantId;
  const res = await fetch('/auth/login', {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  return data.token as string | null;
}
