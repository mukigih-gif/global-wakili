import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';

import { OnboardingService } from '../../../../packages/core/identity/services/OnboardingService';
import { prisma } from '../../../../packages/database/src/prisma';
import { validationError, HttpError } from '../../../../packages/core/exceptions/ErrorHandler';

import { LoginSchema, RegisterFirmSchema } from '../common/dto/auth.dto';

export const authRouter = Router();

/**
 * POST /auth/register
 * Initial onboarding for a new Law Firm / Tenant.
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
    if (error?.name === 'ZodError') {
      return next(validationError('Invalid payload', error.errors));
    }

    if (error?.code === 'P2002') {
      return next(new HttpError(409, 'Resource already exists'));
    }

    return next(error);
  }
});

/**
 * POST /auth/login
 * Standard login for existing users.
 */
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  const log = (req as any).log ?? console;

  try {
    const validated = LoginSchema.parse(req.body ?? {});
    const { email, password, tenantId, tenantSlug } = validated;

    const tenantFilter = tenantId
      ? { tenantId }
      : tenantSlug
        ? {
            tenant: {
              slug: tenantSlug,
            },
          }
        : {};

    const user = await prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
        ...tenantFilter,
      },
      include: {
        roles: true,
        tenant: true,
      },
    });

    if (!user) {
      log.warn({ email, tenantId, tenantSlug }, 'Login failed: user not found');
      return next(new HttpError(401, 'Invalid credentials'));
    }

    if (!user.passwordHash) {
      log.warn({ userId: user.id }, 'Login failed: missing password hash');
      return next(new HttpError(401, 'Invalid credentials'));
    }

    if (user.status !== 'ACTIVE') {
      log.warn({ userId: user.id, status: user.status }, 'Login blocked: user inactive');
      return next(new HttpError(403, 'User account is not active'));
    }

    if (user.isLocked && (!user.lockedUntil || user.lockedUntil > new Date())) {
      log.warn({ userId: user.id }, 'Login blocked: user locked');
      return next(new HttpError(423, 'User account is locked'));
    }

    if (user.tenant && user.tenant.subscriptionStatus === 'SUSPENDED') {
      log.info({ tenantId: user.tenantId }, 'Login blocked: tenant suspended');
      return next(new HttpError(403, 'Tenant subscription suspended'));
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: {
            increment: 1,
          },
        },
      });

      log.warn({ userId: user.id }, 'Login failed: invalid password');
      return next(new HttpError(401, 'Invalid credentials'));
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
        lastActivityAt: new Date(),
      },
    });

    const primaryRole = user.roles[0] ?? null;

    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      systemRole: user.systemRole,
      tenantRole: user.tenantRole,
      roleIds: user.roles.map((role) => role.id),
      roleNames: user.roles.map((role) => role.name),
      primaryRole: primaryRole?.name ?? null,
    };

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const expiresIn = process.env.JWT_EXPIRES_IN ?? '2h';

    const token = jwt.sign(payload, jwtSecret, {
      expiresIn,
    } as SignOptions);

    try {
      const expiresAt = new Date(Date.now() + parseJwtExpiryToMs(expiresIn));

      await prisma.session.create({
        data: {
          userId: user.id,
          tenantId: user.tenantId,
          sessionToken: token,
          expiresAt,
          ipAddress: getRequestIp(req),
          userAgent: req.get('user-agent') ?? 'unknown',
          lastActivityType: 'LOGIN',
        },
      });
    } catch (sessionError) {
      log.error({ err: sessionError }, 'Failed to persist session (non-fatal)');
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
          name: user.name,
          tenantId: user.tenantId,
          systemRole: user.systemRole,
          tenantRole: user.tenantRole,
          roles: user.roles.map((role) => ({
            id: role.id,
            name: role.name,
          })),
        },
      },
    });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return next(validationError('Invalid payload', error.errors));
    }

    return next(error);
  }
});

function getRequestIp(req: Request): string {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (Array.isArray(forwardedFor)) {
    return forwardedFor[0] ?? req.ip ?? 'unknown';
  }

  if (typeof forwardedFor === 'string') {
    return forwardedFor.split(',')[0]?.trim() || req.ip || 'unknown';
  }

  return req.ip || 'unknown';
}

/**
 * Converts simple JWT expiry strings like "2h", "15m", "7d" to milliseconds.
 */
function parseJwtExpiryToMs(expiry: string): number {
  if (/^\d+$/.test(expiry)) {
    return Number(expiry) * 1000;
  }

  const match = expiry.match(/^(\d+)([smhd])$/);

  if (!match) {
    return 2 * 60 * 60 * 1000;
  }

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