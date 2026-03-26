// src/routes/portalRoutes.ts
import { Router } from 'express';
import { PortalController } from '../controllers/PortalController';
import { StatementService } from '../services/StatementService';
import { authenticateClient } from '../middleware/auth'; // Ensure this exists

const router = Router();

/**
 * PUBLIC ROUTES
 * Safaricom needs to reach this without a JWT.
 */
router.post('/mpesa-callback', PortalController.mpesaCallback);


/**
 * PROTECTED CLIENT ROUTES
 * Requires JWT via authenticateClient middleware
 */
router.use(authenticateClient);

// 1. Dashboard & Core Views
router.get('/dashboard', PortalController.getClientDashboard);
router.get('/matters', PortalController.getClientMatters);

// 2. Financial Actions
router.post('/pay-invoice', PortalController.makePaymentSTK);

// 3. Document & Statement Generation
router.get('/statement/:matterId', async (req: any, res) => {
  try {
    // Extract clientId from the decoded JWT (via authenticateClient)
    const clientId = req.user.clientId; 
    const { matterId } = req.params;
    
    await StatementService.generateMatterStatement(matterId, clientId, res);
  } catch (err: any) {
    console.error("[STATEMENT_ROUTE_ERROR]:", err.message);
    res.status(500).json({ error: "Failed to stream PDF statement." });
  }
});

export default router;