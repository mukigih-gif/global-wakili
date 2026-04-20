import { Request, Response } from 'express';
import { z } from 'zod'; // Enterprise-grade validation
import { TrialBalanceService } from '../services/finance/TrialBalanceService';
import { ReportingService } from '../services/finance/ReportingService';
import { FinanceService } from '../services/finance/finance.service';
import { EtimsService } from '../services/finance/etims.service';
import { UserRole } from '@prisma/client';

// 🛡️ VALIDATION SCHEMAS
const TransferSchema = z.object({
  matterId: z.string().cuid(),
  amount: z.number().positive(),
  reason: z.string().min(5).max(255)
});

const DisbursementSchema = z.object({
  matterId: z.string().cuid(),
  amount: z.number().positive(),
  category: z.enum(['COURT_FEES', 'STAMP_DUTY', 'TRAVEL', 'ADMIN']),
  description: z.string().min(3)
});

export class FinanceController {
  
  /**
   * 📊 TRIAL BALANCE (RBAC PROTECTED)
   */
  static async trialBalance(req: Request, res: Response) {
    try {
      // 🛡️ ROLE GUARD: Only Partners and Accountants
      if (![UserRole.PARTNER, UserRole.ACCOUNTANT].includes(req.context.actor.role)) {
        return res.status(403).json({ error: "Access Denied: Financial Authority Required" });
      }

      const asOf = req.query.date ? new Date(req.query.date as string) : new Date();
      const data = await TrialBalanceService.generate(req.context, asOf);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ error: "Trial Balance Sync Error" });
    }
  }

  /**
   * 💸 TRUST-TO-OFFICE TRANSFER (CRITICAL SECURITY)
   */
  static async transferFees(req: Request, res: Response) {
    try {
      // 1. Validate Input Structure & Logic (Positive only)
      const validated = TransferSchema.parse(req.body);

      // 2. Execute with Atomic Locking and Forensic Audit
      const result = await FinanceService.transferTrustToOffice(
        req.context, 
        validated.matterId, 
        validated.amount
      );

      res.json({ success: true, data: result });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation Failed", details: error.errors });
      }
      res.status(500).json({ 
        error: "Fee Transfer Blocked", 
        message: error.message || "Internal Ledger Conflict" 
      });
    }
  }

  /**
   * 🇰🇪 KRA ETIMS FISCALIZATION (EXTERNAL INTEGRATION HARDENING)
   */
  static async fiscalizeInvoice(req: Request, res: Response) {
    try {
      const { invoiceId } = req.params;
      
      // Attempt transmission with idempotent check inside service
      const result = await EtimsService.transmit(req.context, invoiceId);
      
      res.json({ 
        success: true, 
        message: "Invoice successfully fiscalized with KRA",
        controlNumber: result.kraControlNumber 
      });
    } catch (error: any) {
      // Differentiate between KRA downtime and internal data errors
      const status = error.isNetworkError ? 503 : 400;
      res.status(status).json({ 
        error: "KRA Transmission Failed", 
        retryable: !!error.isNetworkError,
        message: error.message 
      });
    }
  }

  /**
   * 📁 OPERATIONAL DISBURSEMENTS
   */
  static async initiateDisbursement(req: Request, res: Response) {
    try {
      const validated = DisbursementSchema.parse(req.body);
      
      const result = await FinanceService.recordDisbursement(req.context, validated);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ error: "Disbursement Rejected", details: error.message });
    }
  }
}