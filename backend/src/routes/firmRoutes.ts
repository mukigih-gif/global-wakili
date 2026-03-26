import { Router } from 'express';
import { requireTenantRole } from '../middleware/authGuard';
// Import your controllers
import { ReportController } from '../controllers/ReportController';
import { MatterController } from '../controllers/MatterController';

const router = Router();

// ==========================================
// LAW FIRM ROUTES (Tenant Level)
// ==========================================

// Only the Managing Partner (FIRM_ADMIN) can view the Master Power House Report.
router.get('/:firmId/reports/master', 
  requireTenantRole(['FIRM_ADMIN']), 
  ReportController.getMasterReport
);

// Advocates and Admins can create new Legal Matters. Clerks cannot.
router.post('/:firmId/matters', 
  requireTenantRole(['FIRM_ADMIN', 'BRANCH_MANAGER', 'ADVOCATE']), 
  MatterController.createMatter
);

export default router;