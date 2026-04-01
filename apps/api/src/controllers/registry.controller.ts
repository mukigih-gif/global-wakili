// apps/api/src/routes/registry.controller.ts
import { Router, Response, NextFunction } from 'express';
import { RegistryService } from '../../../../packages/core/registry/services/RegistryService';
import { CreateMatterSchema } from '../../../../packages/common/dto/registry.dto';
import { validationError } from '../../../../packages/core/exceptions/ErrorHandler';
import { unifiedTenancy } from '../middleware/unified-tenancy';

export const registryRouter = Router();

// Apply the World Champion Gate to all routes in this router
registryRouter.use(unifiedTenancy);

// GET /api/v1/registry/matters
registryRouter.get('/matters', async (req: any, res: Response, next: NextFunction) => {
  try {
    // CHAMPION MOVE: Pass req.db (already pre-filtered for the tenant)
    const matters = await RegistryService.listMatters(req.db);
    res.json({ success: true, data: matters });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/registry/matters
registryRouter.post('/matters', async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(validationError('User context missing'));

    const validated = CreateMatterSchema.parse(req.body);

    // Pass req.db and let the scoped client handle the tenantId automatically
    const matter = await RegistryService.createNewMatter(req.db, userId, validated);
    res.status(201).json({ success: true, data: matter });
  } catch (error) {
    next(error);
  }
});