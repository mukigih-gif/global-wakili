import { Router } from 'express';
import { z } from 'zod';
import { requirePermissions } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { PERMISSIONS } from '../../config/permissions';
import {
  createClient,
  getClientById,
  getClientOverview,
  listActiveClients,
  updateClient,
} from './client.controller';
import {
  getClientInternalDashboard,
  getClientPortalDashboard,
  listClientPortalMatters,
} from './client.dashboard.controller';
import { clientInputSchema } from './client.validators';

const router = Router();

const clientListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(200).optional(),
});

const portalQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(200).optional(),
  portalUserId: z.string().trim().optional(),
});

router.post(
  '/',
  requirePermissions(PERMISSIONS.client.createClient),
  validate({ body: clientInputSchema }),
  createClient,
);

router.patch(
  '/:clientId',
  requirePermissions(PERMISSIONS.client.updateClient),
  validate({ body: clientInputSchema.partial() }),
  updateClient,
);

router.get(
  '/',
  requirePermissions(PERMISSIONS.client.viewClient),
  validate({ query: clientListQuerySchema }),
  listActiveClients,
);

router.get(
  '/:clientId',
  requirePermissions(PERMISSIONS.client.viewClient),
  getClientById,
);

router.get(
  '/:clientId/overview',
  requirePermissions(PERMISSIONS.client.viewClient),
  getClientOverview,
);

router.get(
  '/:clientId/dashboard',
  requirePermissions(PERMISSIONS.client.viewClient),
  getClientInternalDashboard,
);

router.get(
  '/:clientId/portal/dashboard',
  validate({ query: portalQuerySchema }),
  getClientPortalDashboard,
);

router.get(
  '/:clientId/portal/matters',
  validate({ query: portalQuerySchema }),
  listClientPortalMatters,
);

export default router;