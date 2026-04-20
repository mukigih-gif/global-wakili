import { Router } from 'express';
import { z } from 'zod';
import { requirePermissions } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { PERMISSIONS } from '../../config/permissions';
import {
  createContract,
  updateContract,
  getContractById,
  listMatterContracts,
  addContractVersion,
  getLatestContractVersion,
  getContractVersionHistory,
} from './contract.controller';
import {
  contractCreateSchema,
  contractUpdateSchema,
  contractVersionCreateSchema,
} from './contract.validators';

const router = Router();

const listMatterContractsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.string().trim().max(100).optional(),
});

router.post(
  '/',
  requirePermissions(PERMISSIONS.document.createContract),
  validate({ body: contractCreateSchema }),
  createContract,
);

router.patch(
  '/:contractId',
  requirePermissions(PERMISSIONS.document.updateContract),
  validate({ body: contractUpdateSchema }),
  updateContract,
);

router.get(
  '/:contractId',
  requirePermissions(PERMISSIONS.document.viewContract),
  getContractById,
);

router.get(
  '/matter/:matterId',
  requirePermissions(PERMISSIONS.document.viewContract),
  validate({ query: listMatterContractsQuerySchema }),
  listMatterContracts,
);

router.post(
  '/:contractId/versions',
  requirePermissions(PERMISSIONS.document.versionContract),
  validate({ body: contractVersionCreateSchema.omit({ contractId: true }) }),
  addContractVersion,
);

router.get(
  '/:contractId/versions/latest',
  requirePermissions(PERMISSIONS.document.viewContract),
  getLatestContractVersion,
);

router.get(
  '/:contractId/versions',
  requirePermissions(PERMISSIONS.document.viewContract),
  getContractVersionHistory,
);

export default router;