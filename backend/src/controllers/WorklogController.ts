// src/controllers/WorklogController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export class WorklogController {
  /**
   * CREATE WORKLOG ENTRY (Merged Logic)
   * Unified entry point for advocates to log billable and non-billable time.
   */
  static async createEntry(req: any, res: Response) {
    const { matterId, durationMinutes, description, isBillable } = req.body;
    const userId = req.user.id; // From JWT Auth Middleware

    try {
      // 1. Fetch User details to get the specific hourly rate
      const user = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { hourlyRate: true } 
      });

      if (!user) return res.status(404).json({ error: "Advocate profile not found." });

      // 2. Calculate Billable Amount using Decimal for financial precision
      // (Standard JS math can cause rounding errors on fractions of an hour)
      const rate = new Decimal(user.hourlyRate || 0);
      const billableAmount = isBillable 
        ? rate.mul(new Decimal(durationMinutes).div(60)) 
        : new Decimal(0);

      // 3. Create the log entry with full matter context
      const entry = await prisma.worklog.create({
        data: {
          matterId,
          userId,
          description,
          durationMinutes: parseInt(durationMinutes),
          billableAmount,
          status: isBillable ? 'PENDING_INVOICE' : 'NON_BILLABLE'
        },
        include: {
          matter: {
            select: { fileNumber: true, title: true }
          }
        }
      });

      res.json({ 
        success: true, 
        message: "Worklog recorded successfully",
        entry 
      });

    } catch (error: any) {
      console.error("[WORKLOG_ERROR]:", error.message);
      res.status(500).json({ error: "Failed to record worklog entry." });
    }
  }

  /**
   * GET MATTER WORKLOGS
   * Used for 'Invoice Previews' and internal audits.
   */
  static async getMatterLogs(req: any, res: Response) {
    const { matterId } = req.params;

    try {
      const logs = await prisma.worklog.findMany({
        where: { matterId },
        orderBy: { createdAt: 'desc' },
        include: { 
          user: { select: { name: true } } 
        }
      });
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch matter logs." });
    }
  }
}