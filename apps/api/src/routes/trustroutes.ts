import { Router } from 'express';
import { TrustController } from './trust.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { trustSchemas } from '../validations/trust.schema';
import { UserRole } from '@prisma/client';

const router = Router();

// 📁 Global Protection: Authentication Required
router.use(authenticate);

// 🔍 BALANCE: Partners, Accountants, and Lawyers
router.get('/balance/:clientId', 
  authorize([UserRole.PARTNER, UserRole.ACCOUNTANT, UserRole.LAWYER]),
  TrustController.balance
);

// 📥 DEPOSIT: Accountants and Partners
router.post('/deposit', 
  authorize([UserRole.PARTNER, UserRole.ACCOUNTANT]),
  validate(trustSchemas.deposit),
  TrustController.deposit
);

// 📤 WITHDRAWAL: PARTNER ONLY (High-Risk Action)
router.post('/withdraw', 
  authorize([UserRole.PARTNER]), 
  validate(trustSchemas.withdraw),
  TrustController.withdraw
);

// ⚖️ RECONCILE: Partners and Accountants
router.get('/reconcile', 
  authorize([UserRole.PARTNER, UserRole.ACCOUNTANT]),
  TrustController.reconcile
);

// 📖 LEDGER: Paged and Authorized
router.get('/ledger/:clientId', 
  authorize([UserRole.PARTNER, UserRole.ACCOUNTANT, UserRole.LAWYER]),
  validate(trustSchemas.ledgerQuery),
  TrustController.ledger
);

export default router;