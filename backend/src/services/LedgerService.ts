import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export class LedgerService {
  /**
   * THE DOUBLE-ENTRY HANDSHAKE
   * Logic: For every action, there is an equal and opposite entry.
   * This ensures the Trial Balance always equals Zero.
   */
  static async recordEntry(params: {
    matterId: string;
    amount: Decimal;
    description: string;
    type: 'DISBURSEMENT' | 'FEE_PAYMENT' | 'TRUST_DEPOSIT';
    userId: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      // 1. Create the GL Journal Header
      const journal = await tx.journalEntry.create({
        data: {
          description: params.description,
          matterId: params.matterId,
          userId: params.userId,
          reference: `GL-${Date.now()}`
        }
      });

      // 2. THE DOUBLE ENTRY LOGIC
      if (params.type === 'DISBURSEMENT') {
        // DEBIT: Client Out-of-Pocket (Asset/Receivable)
        await tx.ledgerLine.create({
          data: {
            journalId: journal.id,
            accountId: 'AC-RECEIVABLES', // Chart of Account ID
            debit: params.amount,
            credit: new Decimal(0)
          }
        });
        // CREDIT: Office Bank Account (Asset - Decreasing)
        await tx.ledgerLine.create({
          data: {
            journalId: journal.id,
            accountId: 'AC-OFFICE-BANK',
            debit: new Decimal(0),
            credit: params.amount
          }
        });
      }

      if (params.type === 'FEE_PAYMENT') {
        // DEBIT: Bank Account (Increasing)
        // CREDIT: Revenue Account (Income)
        // CREDIT: VAT Payable (Liability to KRA)
        const netFee = params.amount.div(1.16);
        const vat = params.amount.minus(netFee);

        await tx.ledgerLine.createMany({
          data: [
            { journalId: journal.id, accountId: 'AC-OFFICE-BANK', debit: params.amount, credit: 0 },
            { journalId: journal.id, accountId: 'AC-LEGAL-REVENUE', debit: 0, credit: netFee },
            { journalId: journal.id, accountId: 'AC-VAT-PAYABLE', debit: 0, credit: vat }
          ]
        });
      }
      
      return journal;
    });
  }
}