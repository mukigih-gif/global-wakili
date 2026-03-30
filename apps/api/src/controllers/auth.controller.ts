// apps/api/src/controllers/auth.controller.ts
import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { OnboardingService } from '../../../../packages/core/identity/services/OnboardingService';
import { RegisterFirmSchema } from '../../../src/common/dto/auth.dto';

// Keep import paths unchanged for prisma and error helpers
import { prisma } from '../../../database/src/prisma';
import { validationError, HttpError } from '../../../../packages/core/exceptions/ErrorHandler';

export const authRouter = Router();

/**
 * POST /auth/register
 * Initial onboarding for a new Law Firm (Tenant)
 */
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = RegisterFirmSchema.parse(req.body);
    const result = await OnboardingService.registerNewFirm(validatedData);
    res.status(201).json({
      success: true,
      message: 'Organization successfully onboarded',
      data: result,
    });
  } catch (error: any) {
    if (error?.name === 'ZodError') return next(validationError('Invalid payload', error.errors));
    if (error?.code === 'P2002') return next(new HttpError(409, 'Resource already exists'));
    next(error);
  }
});

/**
 * POST /auth/login
 * Standard login for existing users
 *
 * Expected body: { email: string, password: string, tenantId?: string }
 * Returns: { token, expiresIn, user }
 */
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  const log = (req as any).log ?? console;
  try {
    const { email, password, tenantId } = req.body ?? {};

    if (!email || !password) return next(validationError('Email and password are required'));

    const user = await prisma.user.findFirst({
      where: tenantId ? { email: email.toLowerCase(), tenantId } : { email: email.toLowerCase() },
      include: { role: true, tenant: true },
    });

    if (!user) {
      log.warn({ email, tenantId }, 'Login failed: user not found');
      return next(new HttpError(401, 'Invalid credentials'));
    }

    const passwordHash = (user as any).passwordHash ?? (user as any).password;
    const passwordMatches = await bcrypt.compare(password, passwordHash);

    if (!passwordMatches) {
      log.warn({ userId: user.id }, 'Login failed: invalid password');
      return next(new HttpError(401, 'Invalid credentials'));
    }

    if (user.tenant && (user.tenant as any).subscriptionStatus === 'SUSPENDED') {
      log.info({ tenantId: user.tenantId }, 'Login blocked: tenant suspended');
      return next(new HttpError(403, 'Tenant subscription suspended'));
    }

    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role?.name ?? null,
    };

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET not configured');

    const expiresIn = process.env.JWT_EXPIRES_IN ?? '2h';
    const token = jwt.sign(payload, jwtSecret, { expiresIn });

    // Persist session (non-blocking failure)
    try {
      const expiresAt = new Date(Date.now() + parseJwtExpiryToMs(expiresIn));
      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });
    } catch (e) {
      log.error({ err: e }, 'Failed to persist session (non-fatal)');
    }

    log.info({ userId: user.id, tenantId: user.tenantId }, 'User logged in');

    res.json({
      success: true,
      data: {
        token,
        expiresIn,
        user: {
          id: user.id,
          email: user.email,
          tenantId: user.tenantId,
          role: user.role?.name ?? null,
        },
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * Utility: convert simple expiry strings like "2h", "15m" to milliseconds.
 */
function parseJwtExpiryToMs(expiry: string) {
  if (/^\d+$/.test(expiry)) return Number(expiry) * 1000;
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 2 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2];
  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 2 * 60 * 60 * 1000;
  }
}