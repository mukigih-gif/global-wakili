import { Router, type NextFunction, type Request, type Response } from 'express';
import { MatterStatus } from '@prisma/client';

import { RegistryService } from '../../../../packages/core/registry/services/RegistryService';
import { validationError } from '../../../../packages/core/exceptions/ErrorHandler';
import { unifiedTenancy } from '../middleware/unified-tenancy';

export const registryRouter = Router();

// Ensure all registry routes are scoped by tenant context
registryRouter.use(unifiedTenancy);

/**
 * Type Definitions for Raw Request Input
 */
type RegistryMatterCreateBody = {
  title?: unknown;
  description?: unknown;
  category?: unknown;
  practiceArea?: unknown;
  clientId?: unknown;
  branchId?: unknown;
  leadAdvocateId?: unknown;
  riskLevel?: unknown;
  openedDate?: unknown;
};

type RegistryMatterListQuery = {
  limit?: unknown;
  offset?: unknown;
  status?: unknown;
  clientId?: unknown;
  branchId?: unknown;
};

/**
 * Context & Validation Helpers
 */
function requireTenantId(req: Request): string {
  if (!req.tenantId || !req.tenantId.trim()) {
    throw validationError('Tenant context missing or unauthorized');
  }
  return req.tenantId.trim();
}

function requireUserId(req: Request): string {
  // Support both standard Passport 'id' and JWT 'sub'
  const userId = req.user?.id ?? req.user?.sub;
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    throw validationError('User context missing: Authentication required');
  }
  return userId.trim();
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw validationError(`${fieldName} is required`);
  }
  return value.trim();
}

function optionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') {
    throw validationError(`${fieldName} must be a valid string`);
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function optionalInteger(value: unknown, fieldName: string): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw validationError(`${fieldName} must be a non-negative integer`);
  }
  return parsed;
}

function optionalMatterStatus(value: unknown): MatterStatus | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const normalized = String(value).trim().toUpperCase();
  if (!Object.values(MatterStatus).includes(normalized as MatterStatus)) {
    throw validationError(
      `Invalid status. Must be one of: ${Object.values(MatterStatus).join(', ')}`,
    );
  }
  return normalized as MatterStatus;
}

/**
 * Request Parsers (Hardened for RegistryService Compatibility)
 */
function parseCreateMatterBody(body: RegistryMatterCreateBody) {
  return {
    title: requireString(body.title, 'title'),
    clientId: requireString(body.clientId, 'clientId'), // Replaces legacy clientName
    branchId: requireString(body.branchId, 'branchId'), // New mandatory schema field
    description: optionalString(body.description, 'description') ?? null,
    category: optionalString(body.category, 'category') ?? null,
    practiceArea: optionalString(body.practiceArea, 'practiceArea') ?? null,
    leadAdvocateId: optionalString(body.leadAdvocateId, 'leadAdvocateId') ?? null,
    riskLevel: optionalString(body.riskLevel, 'riskLevel') ?? null,
    openedDate:
      body.openedDate === undefined || body.openedDate === null || body.openedDate === ''
        ? null
        : String(body.openedDate),
  };
}

function parseListMatterQuery(query: RegistryMatterListQuery) {
  return {
    limit: optionalInteger(query.limit, 'limit'),
    offset: optionalInteger(query.offset, 'offset'),
    status: optionalMatterStatus(query.status),
    clientId: optionalString(query.clientId, 'clientId'),
    branchId: optionalString(query.branchId, 'branchId'),
  };
}

/**
 * ENDPOINTS
 */

// GET /api/v1/registry/matters
registryRouter.get(
  '/matters',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = requireTenantId(req);
      const options = parseListMatterQuery(req.query as RegistryMatterListQuery);

      const matters = await RegistryService.listMatters(tenantId, options);

      res.status(200).json({
        success: true,
        data: matters,
        meta: {
          requestId: req.id,
          tenantId,
          limit: options.limit ?? 50,
          offset: options.offset ?? 0,
        },
      });
    } catch (error: unknown) {
      next(error);
    }
  },
);

// POST /api/v1/registry/matters
registryRouter.post(
  '/matters',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = requireTenantId(req);
      const userId = requireUserId(req);
      const payload = parseCreateMatterBody(req.body as RegistryMatterCreateBody);

      // Successfully maps to CreateRegistryMatterInput
      const matter = await RegistryService.createNewMatter(tenantId, userId, payload);

      res.status(201).json({
        success: true,
        data: matter,
        meta: {
          requestId: req.id,
          tenantId,
        },
      });
    } catch (error: unknown) {
      next(error);
    }
  },
);

export default registryRouter;