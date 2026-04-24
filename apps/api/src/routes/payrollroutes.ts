import { Router } from 'express';
import { PayrollController } from '../controllers/payroll.controller';
import { checkRole } from '../middleware/auth';

const router = Router();

// Only Partners/Finance can trigger or approve payroll
router.post('/generate', checkRole(['PARTNER', 'FINANCE']), PayrollController.generate);
router.patch('/:id/approve', checkRole(['PARTNER']), PayrollController.approve);
router.get('/:id/export-bank', checkRole(['PARTNER', 'FINANCE']), PayrollController.exportBankCSV);

export default router;