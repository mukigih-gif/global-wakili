import type { NextFunction, Request, Response } from 'express';

import { getTenantClient, prisma } from '@global-wakili/database';
import { verifyToken } from '../lib/jwt';
import { loadAuthenticatedUser } from './auth';

function extractBearerToken(headerValue?: string): string | null {
  if (!headerValue) {
    return null;
  }

  const [scheme, token] = headerValue.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token.trim();
}

function requestIdToString(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  return null;
}

export async function unifiedTenancy(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        error: 'Authentication Required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const tokenClaims = verifyToken(token);
    const authenticatedUser = await loadAuthenticatedUser(tokenClaims);

    const requestedTenantId =
      (typeof req.headers['x-tenant-id'] === 'string' && req.headers['x-tenant-id']) ||
      authenticatedUser.tenantId ||
      tokenClaims.tenantId ||
      undefined;

    if (!requestedTenantId) {
      res.status(403).json({
        error: 'No Tenant Context Resolved',
        code: 'TENANT_CONTEXT_REQUIRED',
      });
      return;
    }

    if (authenticatedUser.isSuperAdmin) {
      const tenant = await prisma.tenant.findFirst({
        where: {
          id: requestedTenantId,
        },
        select: {
          id: true,
        },
      });

      if (!tenant) {
        res.status(404).json({
          error: 'Target tenant not found',
          code: 'TENANT_NOT_FOUND',
        });
        return;
      }
    } else {
      if (!authenticatedUser.tenantId || authenticatedUser.tenantId !== requestedTenantId) {
        res.status(403).json({
          error: 'Access Denied: Not a member of this firm',
          code: 'TENANT_ACCESS_DENIED',
        });
        return;
      }

      const membership = await prisma.user.findFirst({
        where: {
          id: authenticatedUser.id,
          tenantId: requestedTenantId,
          status: 'ACTIVE',
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!membership) {
        res.status(403).json({
          error: 'Access Denied: Not a member of this firm',
          code: 'TENANT_ACCESS_DENIED',
        });
        return;
      }
    }

    req.db = getTenantClient(requestedTenantId);
    req.tenantId = requestedTenantId;
    req.user = authenticatedUser;
    req.context = {
      tenantId: requestedTenantId,
      userId: authenticatedUser.id,
      user: authenticatedUser,
      requestId: requestIdToString(req.id),
    };

    next();
  } catch {
    res.status(401).json({
      error: 'Security Context Verification Failed',
      code: 'TOKEN_VERIFICATION_FAILED',
    });
  }
}