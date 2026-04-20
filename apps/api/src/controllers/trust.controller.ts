import { Request, Response } from 'express';
import { z } from 'zod';
import { TrustAccountService } from '../../services/finance/trust-account.service';
import { TrustReconciliationService } from '../../services/finance/trust-reconciliation.service';
import { ClientLedgerService } from '../../services/finance/client-ledger.service';
import { UserRole } from '@prisma/client';

// 🛡️ FINANCIAL VALIDATION SCHEMAS
const TrustActionSchema = z.object({
  clientId: z.string().cuid(),
  matterId: z.string().cuid(),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  reference: z.string().min(3).max(50),
});

const LedgerQuerySchema = z.object({
  limit: z.coerce.number().optional().default(50),
  offset: z.coerce.number().optional().default(0),
  matterId: z.string().cuid().optional(),
});

export class TrustController {

  /**
   * 🏦 GET CLIENT BALANCE
   * Restricted to: Partners, Accountants, and Assigned Lawyers
   */
  static async balance(req: Request, res: Response) {
    try {
      const { clientId } = req.params;
      const data = await TrustAccountService.getClientBalance(req.context, clientId);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ error: "Could not retrieve trust balance" });
    }
  }

  /**
   * 📥 RECEIVE DEPOSIT
   * Restricted to: Partners and Accountants
   */
  static async deposit(req: Request, res: Response) {
    try {
      this.authorize(req, [UserRole.PARTNER, UserRole.ACCOUNTANT]);
      const validated = TrustActionSchema.parse(req.body);

      const result = await TrustAccountService.deposit(req.context, {
        ...validated,
        amount: new (validated.amount as any)
      });
      
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      this.handleError(res, error, "Deposit failed");
    }
  }

  /**
   * 📤 EXECUTE WITHDRAWAL
   * Restricted to: Partners (Requires Highest Authority)
   */
  static async withdraw(req: Request, res: Response) {
    try {
      this.authorize(req, [UserRole.PARTNER]);
      const validated = TrustActionSchema.parse(req.body);

      const result = await TrustAccountService.withdraw(req.context, {
        ...validated,
        amount: new (validated.amount as any)
      });

      res.json({ success: true, data: result });
    } catch (error: any) {
      this.handleError(res, error, "Withdrawal blocked");
    }
  }

  /**
   * ⚖️ PERFORM RECONCILIATION
   * Restricted to: Partners and Accountants
   */
  static async reconcile(req: Request, res: Response) {
    try {
      this.authorize(req, [UserRole.PARTNER, UserRole.ACCOUNTANT]);
      const asOf = req.query.asOf ? new Date(req.query.asOf as string) : new Date();
      
      const result = await TrustReconciliationService.reconcile(req.context, asOf);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ error: "Reconciliation engine error" });
    }
  }

  /**
   * 📖 VIEW CLIENT LEDGER
   * Includes pagination and matter filtering
   */
  static async ledger(req: Request, res: Response) {
    try {
      const { clientId } = req.params;
      const query = LedgerQuerySchema.parse(req.query);

      const data = await ClientLedgerService.getLedger(req.context, {
        clientId,
        ...query
      });

      res.json({ success: true, data });
    } catch (error: any) {
      this.handleError(res, error, "Ledger retrieval failed");
    }
  }

  // 🛡️ PRIVATE UTILITIES
  private static authorize(req: Request, allowedRoles: UserRole[]) {
    if (!allowedRoles.includes(req.context.actor.role)) {
      throw new Error("UNAUTHORIZED_FINANCIAL_ACTION");
    }
  }

  private static handleError(res: Response, error: any, defaultMsg: string) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation Error", details: error.errors });
    }
    if (error.message === "UNAUTHORIZED_FINANCIAL_ACTION") {
      return res.status(403).json({ error: "Access Denied: Insufficient permissions for trust movements" });
    }
    res.status(500).json({ error: defaultMsg, message: error.message });
  }
}