// apps/api/src/utils/request-identity.ts

import type { Request } from 'express';

export type RequestUserLike = {
  id?: string;
  sub?: string;
  userId?: string;
  email?: string | null;
  tenantId?: string | null;
  role?: string | null;
  roleName?: string | null;
  primaryRole?: string | null;
  roles?: string[];
  roleNames?: string[];
  permissions?: string[];
  isSuperAdmin?: boolean;
  isSystemAdmin?: boolean;
  systemRole?: string | null;
  tenantRole?: string | null;
};

function getRawUser(req: Request): RequestUserLike | null {
  return (req as unknown as { user?: RequestUserLike }).user ?? null;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export function getRequestUser(req: Request): RequestUserLike | null {
  return getRawUser(req);
}

export function getRequestUserId(req: Request): string | null {
  const user = getRawUser(req);

  return (
    normalizeString(user?.sub) ??
    normalizeString(user?.id) ??
    normalizeString(user?.userId)
  );
}

export function requireRequestUserId(req: Request): string {
  const userId = getRequestUserId(req);

  if (!userId) {
    throw Object.assign(new Error('Authenticated user context is required.'), {
      statusCode: 401,
      code: 'AUTHENTICATED_USER_REQUIRED',
    });
  }

  return userId;
}

export function getRequestEmail(req: Request): string | null {
  return normalizeString(getRawUser(req)?.email);
}

export function getRequestRole(req: Request): string | null {
  const user = getRawUser(req);

  return (
    normalizeString(user?.primaryRole) ??
    normalizeString(user?.role) ??
    normalizeString(user?.roleName) ??
    normalizeString(user?.systemRole) ??
    normalizeString(user?.tenantRole)
  );
}

export function getRequestRoleNames(req: Request): string[] {
  const user = getRawUser(req);

  const values = [
    ...(Array.isArray(user?.roles) ? user.roles : []),
    ...(Array.isArray(user?.roleNames) ? user.roleNames : []),
    user?.role,
    user?.roleName,
    user?.primaryRole,
    user?.systemRole,
    user?.tenantRole,
  ];

  return [
    ...new Set(
      values
        .map((value) => normalizeString(value))
        .filter((value): value is string => Boolean(value)),
    ),
  ];
}

export function getRequestPermissions(req: Request): string[] {
  const user = getRawUser(req);

  return Array.isArray(user?.permissions)
    ? user.permissions
        .map((permission) => normalizeString(permission))
        .filter((permission): permission is string => Boolean(permission))
    : [];
}

export function isRequestSuperAdmin(req: Request): boolean {
  const user = getRawUser(req);

  if (user?.isSuperAdmin === true || user?.isSystemAdmin === true) {
    return true;
  }

  return getRequestRoleNames(req)
    .map((role) => role.toUpperCase())
    .some((role) => role === 'SUPER_ADMIN' || role === 'SYSTEM_ADMIN');
}

export function getRequestId(req: Request): string | null {
  const requestId = (req as unknown as { id?: unknown }).id;

  if (typeof requestId === 'string') {
    return requestId;
  }

  if (typeof requestId === 'number' || typeof requestId === 'bigint') {
    return String(requestId);
  }

  return null;
}

export function getRequiredRequestId(req: Request): string {
  return getRequestId(req) ?? 'unknown-request';
}

export function getTenantId(req: Request): string | null {
  const requestTenantId = normalizeString((req as unknown as { tenantId?: unknown }).tenantId);
  const userTenantId = normalizeString(getRawUser(req)?.tenantId);

  return requestTenantId ?? userTenantId;
}

export function requireTenantId(req: Request): string {
  const tenantId = getTenantId(req);

  if (!tenantId) {
    throw Object.assign(new Error('Tenant context is required.'), {
      statusCode: 403,
      code: 'TENANT_CONTEXT_REQUIRED',
    });
  }

  return tenantId;
}

export function getRequestIp(req: Request): string | null {
  return normalizeString(req.ip);
}

export function getRequestUserAgent(req: Request): string | null {
  const value = req.headers['user-agent'];

  if (Array.isArray(value)) {
    return normalizeString(value[0]);
  }

  return normalizeString(value);
}