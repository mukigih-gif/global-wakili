import { Router } from 'express';
import { ProcurementController } from '../controllers/procurement.controller';
import { checkRole } from '../middleware/auth';

const router = Router();

router.post('/requests', ProcurementController.createRequest);
router.patch('/requests/:id/approve', checkRole(['FINANCE', 'PARTNER']), ProcurementController.approve);
router.post('/requests/:id/pay', checkRole(['FINANCE', 'PARTNER']), ProcurementController.processPayment);

export default router;