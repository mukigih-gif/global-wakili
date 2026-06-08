import type { RequestHandler, Response } from 'express';

import { prisma } from '../../../../packages/database/src/prisma';
import { verifyToken, type AuthTokenPayload } from '../lib/jwt';

export type AuthenticatedRequestUser = {
  sub: string;
  id: string;
  userId: string;
  email?: string;
  tenantId?: string | null;
  branchId?: string | null;
  systemRole?: string | null;
  tenantRole?: string | null;
  role?: string | null;
  roleIds: string[];
  roleNames: string[];
  roles: string[];
  primaryRole?: string | null;
  isSuperAdmin: boolean;
  tokenClaims: AuthTokenPayload;
};

function unauthorized(res: Response, message = 'Unauthorized') {
  return res.status(401).json({
    error: message,
    code: 'UNAUTHORIZED',
  });
}

function forbidden(res: Response, message = 'Forbidden') {
  return res.status(403).json({
    error: message,
    code: 'FORBIDDEN',
  });
}

function extractBearerToken(authorizationHeader: string | undefined): string | null {
  const header = authorizationHeader ?? '';

  if (!header.startsWith('Bearer ')) {
    return null;
  }

  const token = header.slice('Bearer '.length).trim();

  return token.length > 0 ? token : null;
}

function isPlatformSystemRole(role: unknown): boolean {
  return (
    role === 'SUPER_ADMIN' ||
    role === 'SYSTEM_ADMIN' ||
    role === 'SYSTEM_SUPPORT'
  );
}

function isSuspendedSubscription(status: unknown): boolean {
  return String(status ?? '').toUpperCase() === 'SUSPENDED';
}

function normalizeNonNoneRole(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed || trimmed === 'NONE') {
    return null;
  }

  return trimmed;
}

function derivePrimaryRole(input: {
  roleNames: string[];
  tenantRole?: string | null;
  systemRole?: string | null;
  tokenRole?: string | null;
}): string | null {
  return (
    input.roleNames[0] ??
    normalizeNonNoneRole(input.tenantRole) ??
    normalizeNonNoneRole(input.systemRole) ??
    normalizeNonNoneRole(input.tokenRole) ??
    null
  );
}

function attachRequestSecurityContext(
  req: Parameters<RequestHandler>[0],
  user: AuthenticatedRequestUser,
): void {
  req.user = user;

  if (user.tenantId) {
    req.tenantId = user.tenantId;
  }
}

export async function loadAuthenticatedUser(
  tokenClaims: AuthTokenPayload,
): Promise<AuthenticatedRequestUser> {
  const userId = tokenClaims.sub || tokenClaims.userId;

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      roles: true,
      tenant: true,
    },
  });

  if (!user || user.deletedAt) {
    throw new Error('AUTH_USER_NOT_FOUND');
  }

  if (user.status !== 'ACTIVE') {
    throw new Error('AUTH_USER_INACTIVE');
  }

  if (user.isLocked && (!user.lockedUntil || user.lockedUntil > new Date())) {
    throw new Error('AUTH_USER_LOCKED');
  }

  if (user.tenant && isSuspendedSubscription(user.tenant.subscriptionStatus)) {
    throw new Error('AUTH_TENANT_SUSPENDED');
  }

  if (tokenClaims.tenantId && user.tenantId && tokenClaims.tenantId !== user.tenantId) {
    throw new Error('AUTH_TENANT_MISMATCH');
  }

  if (!user.tenantId && !isPlatformSystemRole(user.systemRole)) {
    throw new Error('AUTH_INVALID_PLATFORM_USER');
  }

  const roleIds = user.roles.map((role) => role.id);
  const roleNames = user.roles.map((role) => role.name);

  const primaryRole = derivePrimaryRole({
    roleNames,
    tenantRole: user.tenantRole,
    systemRole: user.systemRole,
    tokenRole: tokenClaims.role,
  });

  return {
    sub: user.id,
    id: user.id,
    userId: user.id,
    email: user.email ?? undefined,
    tenantId: user.tenantId,
    branchId: user.branchId ?? null,
    systemRole: user.systemRole,
    tenantRole: user.tenantRole,
    role: primaryRole,
    roleIds,
    roleNames,
    roles: roleNames.length > 0 ? roleNames : primaryRole ? [primaryRole] : [],
    primaryRole,
    isSuperAdmin:
      user.systemRole === 'SUPER_ADMIN' ||
      user.systemRole === 'SYSTEM_ADMIN' ||
      tokenClaims.isSuperAdmin === true,
    tokenClaims,
  };
}

/**
 * Strict authentication middleware.
 * Requires Authorization: Bearer <JWT>.
 */
export const authMiddleware: RequestHandler = async (req, res, next) => {
  try {
    const token = extractBearerToken(req.header('authorization'));

    if (!token) {
      return unauthorized(res, 'Bearer token is required.');
    }

    const tokenClaims = verifyToken(token);
    const authenticatedUser = await loadAuthenticatedUser(tokenClaims);

    attachRequestSecurityContext(req, authenticatedUser);

    return next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AUTH_FAILED';

    if (message === 'AUTH_USER_INACTIVE') {
      return forbidden(res, 'User account is not active.');
    }

    if (message === 'AUTH_USER_LOCKED') {
      return res.status(423).json({
        error: 'User account is locked.',
        code: 'USER_LOCKED',
      });
    }

    if (message === 'AUTH_TENANT_SUSPENDED') {
      return forbidden(res, 'Tenant subscription suspended.');
    }

    if (message === 'AUTH_TENANT_MISMATCH') {
      return unauthorized(res, 'Token tenant does not match user tenant.');
    }

    if (message === 'AUTH_INVALID_PLATFORM_USER') {
      return forbidden(res, 'Invalid platform user tenancy.');
    }

    return unauthorized(res, 'Invalid or expired session token.');
  }
};

/**
 * Optional authentication middleware for explicitly public endpoints that may
 * enrich the request when a valid token is present.
 */
export const optionalAuthMiddleware: RequestHandler = async (req, res, next) => {
  try {
    const token = extractBearerToken(req.header('authorization'));

    if (!token) {
      return next();
    }

    const tokenClaims = verifyToken(token);
    const authenticatedUser = await loadAuthenticatedUser(tokenClaims);

    attachRequestSecurityContext(req, authenticatedUser);

    return next();
  } catch {
    return unauthorized(res, 'Invalid or expired session token.');
  }
};