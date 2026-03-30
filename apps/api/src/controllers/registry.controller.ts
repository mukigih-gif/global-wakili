import { Router, Request, Response, NextFunction } from 'express';
// Navigate up to root: ../../../../ then into packages/
import { RegistryService } from '../../../../packages/core/registry/services/RegistryService';
import { CreateMatterSchema } from '../../../../packages/common/dto/registry.dto';
import { validationError } from '../../../../packages/core/exceptions/ErrorHandler';

export const registryRouter = Router();

/**
 * Helper to extract typed user from request
 * (Assumes authMiddleware attaches user: { id, tenantId, role, ... })
 */
type AuthRequest = Request & { user?: { id: string; tenantId: string; role?: string } };

// GET /api/v1/registry/matters
registryRouter.get('/matters', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return next(validationError('Missing tenant context'));

    const matters = await RegistryService.listMatters(tenantId);
    res.json({ success: true, data: matters });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/registry/matters
registryRouter.post('/matters', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return next(validationError('Missing tenant or user context'));

    // Validate payload using shared Zod schema
    const validated = CreateMatterSchema.parse(req.body);

    const matter = await RegistryService.createMatter(tenantId, userId, validated);
    res.status(201).json({ success: true, data: matter });
  } catch (error: any) {
    // Zod validation errors are thrown as exceptions; map them to 422
    if (error?.name === 'ZodError') {
      return next(validationError('Invalid payload', error.errors));
    }
    next(error);
  }
});