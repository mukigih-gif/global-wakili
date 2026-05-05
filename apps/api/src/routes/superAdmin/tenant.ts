// apps/api/src/routes/superAdmin/tenant.ts

import { Router, type NextFunction, type Request, type Response } from 'express';
import { PlanType, SubscriptionStatus } from '@prisma/client';

import prisma from '../../prisma/client';
import { AppError } from '../../utils/AppError';

const router = Router();

type OnboardTenantBody = {
  name?: unknown;
  slug?: unknown;
  ownerId?: unknown;
  plan?: unknown;
  kraPin?: unknown;
  description?: unknown;
  logoUrl?: unknown;
  primaryColor?: unknown;
  accentColor?: unknown;
  currency?: unknown;
  timezone?: unknown;
  locale?: unknown;
  branchName?: unknown;
  branchKraPin?: unknown;
  branchLocation?: unknown;
  branchPhone?: unknown;
  branchEmail?: unknown;
};

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(`${fieldName} is required`, {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: { field: fieldName },
    });
  }

  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    return String(value);
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeSlug(value: unknown): string {
  const slug = requireString(value, 'slug')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!slug) {
    throw new AppError('slug must contain at least one alphanumeric character', {
      statusCode: 400,
      code: 'INVALID_TENANT_SLUG',
    });
  }

  return slug;
}

function normalizePlan(value: unknown): PlanType {
  if (value === undefined || value === null || value === '') {
    return PlanType.BASIC;
  }

  const normalized = String(value).trim().toUpperCase();

  if (!Object.values(PlanType).includes(normalized as PlanType)) {
    throw new AppError(`Invalid subscription plan: ${normalized}`, {
      statusCode: 400,
      code: 'INVALID_SUBSCRIPTION_PLAN',
      details: {
        allowedValues: Object.values(PlanType),
      },
    });
  }

  return normalized as PlanType;
}

function oneYearFrom(date: Date): Date {
  const end = new Date(date);
  end.setFullYear(end.getFullYear() + 1);
  return end;
}

function resolveBranchName(value: unknown): string {
  return optionalString(value) ?? 'Main Branch';
}

function resolveBranchKraPin(body: OnboardTenantBody, tenantKraPin: string): string {
  return optionalString(body.branchKraPin) ?? tenantKraPin;
}

async function onboardTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const body = (req.body ?? {}) as OnboardTenantBody;

    const name = requireString(body.name, 'name');
    const slug = normalizeSlug(body.slug);
    const ownerId = requireString(body.ownerId, 'ownerId');
    const kraPin = requireString(body.kraPin, 'kraPin');
    const branchName = resolveBranchName(body.branchName);
    const branchKraPin = resolveBranchKraPin(body, kraPin);
    const subscriptionPlan = normalizePlan(body.plan);
    const billingCycleStart = new Date();
    const billingCycleEnd = oneYearFrom(billingCycleStart);
    const acceptedAt = new Date();

    const tenant = await prisma.$transaction(async (tx) => {
      const [existingTenant, existingBranch, owner] = await Promise.all([
        tx.tenant.findFirst({
          where: {
            OR: [{ slug }, { name }, { kraPin }],
          },
          select: {
            id: true,
            name: true,
            slug: true,
            kraPin: true,
          },
        }),
        tx.branch.findFirst({
          where: {
            kraPin: branchKraPin,
          },
          select: {
            id: true,
            kraPin: true,
          },
        }),
        tx.user.findUnique({
          where: {
            id: ownerId,
          },
          select: {
            id: true,
          },
        }),
      ]);

      if (existingTenant) {
        throw new AppError('Tenant with matching name, slug, or KRA PIN already exists', {
          statusCode: 409,
          code: 'TENANT_ALREADY_EXISTS',
          details: {
            existingTenantId: existingTenant.id,
            name: existingTenant.name,
            slug: existingTenant.slug,
            kraPin: existingTenant.kraPin,
          },
        });
      }

      if (existingBranch) {
        throw new AppError('Branch with matching KRA PIN already exists', {
          statusCode: 409,
          code: 'BRANCH_KRA_PIN_ALREADY_EXISTS',
          details: {
            existingBranchId: existingBranch.id,
            kraPin: existingBranch.kraPin,
          },
        });
      }

      if (!owner) {
        throw new AppError('Owner user was not found', {
          statusCode: 404,
          code: 'OWNER_USER_NOT_FOUND',
          details: {
            ownerId,
          },
        });
      }

      const createdTenant = await tx.tenant.create({
        data: {
          name,
          slug,
          kraPin,
          description: optionalString(body.description),
          logoUrl: optionalString(body.logoUrl),
          primaryColor: optionalString(body.primaryColor) ?? '#1A1A1A',
          accentColor: optionalString(body.accentColor) ?? '#D4AF37',
          currency: optionalString(body.currency) ?? 'KES',
          timezone: optionalString(body.timezone) ?? 'Africa/Nairobi',
          locale: optionalString(body.locale) ?? 'en-KE',
          subscriptionPlan,
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          billingCycleStart,
          billingCycleEnd,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          kraPin: true,
          subscriptionPlan: true,
          subscriptionStatus: true,
          billingCycleStart: true,
          billingCycleEnd: true,
          createdAt: true,
        },
      });

      const mainBranch = await tx.branch.create({
        data: {
          tenantId: createdTenant.id,
          name: branchName,
          kraPin: branchKraPin,
          location: optionalString(body.branchLocation),
          phone: optionalString(body.branchPhone),
          email: optionalString(body.branchEmail),
        },
        select: {
          id: true,
          name: true,
          kraPin: true,
        },
      });

      const ownerRole = await tx.role.upsert({
        where: {
          tenantId_name: {
            tenantId: createdTenant.id,
            name: 'OWNER',
          },
        },
        update: {
          description: 'Tenant owner with administrative control of the firm workspace',
          isSystem: true,
        },
        create: {
          tenantId: createdTenant.id,
          name: 'OWNER',
          description: 'Tenant owner with administrative control of the firm workspace',
          isSystem: true,
        },
        select: {
          id: true,
        },
      });

      await tx.tenantMembership.upsert({
        where: {
          tenantId_userId: {
            tenantId: createdTenant.id,
            userId: ownerId,
          },
        },
        update: {
          roleId: ownerRole.id,
          isOwner: true,
          status: 'ACTIVE',
          acceptedAt,
        },
        create: {
          tenantId: createdTenant.id,
          userId: ownerId,
          roleId: ownerRole.id,
          isOwner: true,
          status: 'ACTIVE',
          acceptedAt,
        },
      });

      return {
        ...createdTenant,
        mainBranch,
      };
    });

    res.status(201).json({
      success: true,
      message: 'Law firm tenant provisioned successfully.',
      data: tenant,
      meta: {
        requestId: req.id ?? null,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

async function listTenants(_req: Request, res: Response, next: NextFunction) {
  try {
    const tenants = await prisma.tenant.findMany({
      take: 100,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        kraPin: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        billingCycleStart: true,
        billingCycleEnd: true,
        suspendedAt: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            branches: true,
            matters: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: tenants,
    });
  } catch (error: unknown) {
    next(error);
  }
}

router.post('/onboard', onboardTenant);
router.get('/', listTenants);

export default router;