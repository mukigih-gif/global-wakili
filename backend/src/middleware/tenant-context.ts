// ==========================================
// TENANT CONTEXT MIDDLEWARE
// Sets PostgreSQL session variable for RLS
// ==========================================

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TenantContext {
  tenantId: string;
  userId: string;
  systemRole: string;
  tenantRole: string;
  branchId?: string;
  deviceId?: string;
}

declare global {
  namespace Express {
    interface Request {
      context?: TenantContext;
    }
  }
}

/**
 * Middleware to extract tenant context from JWT and set RLS variable
 * Must be used AFTER authMiddleware
 */
export async function initializeTenantContext(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Extract user from JWT (set by authMiddleware)
    const user = (req as any).user;

    if (!user || !user.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Fetch user's tenant info
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        tenantId: true,
        systemRole: true,
        tenantRole: true,
        branchId: true,
      },
    });

    if (!userRecord) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!userRecord.tenantId && userRecord.systemRole === 'NONE') {
      return res.status(403).json({ error: 'No tenant access' });
    }

    // Build tenant context
    const context: TenantContext = {
      tenantId: userRecord.tenantId || '',
      userId: userRecord.id,
      systemRole: userRecord.systemRole,
      tenantRole: userRecord.tenantRole || 'NONE',
      branchId: userRecord.branchId || undefined,
      deviceId: (req as any).deviceId,
    };

    // Set PostgreSQL session variable for RLS
    if (context.tenantId) {
      await prisma.$executeRawUnsafe(
        `SET app.current_tenant = '${context.tenantId}'`
      );
    }

    // Attach context to request
    req.context = context;

    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Verify user has access to specific tenant
 */
export async function verifyTenantAccess(
  userId: string,
  tenantId: string
): Promise<boolean> {
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId: tenantId,
      },
    });

    return !!user;
  } catch (error) {
    return false;
  }
}