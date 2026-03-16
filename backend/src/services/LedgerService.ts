import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const LedgerService = {
  /**
   * GENERATE MATTER LEDGER
   * Calculates the running balance for a specific case file.
   */
  async getMatterLedger(matterId: number) {
    // 1. Fetch all transactions for this matter in chronological order
    const transactions = await prisma.transaction.findMany({
      where: { matterId },
      orderBy: { date: 'asc' }
    });

    let trustBalance = 0;
    let officeBalance = 0;

    // 2. Map through transactions to calculate running totals
    const ledgerEntries = transactions.map(tx => {
      const amount = Number(tx.amount);
      
      if (tx.accountType === 'TRUST') {
        // Credits (In) increase balance, Debits (Out) decrease it
        trustBalance += (tx.type === 'CREDIT' ? amount : -amount);
      } else {
        officeBalance += (tx.type === 'CREDIT' ? amount : -amount);
      }

      return {
        ...tx,
        amount: amount,
        runningTrustBalance: trustBalance,
        runningOfficeBalance: officeBalance
      };
    });

    // 3. Return the detailed history and final totals
    return {
      matterId,
      summary: {
        currentTrustBalance: trustBalance,
        currentOfficeBalance: officeBalance,
        formattedTrust: trustBalance.toLocaleString('en-KE', { 
          style: 'currency', 
          currency: 'KES' 
        }),
        formattedOffice: officeBalance.toLocaleString('en-KE', { 
          style: 'currency', 
          currency: 'KES' 
        }),
      },
      history: ledgerEntries
    };
  }
};