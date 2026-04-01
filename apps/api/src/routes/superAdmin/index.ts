import { Router } from 'express';
import tenantsRouter from './tenants';
import auditRouter from './audit';
import { requireSuperAdmin } from '../../middleware/superAdminAuth';

const router = Router();

router.use(requireSuperAdmin);
router.use('/tenants', tenantsRouter);
router.use('/audit', auditRouter);

export default router;