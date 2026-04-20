import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { getTenantClient, prisma } from '@global-wakili/database';
import { env } from '../config/env';

const jwtPayloadSchema = z.object({
  sub: z.string().min(1),
  tenantId: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.string().optional(),
  isSuperAdmin: z.boolean().optional().default(false),
});

declare global {
  namespace Express {
    interface Request {
      db: ReturnType<typeof getTenantClient>;
      tenantId?: string;
      user?: z.infer<typeof jwtPayloadSchema>;
      context?: {
        tenantId: string;
        userId: string;
        user: z.infer<typeof jwtPayloadSchema>;
        req: Request;
      };
    }
  }
}

function extractBearerToken(headerValue?: string): string | null {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

export async function unifiedTenancy(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        error: 'Authentication Required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const verified = jwt.verify(token, env.JWT_SECRET);
    const parsedPayload = jwtPayloadSchema.safeParse(verified);

    if (!parsedPayload.success) {
      res.status(401).json({
        error: 'Security Context Verification Failed',
        code: 'INVALID_TOKEN_PAYLOAD',
      });
      return;
    }

    const payload = parsedPayload.data;
    const requestedTenantId =
      (typeof req.headers['x-tenant-id'] === 'string' && req.headers['x-tenant-id']) ||
      payload.tenantId;

    if (!requestedTenantId) {
      res.status(403).json({
        error: 'No Tenant Context Resolved',
        code: 'TENANT_CONTEXT_REQUIRED',
      });
      return;
    }

    if (payload.isSuperAdmin) {
      const tenant = await prisma.tenant.findFirst({
        where: {
          id: requestedTenantId,
          isActive: true,
        },
      });

      if (!tenant) {
        res.status(404).json({
          error: 'Target tenant not found or inactive',
          code: 'TENANT_NOT_FOUND',
        });
        return;
      }
    } else {
      const user = await prisma.user.findFirst({
        where: {
          id: payload.sub,
          tenantId: requestedTenantId,
          status: 'ACTIVE',
        },
      });

      if (!user) {
        res.status(403).json({
          error: 'Access Denied: Not a member of this firm',
          code: 'TENANT_ACCESS_DENIED',
        });
        return;
      }
    }

    req.db = getTenantClient(requestedTenantId);
    req.tenantId = requestedTenantId;
    req.user = payload;
    req.context = {
      tenantId: requestedTenantId,
      userId: payload.sub,
      user: payload,
      req,
    };

    next();
  } catch {
    res.status(401).json({
      error: 'Security Context Verification Failed',
      code: 'TOKEN_VERIFICATION_FAILED',
    });
  }
}