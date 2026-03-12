import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * FINALIZED MATTER SERVICE (Global Wakili Edition)
 */
export const MatterService = {
  
  // 1. Full 360 View: Everything Koki or a Partner needs to see
  async getMatterFullView(ref) {
    try {
      return await prisma.matter.findUnique({
        where: { reference: ref },
        include: {
          client: true,
          logs: { orderBy: { createdAt: 'desc' } }, // The Audit Trail
          bringUps: { orderBy: { date: 'asc' } },    // Your Diary
          calendar: { orderBy: { startTime: 'asc' } }, // Court dates
          documents: true,
          invoices: true
        }
      });
    } catch (e) {
      console.error("360 View Error:", e.message);
    }
  },

  // 2. Professional Progress Update: Ensures we never just "change a status"
  // but always leave a "footprint" in the Audit Trail.
  async updateProgress(id, newStage, note) {
    const timestamp = new Date().toLocaleString('en-KE');
    
    return await prisma.$transaction([
      // A. Create the Audit Log
      prisma.matterLog.create({
        data: {
          matterId: id,
          type: 'STAGE_CHANGE',
          entry: `[${timestamp}] Stage moved to ${newStage}. Note: ${note}`
        }
      }),
      // B. Update the actual Matter
      prisma.matter.update({
        where: { id },
        data: { stage: newStage }
      })
    ]);
  },

  // 3. Billing Integration: Linking an M-Pesa payment to a Matter
  async linkPayment(matterId, amount, mpesaCode) {
    return await prisma.invoice.create({
      data: {
        amount,
        mpesaRef: mpesaCode,
        status: 'PAID',
        matterId
      }
    });
  }
};