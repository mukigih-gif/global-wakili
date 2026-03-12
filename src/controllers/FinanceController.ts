import { Request, Response } from 'express';
import { FinanceService } from '../services/FinanceService';

export const FinanceController = {
  /**
   * GET /api/finance/ledger/:matterId
   * Fetches the unified statement of account for a matter
   */
  async getLedger(req: Request, res: Response) {
    try {
      const matterId = parseInt(req.params.matterId);
      if (isNaN(matterId)) return res.status(400).json({ error: "Invalid Matter ID" });

      const ledgerData = await FinanceService.getMatterLedger(matterId);
      res.json(ledgerData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * POST /api/finance/drawdown
   * Processes a Trust-to-Office fund transfer
   */
  async handleDrawdown(req: Request, res: Response) {
    try {
      const { invoiceId, trustAccountId, officeAccountId } = req.body;

      if (!invoiceId || !trustAccountId || !officeAccountId) {
        return res.status(400).json({ error: "Missing required account IDs or Invoice ID" });
      }

      const result = await FinanceService.processDrawdown(
        invoiceId, 
        trustAccountId, 
        officeAccountId
      );
      
      res.status(200).json({ message: "Drawdown successful", data: result });
    } catch (error: any) {
      // This will catch the "Insufficient Trust Funds" error from our Service
      res.status(400).json({ error: error.message });
    }
  }
};