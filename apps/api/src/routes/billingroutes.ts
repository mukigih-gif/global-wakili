import { Router } from 'express';
import { BillingController } from '../../controllers/finance/billing.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

// 📑 DRAFTS: Lawyers and Accountants can draft
router.post('/proforma', 
  authorize([UserRole.PARTNER, UserRole.ACCOUNTANT, UserRole.LAWYER]), 
  BillingController.generateProforma
);

// 🧾 FINALIZE: Strict GL Impact, restricted to Finance/Partners
router.post('/finalize/:invoiceId', 
  authorize([UserRole.PARTNER, UserRole.ACCOUNTANT]), 
  BillingController.finalizeInvoice
);

// 💸 DISBURSEMENTS: Authorized spenders
router.post('/disbursement', 
  authorize([UserRole.PARTNER, UserRole.ACCOUNTANT, UserRole.LAWYER]), 
  BillingController.recordDisbursement
);

export default router;