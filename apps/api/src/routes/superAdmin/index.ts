// apps/api/src/routes/superAdmin/index.ts

import { Router } from 'express';

import tenantRouter from './tenant';

const router = Router();

router.use('/tenants', tenantRouter);

export default router;