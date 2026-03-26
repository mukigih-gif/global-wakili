// ==========================================
// AUTHENTICATION MIDDLEWARE
// JWT validation & device tracking
// ==========================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DecodedToken {
  id: string;
  email: string;
  tenantId?: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
      deviceId?: string;
      token?: string;
    }
  }
}

/**
 * Verify JWT token and extract user info
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    // Check if token has expired
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return res.status(401).json({ error: 'Token expired' });
    }

    // Verify session is still valid
    const session = await prisma.session.findFirst({
      where: {
        sessionToken: token,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        deviceId: true,
        userId: true,
        status: true,
      },
    });

    if (!session) {
      return res.status(401).json({ error: 'Session invalid or expired' });
    }

    // Check if user is locked
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        status: true,
        isLocked: true,
        lockedUntil: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'User account inactive' });
    }

    if (user.isLocked) {
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const minutesRemaining = Math.ceil(
          (user.lockedUntil.getTime() - Date.now()) / 60000
        );
        return res.status(423).json({
          error: `Account locked. Try again in ${minutesRemaining} minutes`,
        });
      } else {
        // Unlock expired lock
        await prisma.user.update({
          where: { id: user.id },
          data: {
            isLocked: false,
            lockedUntil: null,
            failedLoginAttempts: 0,
          },
        });
      }
    }

    // Update session last activity
    await prisma.session.update({
      where: { id: session.id },
      data: {
        lastActivityAt: new Date(),
        lastActivityType: `${req.method} ${req.path}`,
      },
    });

    // Attach decoded user to request
    (req as any).user = decoded;
    (req as any).deviceId = session.deviceId;
    (req as any).token = token;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Optional authentication - doesn't fail if no token
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    (req as any).user = decoded;

    next();
  } catch (error) {
    // Continue without user
    next();
  }
}