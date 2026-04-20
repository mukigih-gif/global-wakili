// apps/api/src/routes/finance.routes.ts
import { Router } from 'express';
import { FinanceWrapper } from '../services/finance/finance-wrapper.service';
import { checkRole } from '../middleware/auth';

const router = Router();

// Chief Accountant: Verification Stage
router.post('/verify/:module/:id', checkRole(['CHIEF_ACCOUNTANT']), async (req, res) => {
  const result = await FinanceWrapper.executeWorkflow(
    { actor: req.user, tenantId: req.tenant.id, req },
    { module: req.params.module as any, action: 'VERIFY', targetId: req.params.id }
  );
  res.json(result);
});

// CFO/Partner: Final Approval Stage
router.post('/approve/:module/:id', checkRole(['CFO', 'PARTNER']), async (req, res) => {
  const result = await FinanceWrapper.executeWorkflow(
    { actor: req.user, tenantId: req.tenant.id, req },
    { module: req.params.module as any, action: 'APPROVE', targetId: req.params.id }
  );
  res.json(result);
});

export default router;