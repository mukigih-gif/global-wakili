import { Request, Response } from 'express';
import { z } from 'zod';
import { BillingService } from '../../services/finance/billing.service';
import { DisbursementService } from '../../services/finance/disbursement.service';

const ProformaSchema = z.object({
  clientId: z.string().cuid(),
  matterId: z.string().cuid()
});

export class BillingController {
  
  static async generateProforma(req: Request, res: Response) {
    try {
      const validated = ProformaSchema.parse(req.body);
      const invoice = await BillingService.generateProforma(req.context, validated);
      res.status(201).json({ success: true, data: invoice });
    } catch (error: any) {
      res.status(400).json({ error: "Failed to generate draft", details: error.message });
    }
  }

  static async finalizeInvoice(req: Request, res: Response) {
    try {
      const { invoiceId } = req.params;
      const invoice = await BillingService.finalizeInvoice(req.context, invoiceId);
      res.json({ success: true, data: invoice });
    } catch (error: any) {
      res.status(400).json({ error: "Finalization blocked", details: error.message });
    }
  }

  static async recordDisbursement(req: Request, res: Response) {
    try {
      const disbursement = await DisbursementService.recordDisbursement(req.context, req.body);
      res.status(201).json({ success: true, data: disbursement });
    } catch (error: any) {
      res.status(400).json({ error: "Disbursement failed", details: error.message });
    }
  }
}