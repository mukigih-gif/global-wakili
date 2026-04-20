import { Decimal } from '@prisma/client/runtime/library';

export class CommissionService {
  /**
   * 📈 CALCULATE PROJECTED EARNINGS
   * Links a TimeEntry to the commission structure to show "Accrued Income" for the lawyer.
   */
  static async syncTimeCommission(context: { tenantId: string; req: any }, timeEntryId: string) {
    const db = context.req.db;

    const entry = await db.timeEntry.findUnique({
      where: { id: timeEntryId },
      include: { matter: { include: { commissionStructure: true } } }
    });

    if (!entry || !entry.matter.commissionStructure) return null;

    const totalValue = new Decimal(entry.hours).mul(entry.rate || 0);
    const structure = entry.matter.commissionStructure;

    // Calculate Splits
    const originatorShare = totalValue.mul(structure.originatorPercent);
    const leadShare = totalValue.mul(structure.leadPercent);

    return await db.accruedCommission.upsert({
      where: { timeEntryId: entry.id },
      update: { amount: leadShare, originatorAmount: originatorShare },
      create: {
        tenantId: context.tenantId,
        timeEntryId: entry.id,
        userId: entry.userId,
        amount: leadShare, // The amount the billable lawyer earns
        originatorId: structure.originatorId,
        originatorAmount: originatorShare
      }
    });
  }
}