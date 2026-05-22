import { Router, type Request, type Response } from 'express';

import { PERMISSIONS } from '../../config/permissions';
import { requirePermissions } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import {
  changeVendorStatus,
  createVendor,
  getVendorById,
  listActiveVendors,
  listVendors,
  updateVendor,
} from './vendor.controller';
import {
  vendorInputSchema,
  vendorListQuerySchema,
  vendorStatusUpdateSchema,
  vendorUpdateSchema,
} from './vendor.validators';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'vendor',
    status: 'mounted',
    persistenceModel: 'Supplier',
    timestamp: new Date().toISOString(),
  });
});

router.post(
  '/',
  requirePermissions(PERMISSIONS.procurement.createVendor),
  validate({ body: vendorInputSchema }),
  createVendor,
);

router.get(
  '/',
  requirePermissions(PERMISSIONS.procurement.viewVendor),
  validate({ query: vendorListQuerySchema }),
  listVendors,
);

router.get(
  '/active',
  requirePermissions(PERMISSIONS.procurement.viewVendor),
  listActiveVendors,
);

router.patch(
  '/:vendorId/status',
  requirePermissions(PERMISSIONS.procurement.updateVendor),
  validate({ body: vendorStatusUpdateSchema }),
  changeVendorStatus,
);

router.patch(
  '/:vendorId',
  requirePermissions(PERMISSIONS.procurement.updateVendor),
  validate({ body: vendorUpdateSchema }),
  updateVendor,
);

router.get(
  '/:vendorId',
  requirePermissions(PERMISSIONS.procurement.viewVendor),
  getVendorById,
);

router.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    module: 'vendor',
    error: 'Vendor route not found',
    code: 'VENDOR_ROUTE_NOT_FOUND',
    path: req.originalUrl,
  });
});

export default router;
