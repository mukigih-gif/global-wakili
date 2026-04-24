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

import { bindPlatformModuleEnforcement } from '../../middleware/platform/module-enforcement';
import { platformFeatureFlag } from '../../middleware/platform-feature-flag.middleware';
import { PLATFORM_FEATURE_KEYS } from '../platform/PlatformFeatureKeys';
const router = Router();

bindPlatformModuleEnforcement(router, {
  moduleKey: 'document',
  metricType: 'FILE_STORAGE',
});

const documentSecureFileOpsFeature = platformFeatureFlag(
  PLATFORM_FEATURE_KEYS.DOCUMENT_SECURE_FILE_OPERATIONS,
  'document',
);

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
  documentSecureFileOpsFeature,
  requirePermissions(PERMISSIONS.document.updateContract),
  validate({ body: contractUpdateSchema }),
  updateContract,
);

router.get(
  '/:contractId',
  documentSecureFileOpsFeature,
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
  documentSecureFileOpsFeature,
  requirePermissions(PERMISSIONS.document.versionContract),
  validate({ body: contractVersionCreateSchema.omit({ contractId: true }) }),
  addContractVersion,
);

router.get(
  '/:contractId/versions/latest',
  documentSecureFileOpsFeature,
  requirePermissions(PERMISSIONS.document.viewContract),
  getLatestContractVersion,
);

router.get(
  '/:contractId/versions',
  documentSecureFileOpsFeature,
  requirePermissions(PERMISSIONS.document.viewContract),
  getContractVersionHistory,
);

export default router;