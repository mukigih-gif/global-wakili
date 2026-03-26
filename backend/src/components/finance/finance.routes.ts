import { Router } from 'express';
import { FinanceController } from '../controllers/FinanceController';
import { checkRole } from '../middleware/authMiddleware';

const router = Router();

// Staff (Requesting User) can initiate
router.post('/disburse/initiate', checkRole(['ADVOCATE', 'CLERK', 'SECRETARY_PA']), FinanceController.initiateDisbursement);

// Only Approving Users (Partner/Accountant) can view and process
router.get('/approvals/pending', checkRole(['MANAGING_PARTNER', 'ACCOUNTANT']), FinanceController.getPendingApprovals);
router.post('/approvals/:id', checkRole(['MANAGING_PARTNER', 'ACCOUNTANT']), FinanceController.processApproval);

export default router;