// apps/api/src/routes/finance-reports.routes.ts
import { Router } from 'express';
import { FinanceExportService } from '../services/finance/FinanceExportService';
import { checkRole } from '../middleware/auth';

const router = Router();

router.get('/export/liquidity/excel', checkRole(['CFO', 'PARTNER']), (req, res) => {
  FinanceExportService.exportLiquidityExcel(req.tenant.id, res);
});

router.get('/export/profitability/pdf', checkRole(['CFO', 'PARTNER']), (req, res) => {
  const range = {
    start: new Date(req.query.start as string),
    end: new Date(req.query.end as string)
  };
  FinanceExportService.exportProfitabilityPDF(req.tenant.id, range, res);
});

export default router;