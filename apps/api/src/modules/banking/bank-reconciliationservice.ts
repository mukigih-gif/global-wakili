import { Decimal } from '@prisma/client/runtime/library';

export class BankReconciliationService {

  /**
   * 🔍 AUTO MATCH ENGINE (AI-LIKE RULE ENGINE)
   */
  static async autoMatch(context: { tenantId: string; req: any }) {
    const db = context.req.db;

    const bankTxns = await db.bankTransaction.findMany({
      where: { tenantId: context.tenantId, matched: false }
    });

    const journalLines = await db.journalLine.findMany({
      where: { tenantId: context.tenantId }
    });

    const matches: any[] = [];

    for (const txn of bankTxns) {
      for (const jl of journalLines) {
        const amountMatch = new Decimal(jl.debit).minus(jl.credit).equals(txn.amount);

        const dateDiff = Math.abs(
          new Date(jl.createdAt).getTime() - new Date(txn.date).getTime()
        ) / (1000 * 60 * 60 * 24);

        const score =
          (amountMatch ? 0.7 : 0) +
          (dateDiff <= 2 ? 0.2 : 0) +
          (txn.description?.includes(jl.reference || '') ? 0.1 : 0);

        if (score >= 0.8) {
          matches.push({
            bankTxnId: txn.id,
            journalLineId: jl.id,
            confidence: score,
            status: 'MATCHED'
          });

          await db.bankTransaction.update({
            where: { id: txn.id },
            data: { matched: true }
          });

          break;
        }
      }
    }

    return matches;
  }
}