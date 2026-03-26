import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { InvoicingService } from '../services/InvoicingService';
import { EtimsService } from '../services/EtimsService';

const prisma = new PrismaClient();

export class FinanceController {
  /**
   * 1. INITIATE DISBURSEMENT REQUEST (DR)
   * Triggered by: Staff/Advocate (Requesting User)
   * Purpose: Requesting funds for Matter-related expenses (Court fees, etc.)
   */
  static async initiateDisbursement(req: any, res: Response) {
    const { matterId, amount, description, category } = req.body;
    const requestingUserId = req.user.id;

    // Logic: Map categories to Trust vs Office ledgers
    const trustCategories = ['COURT_FEES', 'FILING_FEES', 'STAMP_DUTY'];
    const accountType = trustCategories.includes(category) ? 'TRUST' : 'OFFICE';

    try {
      const disbursementRequest = await prisma.transaction.create({
        data: {
          amount: new Decimal(amount),
          description: `DR: ${description}`,
          type: 'DEBIT',
          accountType: accountType,
          matterId: matterId,
          userId: requestingUserId,
          status: 'PENDING_APPROVAL', // Awaiting Reviewer/Partner action
          category: category 
        }
      });
      res.json({ success: true, data: disbursementRequest });
    } catch (error) {
      res.status(500).json({ error: "Failed to initiate disbursement request." });
    }
  }

  /**
   * 2. PROCESS APPROVAL/REJECTION
   * Triggered by: Partner/Approving User
   * Action: Finalizes the transaction and updates balances.
   */
  static async processApproval(req: any, res: Response) {
    const { id } = req.params;
    const { action } = req.body; // 'APPROVE' or 'REJECT'
    const approvingUserId = req.user.id;

    try {
      const transaction = await prisma.transaction.findUnique({ 
        where: { id },
        include: { matter: true }
      });

      if (!transaction) return res.status(404).json({ error: "Transaction not found." });

      if (action === 'APPROVE') {
        // ATOMIC HANDSHAKE: Update status, log approver, and decrement balance
        await prisma.$transaction([
          prisma.transaction.update({
            where: { id },
            data: { 
              status: 'APPROVED',
              processedById: approvingUserId 
            }
          }),
          prisma.matter.update({
            where: { id: transaction.matterId },
            data: { 
              trustBalance: transaction.accountType === 'TRUST' 
                ? { decrement: transaction.amount } 
                : undefined 
            }
          })
        ]);
      } else {
        await prisma.transaction.update({
          where: { id },
          data: { status: 'REJECTED', processedById: approvingUserId }
        });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Approval processing failed. Check ledger state." });
    }
  }

  /**
   * 3. FISCALIZE INVOICE (eTIMS DRN Logic)
   * Triggered by: System/Approving User
   * Purpose: Uses the Branch Device Record Number (DRN) to sign the invoice with KRA.
   */
  static async fiscalizeInvoice(req: any, res: Response) {
    const { invoiceId } = req.params;
    
    // Fetch the specific Branch DRN for the current user's location
    const branch = await prisma.branch.findFirst({
      where: { users: { some: { id: req.user.id } } }
    });

    if (!branch?.etimsDrn) {
      return res.status(400).json({ error: "Branch Device Record Number (DRN) missing." });
    }

    try {
      // 1. Generate/Fetch Invoice details
      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      
      // 2. The DRN Handshake with KRA
      const kraResponse = await EtimsService.fiscalize({
        drn: branch.etimsDrn,
        vscuSerial: branch.vscuSerial,
        amount: invoice?.total
      });

      // 3. Finalize Invoice with KRA Control Data
      const updatedInvoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          kraControlNumber: kraResponse.controlNumber,
          etimsSignature: kraResponse.signature,
          status: 'ISSUED'
        }
      });

      res.json({ success: true, data: updatedInvoice });
    } catch (error) {
      res.status(500).json({ error: "KRA Fiscalization failed." });
    }
  }
}