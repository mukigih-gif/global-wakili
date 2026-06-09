import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import type { Prisma } from '@prisma/client';

import { OnboardingService } from '../../../../packages/core/identity/services/OnboardingService';
import { prisma } from '../../../../packages/database/src/prisma';
import {
  validationError,
  HttpError,
} from '../../../../packages/core/exceptions/ErrorHandler';

import { LoginSchema, RegisterFirmSchema } from '../common/dto/auth.dto';
import {
  parseJwtExpiryToMs,
  resolveJwtExpiresIn,
  signToken,
  verifyToken,
  type AuthTokenPayload,
} from '../lib/jwt';
import { logSecurityEvent } from '../utils/audit-logger';
import {
  AuditAction,
  AuditSeverity,
  AUTH_AUDIT_EVENT_CODES,
} from '../types/audit';
import { authMiddleware } from '../middleware/auth';

export const authRouter = Router();

type LoginUserWithRelations = Prisma.UserGetPayload<{
  include: {
    roles: true;
    tenant: {
      select: {
        id: true;
        slug: true;
        name: true;
        subscriptionStatus: true;
      };
    };
    branch: {
      select: {
        id: true;
        name: true;
      };
    };
  };
}>;

type DerivedRoleClaims = {
  role: string | null;
  isSuperAdmin: boolean;
  primaryRole: string | null;
  roleIds: string[];
  roleNames: string[];
};

type LoginIdentityResponse = {
  id: string;
  email: string;
  name: string | null;
  tenantId: string | null;
  tenant: {
    id: string;
    slug: string;
    name: string;
  } | null;
  branchId: string | null;
  branchName: string | null;
  systemRole: string;
  tenantRole: string;
  role: string | null;
  isSuperAdmin: boolean;
  primaryRole: string | null;
  roleIds: string[];
  roleNames: string[];
  roles: Array<{
    id: string;
    name: string;
  }>;
};

type AuthLogContext = Record<string, unknown>;

type AuthLogger = {
  warn: (context: AuthLogContext, message: string) => void;
  info: (context: AuthLogContext, message: string) => void;
  error: (context: AuthLogContext, message: string) => void;
};

type AuthAuditInput = {
  req: Request;
  tenantId?: string | null;
  userId?: string | null;
  email?: string | null;
  action: AuditAction;
  severity: AuditSeverity;
  eventCode: string;
  entityType: string;
  entityId: string;
  success: boolean;
  failureReason?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
};

function getAuthLogger(req: Request): AuthLogger {
  const maybeLogger = (req as unknown as { log?: Partial<AuthLogger> }).log;

  return {
    warn:
      typeof maybeLogger?.warn === 'function'
        ? maybeLogger.warn.bind(maybeLogger)
        : (context, message) => console.warn(message, context),
    info:
      typeof maybeLogger?.info === 'function'
        ? maybeLogger.info.bind(maybeLogger)
        : (context, message) => console.info(message, context),
    error:
      typeof maybeLogger?.error === 'function'
        ? maybeLogger.error.bind(maybeLogger)
        : (context, message) => console.error(message, context),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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

function requestIdToString(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  return null;
}

function getBearerToken(req: Request): string | null {
  const authorization = req.header('authorization') ?? '';

  if (!authorization.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.slice('Bearer '.length).trim();

  return token.length > 0 ? token : null;
}

function getRequestId(req: Request): string | null {
  return requestIdToString((req as unknown as { id?: unknown }).id);
}

function deriveRoleClaims(user: LoginUserWithRelations): DerivedRoleClaims {
  const databaseRoleIds = user.roles.map((role) => role.id);
  const databaseRoleNames = user.roles.map((role) => role.name);

  const systemRole = normalizeNonNoneRole(user.systemRole);
  const tenantRole = normalizeNonNoneRole(user.tenantRole);

  const isSuperAdmin =
    systemRole === 'SUPER_ADMIN' ||
    systemRole === 'SYSTEM_ADMIN';

  const fallbackRole =
    databaseRoleNames[0] ??
    tenantRole ??
    systemRole ??
    null;

  const roleNames =
    databaseRoleNames.length > 0
      ? databaseRoleNames
      : fallbackRole
        ? [fallbackRole]
        : [];

  return {
    role: fallbackRole,
    isSuperAdmin,
    primaryRole: fallbackRole,
    roleIds: databaseRoleIds,
    roleNames,
  };
}

function buildLoginIdentityResponse(
  user: LoginUserWithRelations,
  roleClaims: DerivedRoleClaims,
): LoginIdentityResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    tenantId: user.tenantId,
    tenant: user.tenant
      ? {
          id: user.tenant.id,
          slug: user.tenant.slug,
          name: user.tenant.name,
        }
      : null,
    branchId: user.branchId ?? null,
    branchName: user.branch?.name ?? null,
    systemRole: user.systemRole,
    tenantRole: user.tenantRole,
    role: roleClaims.role,
    isSuperAdmin: roleClaims.isSuperAdmin,
    primaryRole: roleClaims.primaryRole,
    roleIds: roleClaims.roleIds,
    roleNames: roleClaims.roleNames,
    roles: user.roles.map((role) => ({
      id: role.id,
      name: role.name,
    })),
  };
}

function buildLoginWhereFilter(input: {
  email: string;
  tenantId?: string;
  tenantSlug?: string;
}): Prisma.UserWhereInput {
  const email = input.email.trim().toLowerCase();

  if (input.tenantId) {
    return {
      email,
      deletedAt: null,
      tenantId: input.tenantId,
    };
  }

  if (input.tenantSlug) {
    return {
      email,
      deletedAt: null,
      tenant: {
        slug: input.tenantSlug.trim().toLowerCase(),
      },
    };
  }

  return {
    email,
    deletedAt: null,
    tenantId: null,
  };
}

async function findLoginUserById(userId: string): Promise<LoginUserWithRelations | null> {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      roles: true,
      tenant: {
        select: {
          id: true,
          slug: true,
          name: true,
          subscriptionStatus: true,
        },
      },
      branch: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

async function resolveTenantIdForAudit(input: {
  tenantId?: string | null;
  tenantSlug?: string | null;
  userTenantId?: string | null;
}): Promise<string | null> {
  if (input.userTenantId) {
    return input.userTenantId;
  }

  if (input.tenantId) {
    return input.tenantId;
  }

  if (!input.tenantSlug) {
    return null;
  }

  const tenant = await prisma.tenant.findUnique({
    where: {
      slug: input.tenantSlug.trim().toLowerCase(),
    },
    select: {
      id: true,
    },
  });

  return tenant?.id ?? null;
}

async function safeLogAuthAudit(input: AuthAuditInput): Promise<void> {
  try {
    if (!input.tenantId) {
      console.warn('AUTH_AUDIT_SKIPPED_TENANT_REQUIRED', {
        requestId: getRequestId(input.req),
        eventCode: input.eventCode,
        entityType: input.entityType,
        entityId: input.entityId,
      });

      return;
    }

    await logSecurityEvent({
      req: input.req,
      tenantId: input.tenantId,
      userId: input.userId ?? null,
      action: input.action,
      severity: input.severity,
      entityType: input.entityType,
      entityId: input.entityId,
      success: input.success,
      failureReason: input.failureReason ?? null,
      reason: input.reason ?? null,
      afterData: {
        eventCode: input.eventCode,
        email: input.email ?? null,
        ...(input.metadata ?? {}),
      },
      requestId: getRequestId(input.req),
      allowMissingTenant: true,
    });
  } catch (auditError) {
    console.error('AUTH_AUDIT_LOG_FAILURE', {
      requestId: getRequestId(input.req),
      eventCode: input.eventCode,
      auditError,
    });
  }
}

async function buildCurrentIdentity(req: Request): Promise<LoginIdentityResponse> {
  const requestUser = (req as unknown as {
    user?: {
      id?: string;
      sub?: string;
      userId?: string;
    };
  }).user;

  const userId = requestUser?.id ?? requestUser?.sub ?? requestUser?.userId;

  if (!userId) {
    throw new HttpError(401, 'Unauthorized');
  }

  const user = await findLoginUserById(userId);

  if (!user || user.deletedAt || user.status !== 'ACTIVE') {
    throw new HttpError(401, 'Unauthorized');
  }

  const roleClaims = deriveRoleClaims(user);

  return buildLoginIdentityResponse(user, roleClaims);
}

/**
 * POST /auth/register
 * Initial onboarding for a new Law Firm / Tenant.
 */
authRouter.post(
  '/register',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = RegisterFirmSchema.parse(req.body);

      const result = await OnboardingService.registerNewFirm({
        ...validatedData,
        password: validatedData.adminPassword,
        mainBranchName:
          validatedData.tenantName ??
          validatedData.firmName,
      });

      return res.status(201).json({
        success: true,
        message: 'Organization successfully onboarded',
        data: result,
      });
    } catch (error: unknown) {
      if (isRecord(error) && error.name === 'ZodError') {
        return next(
          validationError(
            'Invalid payload',
            (error as { errors?: unknown }).errors,
          ),
        );
      }

      if (isRecord(error) && error.code === 'P2002') {
        return next(new HttpError(409, 'Resource already exists'));
      }

      return next(error);
    }
  },
);

/**
 * POST /auth/login
 * Standard login for existing users.
 */
authRouter.post(
  '/login',
  async (req: Request, res: Response, next: NextFunction) => {
    const log = getAuthLogger(req);

    try {
      const validated = LoginSchema.parse(req.body ?? {});
      const { email, password, tenantId, tenantSlug } = validated;

      const user = await prisma.user.findFirst({
        where: buildLoginWhereFilter({
          email,
          tenantId,
          tenantSlug,
        }),
        include: {
          roles: true,
          tenant: {
            select: {
              id: true,
              slug: true,
              name: true,
              subscriptionStatus: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!user) {
        const auditTenantId = await resolveTenantIdForAudit({
          tenantId,
          tenantSlug,
        });

        await safeLogAuthAudit({
          req,
          tenantId: auditTenantId,
          email,
          action: AuditAction.REQUEST_FAILURE,
          severity: AuditSeverity.WARNING,
          eventCode: AUTH_AUDIT_EVENT_CODES.LOGIN_FAILED_USER_NOT_FOUND,
          entityType: 'Authentication',
          entityId: email.toLowerCase(),
          success: false,
          failureReason: 'User not found',
          metadata: {
            tenantId: tenantId ?? null,
            tenantSlug: tenantSlug ?? null,
          },
        });

        log.warn(
          {
            email,
            tenantId,
            tenantSlug,
          },
          'Login failed: user not found',
        );

        return next(new HttpError(401, 'Invalid credentials'));
      }

      if (!user.passwordHash) {
        await safeLogAuthAudit({
          req,
          tenantId: user.tenantId,
          userId: user.id,
          email: user.email,
          action: AuditAction.REQUEST_FAILURE,
          severity: AuditSeverity.CRITICAL,
          eventCode: AUTH_AUDIT_EVENT_CODES.LOGIN_FAILED_MISSING_PASSWORD_HASH,
          entityType: 'User',
          entityId: user.id,
          success: false,
          failureReason: 'User has no password hash',
          metadata: {
            systemRole: user.systemRole,
            tenantRole: user.tenantRole,
          },
        });

        log.warn(
          {
            userId: user.id,
          },
          'Login failed: missing password hash',
        );

        return next(new HttpError(401, 'Invalid credentials'));
      }

      if (user.status !== 'ACTIVE') {
        await safeLogAuthAudit({
          req,
          tenantId: user.tenantId,
          userId: user.id,
          email: user.email,
          action: AuditAction.REQUEST_FAILURE,
          severity: AuditSeverity.WARNING,
          eventCode: AUTH_AUDIT_EVENT_CODES.LOGIN_BLOCKED_INACTIVE_USER,
          entityType: 'User',
          entityId: user.id,
          success: false,
          failureReason: `User status is ${user.status}`,
          metadata: {
            status: user.status,
          },
        });

        log.warn(
          {
            userId: user.id,
            status: user.status,
          },
          'Login blocked: user inactive',
        );

        return next(new HttpError(403, 'User account is not active'));
      }

      if (user.isLocked && (!user.lockedUntil || user.lockedUntil > new Date())) {
        await safeLogAuthAudit({
          req,
          tenantId: user.tenantId,
          userId: user.id,
          email: user.email,
          action: AuditAction.REQUEST_FAILURE,
          severity: AuditSeverity.HIGH,
          eventCode: AUTH_AUDIT_EVENT_CODES.LOGIN_BLOCKED_LOCKED_USER,
          entityType: 'User',
          entityId: user.id,
          success: false,
          failureReason: 'User account is locked',
          metadata: {
            lockedUntil: user.lockedUntil?.toISOString() ?? null,
          },
        });

        log.warn(
          {
            userId: user.id,
          },
          'Login blocked: user locked',
        );

        return next(new HttpError(423, 'User account is locked'));
      }

      if (user.tenant && isSuspendedSubscription(user.tenant.subscriptionStatus)) {
        await safeLogAuthAudit({
          req,
          tenantId: user.tenantId,
          userId: user.id,
          email: user.email,
          action: AuditAction.REQUEST_FAILURE,
          severity: AuditSeverity.HIGH,
          eventCode: AUTH_AUDIT_EVENT_CODES.LOGIN_BLOCKED_TENANT_SUSPENDED,
          entityType: 'Tenant',
          entityId: user.tenant.id,
          success: false,
          failureReason: 'Tenant subscription suspended',
          metadata: {
            subscriptionStatus: user.tenant.subscriptionStatus,
          },
        });

        log.info(
          {
            tenantId: user.tenantId,
          },
          'Login blocked: tenant suspended',
        );

        return next(new HttpError(403, 'Tenant subscription suspended'));
      }

  const derivedRoleClaims = deriveRoleClaims(user);      
  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

      if (!passwordMatches) {
  const failedLoginRoleClaims = deriveRoleClaims(user);

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      failedLoginAttempts: {
        increment: 1,
      },
    },
  });

  await safeLogAuthAudit({
    req,
    tenantId: user.tenantId,
    userId: user.id,
    email: user.email,
    action: AuditAction.REQUEST_FAILURE,
    severity: AuditSeverity.WARNING,
    eventCode: AUTH_AUDIT_EVENT_CODES.LOGIN_FAILED_INVALID_PASSWORD,
    entityType: 'User',
    entityId: user.id,
    success: false,
    failureReason: 'Invalid password',
    metadata: {
      systemRole: user.systemRole,
      tenantRole: user.tenantRole,
      role: failedLoginRoleClaims.role,
      primaryRole: failedLoginRoleClaims.primaryRole,
      roleNames: failedLoginRoleClaims.roleNames,
      isSuperAdmin: failedLoginRoleClaims.isSuperAdmin,
    },
  });

  log.warn(
    {
      userId: user.id,
    },
    'Login failed: invalid password',
  );

  return next(new HttpError(401, 'Invalid credentials'));
}

      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          failedLoginAttempts: 0,
          lastLoginAt: new Date(),
          lastActivityAt: new Date(),
        },
      });

      
      const payload: Omit<AuthTokenPayload, 'iat' | 'exp' | 'nbf' | 'jti'> = {
        sub: user.id,
        userId: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: derivedRoleClaims.role,
        isSuperAdmin: derivedRoleClaims.isSuperAdmin,
        systemRole: user.systemRole,
        tenantRole: user.tenantRole,
        roleIds: derivedRoleClaims.roleIds,
        roleNames: derivedRoleClaims.roleNames,
        roles: derivedRoleClaims.roleNames,
        primaryRole: derivedRoleClaims.primaryRole,
      };

      const expiresIn = resolveJwtExpiresIn(process.env.JWT_EXPIRES_IN);
      const token = signToken(payload, expiresIn);

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
        await safeLogAuthAudit({
          req,
          tenantId: user.tenantId,
          userId: user.id,
          email: user.email,
          action: AuditAction.SYSTEM_ERROR,
          severity: AuditSeverity.WARNING,
          eventCode: AUTH_AUDIT_EVENT_CODES.SESSION_CREATE_FAILED,
          entityType: 'Session',
          entityId: user.id,
          success: false,
          failureReason:
            sessionError instanceof Error
              ? sessionError.message
              : 'Failed to persist session',
          metadata: {
  systemRole: user.systemRole,
  tenantRole: user.tenantRole,
  role: derivedRoleClaims.role,
  primaryRole: derivedRoleClaims.primaryRole,
  roleNames: derivedRoleClaims.roleNames,
  isSuperAdmin: derivedRoleClaims.isSuperAdmin,
},
        });

        log.error(
          {
            err: sessionError,
          },
          'Failed to persist session (non-fatal)',
        );
      }

      await safeLogAuthAudit({
        req,
        tenantId: user.tenantId,
        userId: user.id,
        email: user.email,
        action: AuditAction.AUTHORIZE,
        severity: AuditSeverity.INFO,
        eventCode: AUTH_AUDIT_EVENT_CODES.LOGIN_SUCCESS,
        entityType: 'User',
        entityId: user.id,
        success: true,
        metadata: {
          systemRole: user.systemRole,
          tenantRole: user.tenantRole,
          role: derivedRoleClaims.role,
          primaryRole: derivedRoleClaims.primaryRole,
          roleNames: derivedRoleClaims.roleNames,
          isSuperAdmin: derivedRoleClaims.isSuperAdmin,
        },
      });

      log.info(
        {
          userId: user.id,
          tenantId: user.tenantId,
        },
        'User logged in',
      );

      return res.json({
        success: true,
        data: {
          token,
          tokenType: 'Bearer',
          expiresIn: String(process.env.JWT_EXPIRES_IN?.trim() || '2h'),
          user: buildLoginIdentityResponse(user, derivedRoleClaims),
        },
      });
    } catch (error: unknown) {
      if (isRecord(error) && error.name === 'ZodError') {
        return next(
          validationError(
            'Invalid payload',
            (error as { errors?: unknown }).errors,
          ),
        );
      }

      return next(error);
    }
  },
);

/**
 * GET /auth/me
 * Returns the current authenticated identity contract.
 */
authRouter.get(
  '/me',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await buildCurrentIdentity(req);

      return res.json({
        success: true,
        data: {
          user,
        },
      });
    } catch (error: unknown) {
      return next(error);
    }
  },
);

/**
 * GET /auth/session
 * Returns current session metadata for the supplied bearer token.
 */
authRouter.get(
  '/session',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = getBearerToken(req);

      if (!token) {
        return next(new HttpError(401, 'Bearer token is required'));
      }

      const session = await prisma.session.findUnique({
        where: {
          sessionToken: token,
        },
        select: {
          id: true,
          userId: true,
          tenantId: true,
          status: true,
          issuedAt: true,
          expiresAt: true,
          lastActivityAt: true,
          lastActivityType: true,
          ipAddress: true,
          userAgent: true,
          mfaVerified: true,
          riskLevel: true,
          suspiciousActivity: true,
        },
      });

      return res.json({
        success: true,
        data: {
          session,
        },
      });
    } catch (error: unknown) {
      return next(error);
    }
  },
);

/**
 * GET /auth/audit/recent
 * Returns recent auth/security audit events for the current tenant user.
 * Platform-only users are intentionally excluded until a platform audit table exists.
 */
authRouter.get(
  '/audit/recent',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestUser = (req as unknown as {
        user?: {
          id?: string;
          sub?: string;
          userId?: string;
          tenantId?: string | null;
        };
      }).user;

      const tenantId = requestUser?.tenantId ?? null;
      const userId = requestUser?.id ?? requestUser?.sub ?? requestUser?.userId ?? null;

      if (!tenantId || !userId) {
        return res.status(403).json({
          success: false,
          code: 'TENANT_AUDIT_ONLY',
          message: 'Tenant audit log is only available for tenant-bound users.',
        });
      }

      const limitRaw = Number(req.query.limit ?? 20);
      const take = Number.isFinite(limitRaw)
        ? Math.min(Math.max(Math.trunc(limitRaw), 1), 50)
        : 20;

      const logs = await prisma.auditLog.findMany({
        where: {
          tenantId,
          userId,
          entityType: {
            in: ['Authentication', 'User', 'Session', 'Tenant'],
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take,
        select: {
          id: true,
          tenantId: true,
          userId: true,
          action: true,
          severity: true,
          entityType: true,
          entityId: true,
          success: true,
          failureReason: true,
          correlationId: true,
          reason: true,
          ipAddress: true,
          userAgent: true,
          afterData: true,
          createdAt: true,
        },
      });

      return res.json({
        success: true,
        data: {
          logs,
        },
      });
    } catch (error: unknown) {
      return next(error);
    }
  },
);

/**
 * POST /auth/logout
 * Best-effort session invalidation for the supplied bearer token.
 */
authRouter.post(
  '/logout',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = getBearerToken(req);

      if (token) {
        try {
          const tokenClaims = verifyToken(token);

          await safeLogAuthAudit({
            req,
            tenantId: tokenClaims.tenantId ?? null,
            userId: tokenClaims.userId,
            email: tokenClaims.email ?? null,
            action: AuditAction.REVOKE,
            severity: AuditSeverity.INFO,
            eventCode: AUTH_AUDIT_EVENT_CODES.LOGOUT_SUCCESS,
            entityType: 'Session',
            entityId: tokenClaims.userId,
            success: true,
            metadata: {
              systemRole: tokenClaims.systemRole ?? null,
              tenantRole: tokenClaims.tenantRole ?? null,
              role: tokenClaims.role ?? null,
              primaryRole: tokenClaims.primaryRole ?? null,
              roleNames: tokenClaims.roleNames,
            },
          });
        } catch {
          await safeLogAuthAudit({
            req,
            tenantId: null,
            action: AuditAction.REQUEST_FAILURE,
            severity: AuditSeverity.WARNING,
            eventCode: AUTH_AUDIT_EVENT_CODES.LOGOUT_TOKEN_INVALID,
            entityType: 'Session',
            entityId: 'invalid-token',
            success: false,
            failureReason: 'Logout token invalid or expired',
          });
        }

        await prisma.session.deleteMany({
          where: {
            sessionToken: token,
          },
        });
      }

      return res.status(204).send();
    } catch (error: unknown) {
      return next(error);
    }
  },
);

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

// ── OAuth / Social Login ──────────────────────────────────────────────────────

import { ExternalSyncService } from '../modules/calendar/ExternalSyncService';

/**
 * GET /auth/oauth/google
 * Initiates Google OAuth 2.0 flow — redirects to Google consent screen.
 * Query params: redirect_uri, state (optional CSRF token), tenant_id (optional)
 */
authRouter.get('/oauth/google', (req: Request, res: Response) => {
  const redirectUri = String(req.query.redirect_uri ?? `${req.protocol}://${req.get('host')}/api/v1/auth/oauth/google/callback`);
  const state = String(req.query.state ?? '');
  const url = ExternalSyncService.getGoogleAuthorizationUrl({ redirectUri, state });
  res.redirect(url);
});

/**
 * GET /auth/oauth/google/callback
 * Google OAuth callback — exchanges code for user info and issues a JWT.
 */
authRouter.get('/oauth/google/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = String(req.query.code ?? '');
    const redirectUri = String(req.query.redirect_uri ?? `${req.protocol}://${req.get('host')}/api/v1/auth/oauth/google/callback`);

    if (!code) return next(new HttpError(400, 'OAuth code is required'));

    const tokens = await ExternalSyncService.exchangeGoogleCode({ code, redirectUri });

    // Fetch user info from Google
    const { default: axios } = await import('axios');
    const userInfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
      timeout: 10_000,
    }).catch(() => null);

    const email: string | null = userInfo?.data?.email ?? null;
    if (!email) return next(new HttpError(400, 'Could not retrieve email from Google'));

    const tenantId = String(req.query.tenant_id ?? req.headers['x-tenant-id'] ?? '');

    // Find or create user
    const user = await prisma.user.findFirst({
      where: {
        email,
        ...(tenantId ? { tenantId } : {}),
        status: 'ACTIVE',
      },
      include: { roles: true, tenant: { select: { id: true, slug: true, name: true, subscriptionStatus: true } }, branch: { select: { id: true, name: true } } },
    });

    if (!user) {
      return next(new HttpError(401, `No active account found for ${email}. Contact your administrator.`));
    }

    const claims = deriveRoleClaims(user);
    const jwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      systemRole: user.systemRole ?? 'NONE',
      tenantRole: user.tenantRole ?? 'NONE',
      role: claims.role,
      primaryRole: claims.primaryRole,
      isSuperAdmin: claims.isSuperAdmin,
      roleIds: claims.roleIds,
      roleNames: claims.roleNames,
      provider: 'google',
    };

    const accessToken = signToken(jwtPayload, resolveJwtExpiresIn('access'));
    const appUrl = process.env.APP_URL ?? `${req.protocol}://${req.get('host')}`;
    const portal = claims.isSuperAdmin ? '/admin/dashboard' : '/app/dashboard';

    // Redirect to frontend with token in query param (frontend stores in sessionStorage)
    res.redirect(`${appUrl}/auth/oauth/complete?token=${encodeURIComponent(accessToken)}&tenantId=${encodeURIComponent(user.tenantId ?? '')}&role=${encodeURIComponent(claims.role ?? '')}&redirect=${encodeURIComponent(portal)}`);
  } catch (error: unknown) {
    return next(error);
  }
});

/**
 * GET /auth/oauth/microsoft
 * Initiates Microsoft OAuth 2.0 flow — redirects to Microsoft login.
 */
authRouter.get('/oauth/microsoft', (req: Request, res: Response) => {
  const redirectUri = String(req.query.redirect_uri ?? `${req.protocol}://${req.get('host')}/api/v1/auth/oauth/microsoft/callback`);
  const state = String(req.query.state ?? '');
  const url = ExternalSyncService.getOutlookAuthorizationUrl({ redirectUri, state });
  res.redirect(url);
});

/**
 * GET /auth/oauth/microsoft/callback
 * Microsoft OAuth callback — exchanges code for user info and issues a JWT.
 */
authRouter.get('/oauth/microsoft/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = String(req.query.code ?? '');
    const redirectUri = String(req.query.redirect_uri ?? `${req.protocol}://${req.get('host')}/api/v1/auth/oauth/microsoft/callback`);

    if (!code) return next(new HttpError(400, 'OAuth code is required'));

    const tokens = await ExternalSyncService.exchangeOutlookCode({ code, redirectUri });

    const { default: axios } = await import('axios');
    const userInfo = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
      timeout: 10_000,
    }).catch(() => null);

    const email: string | null = userInfo?.data?.mail ?? userInfo?.data?.userPrincipalName ?? null;
    if (!email) return next(new HttpError(400, 'Could not retrieve email from Microsoft'));

    const tenantId = String(req.query.tenant_id ?? req.headers['x-tenant-id'] ?? '');

    const user = await prisma.user.findFirst({
      where: {
        email,
        ...(tenantId ? { tenantId } : {}),
        status: 'ACTIVE',
      },
      include: { roles: true, tenant: { select: { id: true, slug: true, name: true, subscriptionStatus: true } }, branch: { select: { id: true, name: true } } },
    });

    if (!user) {
      return next(new HttpError(401, `No active account found for ${email}. Contact your administrator.`));
    }

    const claims = deriveRoleClaims(user);
    const jwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      systemRole: user.systemRole ?? 'NONE',
      tenantRole: user.tenantRole ?? 'NONE',
      role: claims.role,
      primaryRole: claims.primaryRole,
      isSuperAdmin: claims.isSuperAdmin,
      roleIds: claims.roleIds,
      roleNames: claims.roleNames,
      provider: 'microsoft',
    };

    const accessToken = signToken(jwtPayload, resolveJwtExpiresIn('access'));
    const appUrl = process.env.APP_URL ?? `${req.protocol}://${req.get('host')}`;
    const portal = claims.isSuperAdmin ? '/admin/dashboard' : '/app/dashboard';

    res.redirect(`${appUrl}/auth/oauth/complete?token=${encodeURIComponent(accessToken)}&tenantId=${encodeURIComponent(user.tenantId ?? '')}&role=${encodeURIComponent(claims.role ?? '')}&redirect=${encodeURIComponent(portal)}`);
  } catch (error: unknown) {
    return next(error);
  }
});