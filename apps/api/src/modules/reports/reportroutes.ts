import { Router } from 'express';
import { getTrialBalance } from './trial-balance.service';
import { getCashFlow } from './cashflow.service';

const router = Router();

router.get('/trial-balance', async (req, res) => {
  const data = await getTrialBalance(req.tenantId);
  res.json(data);
});

router.get('/cashflow', async (req, res) => {
  const data = await getCashFlow(req.tenantId);
  res.json(data);
});

export default router;