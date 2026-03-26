import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export class ArchiveService {
  /**
   * VALIDATE & CLOSE MATTER
   * Master Logic: Ensures Zero-Balance across Trust and Office ledgers.
   */
  static async closeMatter(matterId: string, closingAdvocateId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch Matter with all financial dependencies
      const matter = await tx.matter.findUnique({
        where: { id: matterId },
        include: {
          invoices: { where: { status: { not: 'FULLY_PAID' } } },
          worklogs: { where: { status: 'PENDING_INVOICE' } }
        }
      });

      if (!matter) throw new Error("Matter not found.");

      // 2. FINANCIAL VALIDATION
      // Check A: Unpaid Invoices
      if (matter.invoices.length > 0) {
        throw new Error(`Cannot close: ${matter.invoices.length} unpaid invoices pending.`);
      }

      // Check B: Unbilled Work (WIP)
      if (matter.worklogs.length > 0) {
        throw new Error("Cannot close: Unbilled worklogs detected. Invoice or dismiss them first.");
      }

      // Check C: Remaining Trust Balance (Client Money)
      if (new Decimal(matter.trustBalance).gt(0)) {
        throw new Error(`Cannot close: KES ${matter.trustBalance} remains in Trust. Refund or apply to fees.`);
      }

      // 3. ARCHIVAL ACTION
      const archivedMatter = await tx.matter.update({
        where: { id: matterId },
        data: {
          status: 'CLOSED_ARCHIVED',
          closedAt: new Date(),
          closedBy: closingAdvocateId
        }
      });

      // 4. LOG AUDIT TRAIL
      await tx.auditLog.create({
        data: {
          action: 'MATTER_ARCHIVED',
          matterId,
          userId: closingAdvocateId,
          details: `Matter ${matter.fileNumber} closed with zero balance.`
        }
      });

      return archivedMatter;
    });
  }
}