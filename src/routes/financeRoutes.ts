import { Router } from 'express';
import { FinanceController } from '../controllers/FinanceController';

const router = Router();

/**
 * @route   GET /api/finance/ledger/:matterId
 * @desc    Get the unified statement of account
 */
router.get('/ledger/:matterId', FinanceController.getLedger);

/**
 * @route   POST /api/finance/drawdown
 * @desc    Process a Trust-to-Office transfer
 */
router.post('/drawdown', FinanceController.handleDrawdown);

export default router;