import { Router } from 'express';
import { FinanceController } from '../controllers/FinanceController';

const router = Router();

router.get('/summary', FinanceController.getSummary);
router.get('/lawyer-revenue', FinanceController.getLawyerRevenue);
router.get('/trends', FinanceController.getTrends);
router.get('/productivity', FinanceController.getProductivity);
router.get('/category-revenue', FinanceController.getCategoryRevenue);
router.get('/ledger/:id', FinanceController.getMatterLedger);
export default router;