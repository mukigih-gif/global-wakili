// src/controllers/PortalController.ts
import { Request, Response } from 'express';
import { PrismaClient, TransactionType, InvoiceStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { MpesaService } from '../services/MpesaService';

const prisma = new PrismaClient();

export class PortalController {
  /**
   * 1. GET CLIENT DASHBOARD
   * Comprehensive "At a Glance" view for the home screen.
   */
  static async getClientDashboard(req: any, res: Response) {
    const { clientId } = req.user; 

    try {
      const dashboardData = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          matters: {
            select: {
              id: true,
              title: true,
              fileNumber: true,
              status: true,
              trustBalance: true,
              nextActionDate: true,
              // Only pull visible documents
              documents: {
                where: { isClientVisible: true },
                orderBy: { createdAt: 'desc' },
                take: 5
              },
              invoices: {
                where: { status: { not: 'CANCELLED' } },
                orderBy: { dueDate: 'asc' },
                take: 5
              }
            }
          }
        }
      });

      if (!dashboardData) return res.status(404).json({ error: "Profile not found." });
      res.json(dashboardData);
    } catch (error) {
      res.status(500).json({ error: "Failed to load dashboard." });
    }
  }

  /**
   * 2. GET CLIENT MATTERS (List View)
   * Returns filtered matters with detailed document and message history.
   */
  static async getClientMatters(req: any, res: Response) {
    const { clientId } = req.user;

    try {
      const matters = await prisma.matter.findMany({
        where: { clientId },
        select: {
          id: true,
          title: true,
          fileNumber: true,
          status: true,
          nextActionDate: true,
          trustBalance: true,
          documents: {
            where: { isClientVisible: true },
            select: { id: true, fileName: true, fileUrl: true, createdAt: true }
          },
          invoices: {
            select: { id: true, invoiceNumber: true, total: true, status: true, dueDate: true }
          },
          comments: {
            orderBy: { createdAt: 'desc' },
            take: 15
          }
        }
      });
      res.json(matters);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch matters." });
    }
  }

  /**
   * 3. INITIATE PAYMENT (STK PUSH)
   * Securely triggers M-Pesa for a specific client invoice.
   */
  static async makePaymentSTK(req: any, res: Response) {
    const { invoiceId, phoneNumber } = req.body;
    const { clientId } = req.user;

    try {
      const invoice = await prisma.invoice.findFirst({
        where: { 
          id: invoiceId, 
          matter: { clientId: clientId } 
        }
      });

      if (!invoice) return res.status(404).json({ error: "Invoice not found or access denied." });

      const response = await MpesaService.initiateSTKPush({
        amount: Number(invoice.total),
        phone: phoneNumber || req.user.phone,
        reference: invoice.invoiceNumber,
        description: `Legal Fees: ${invoice.invoiceNumber}`
      });

      res.json({ success: true, checkoutID: response.CheckoutRequestID });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * 4. MPESA CALLBACK (The Reconciliation Engine)
   * Updates Invoice, Matter Trust Balance, and Audit Logs simultaneously.
   */
  static async mpesaCallback(req: Request, res: Response) {
    const { Body } = req.body;
    
    // ResultCode 0 = Success in Safaricom world
    if (Body.stkCallback.ResultCode === 0) {
      const metadata = Body.stkCallback.CallbackMetadata.Item;
      const amount = metadata.find((i: any) => i.Name === 'Amount').Value;
      const mpesaCode = metadata.find((i: any) => i.Name === 'MpesaReceiptNumber').Value;
      const invoiceNumber = Body.stkCallback.ExternalReference;

      try {
        await prisma.$transaction(async (tx) => {
          const invoice = await tx.invoice.findUnique({
            where: { invoiceNumber },
            include: { matter: true }
          });

          if (invoice) {
            // Update Invoice Status
            await tx.invoice.update({
              where: { id: invoice.id },
              data: { 
                status: 'FULLY_PAID', 
                mpesaReceipt: mpesaCode,
                paidAt: new Date() 
              }
            });

            // Update Matter Trust Wallet
            await tx.matter.update({
              where: { id: invoice.matterId },
              data: { trustBalance: { increment: new Decimal(amount) } }
            });

            // Create Immutable Audit Trail
            await tx.transaction.create({
              data: {
                amount: new Decimal(amount),
                description: `M-Pesa Payment Received: ${mpesaCode}`,
                type: 'TRUST_DEPOSIT',
                reference: mpesaCode,
                matterId: invoice.matterId,
                userId: "SYSTEM_MPESA" // Distinct ID for automated entries
              }
            });
          }
        });
        console.log(`✅ Automated Reconciliation: ${mpesaCode} for Inv ${invoiceNumber}`);
      } catch (dbError) {
        console.error("❌ Callback DB Transaction Failed:", dbError);
      }
    } else {
      console.warn(`⚠️ Payment Cancelled/Failed: ${Body.stkCallback.ResultDesc}`);
    }

    // Always respond to Safaricom with success to acknowledge receipt of the callback
    res.json({ ResultCode: 0, ResultDesc: "Success" });
  }
}