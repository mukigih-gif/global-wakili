import { Router } from 'express';
import { TransactionController } from '../controllers/TransactionController';

const router = Router();

/**
 * @route   POST /api/transactions
 * @desc    Record a new Credit/Debit for a Matter and update Account balances
 */
router.post('/', TransactionController.create);

/**
 * @route   GET /api/transactions/matter/:matterId
 * @desc    Fetch the raw transaction history for a specific case
 */
router.get('/matter/:matterId', TransactionController.getByMatter);

export default router;