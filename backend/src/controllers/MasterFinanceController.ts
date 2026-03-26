import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { InvoicingService } from '../services/InvoicingService';
import { EtimsService } from '../services/EtimsService';
import { NotificationService } from '../services/NotificationService';

const prisma = new PrismaClient();

/**
 * MASTER FINANCE CONTROLLER: Global Wakili 2026
 * Validated for: KRA eTIMS (DRN), Staff Disbursements (DR), and Atomic Ledgers.
 */
export class MasterFinanceController {

  /**
   * 1. INITIATE DISBURSEMENT REQUEST (DR)
   * Role: Staff / Advocate (Requesting User)
   * Purpose: Request funds for Court Fees, Stamp Duty, or Travel.
   */
  static async initiateDisbursement(req: any, res: Response) {
    const { matterId, amount, description, category } = req.body;
    const requestingUserId = req.user.id;

    // Logic: Map categories to Trust vs Office ledgers for Kenya Law Firm Standards
    const trustCategories = ['COURT_FEES', 'FILING_FEES', 'STAMP_DUTY', 'LAND_REGISTRY'];
    const accountType = trustCategories.includes(category) ? 'TRUST' : 'OFFICE';

    try {
      const dr = await prisma.transaction.create({
        data: {
          amount: new Decimal(amount),
          description: `DR: ${description}`,
          type: 'DEBIT',
          accountType: accountType,
          matterId: matterId,
          userId: requestingUserId,
          status: 'PENDING_APPROVAL', // Stanley/Partner Review Queue
          category: category 
        }
      });
      return res.status(201).json({ success: true, drId: dr.id });
    } catch (error) {
      return res.status(500).json({ error: "Failed to initiate disbursement request." });
    }
  }

  /**
   * 2. PROCESS APPROVAL/REJECTION
   * Role: Partner / Managing User
   * Action: Finalizes the internal cash movement.
   */
  static async processApproval(req: any, res: Response) {
    const { id } = req.params;
    const { action } = req.body; // 'APPROVE' or 'REJECT'
    const approvingUserId = req.user.id;

    try {
      const txRequest = await prisma.transaction.findUnique({ 
        where: { id },
        include: { matter: true }
      });

      if (!txRequest) return res.status(404).json({ error: "Request not found." });

      if (action === 'APPROVE') {
        // ATOMIC TRANSACTION: Ensure status and ledger update together
        await prisma.$transaction([
          prisma.transaction.update({
            where: { id },
            data: { status: 'APPROVED', processedById: approvingUserId }
          }),
          prisma.matter.update({
            where: { id: txRequest.matterId },
            data: { 
              trustBalance: txRequest.accountType === 'TRUST' 
                ? { decrement: txRequest.amount } 
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
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: "Approval failed. Check matter balances." });
    }
  }

  /**
   * 3. FISCALIZE & DISPATCH INVOICE (DRN Logic)
   * Role: System / Approving User
   * Logic: Signs with KRA eTIMS -> Updates Invoice -> Notifies Client.
   */
  static async fiscalizeAndNotify(req: any, res: Response) {
    const { invoiceId } = req.params;
    const activeUserId = req.user.id;

    try {
      // A. Pull the Branch DRN (Device Record Number) for this user's location
      const branch = await prisma.branch.findFirst({
        where: { users: { some: { id: activeUserId } } }
      });

      if (!branch?.etimsDrn) {
        return res.status(400).json({ error: "Branch KRA DRN not configured." });
      }

      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) return res.status(404).json({ error: "Invoice not found." });

      // B. THE eTIMS HANDSHAKE (The DRN Logic)
      const kraResponse = await EtimsService.fiscalize({
        drn: branch.etimsDrn,
        vscuSerial: branch.vscuSerial,
        amount: invoice.total,
        invoiceNumber: invoice.invoiceNumber
      });

      // C. ATOMIC UPDATE & CLIENT DISPATCH
      const updatedInvoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          kraControlNumber: kraResponse.controlNumber,
          etimsSignature: kraResponse.signature,
          status: 'ISSUED',
          notificationSentAt: new Date()
        }
      });

      // D. ASYNC NOTIFICATION (Email + Portal Alert)
      await NotificationService.sendInvoiceNotification(updatedInvoice.id);

      return res.json({ 
        success: true, 
        kraControlNumber: updatedInvoice.kraControlNumber,
        message: "Invoice fiscalized and dispatched to client."
      });
    } catch (error: any) {
      return res.status(500).json({ error: `Fiscalization Error: ${error.message}` });
    }
  }

  /**
   * 4. GET PENDING QUEUE
   * Role: Approving User
   */
  static async getPendingQueue(req: any, res: Response) {
    try {
      const pending = await prisma.transaction.findMany({
        where: { status: 'PENDING_APPROVAL' },
        include: { matter: true, user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(pending);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch queue." });
    }
  }
}