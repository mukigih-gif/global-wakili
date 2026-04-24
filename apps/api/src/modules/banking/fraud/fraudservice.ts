import { prisma } from '../../config/database';

export const detectFraud = async (tenantId: string) => {
  const alerts: any[] = [];

  const largeTransactions = await prisma.journalEntry.findMany({
    where: {
      tenantId,
      amount: { gt: 1000000 }
    }
  });

  for (const tx of largeTransactions) {
    alerts.push({
      type: 'LARGE_TRANSACTION',
      severity: 'HIGH',
      message: `Transaction above threshold: ${tx.amount}`,
      txId: tx.id
    });
  }

  const duplicateRefs = await prisma.journalEntry.groupBy({
    by: ['reference'],
    _count: true,
    having: {
      reference: { _count: { gt: 1 } }
    }
  });

  for (const dup of duplicateRefs) {
    alerts.push({
      type: 'DUPLICATE_REFERENCE',
      severity: 'CRITICAL',
      message: `Duplicate reference detected: ${dup.reference}`
    });
  }

  return alerts;
};