static async persistSnapshot(
  db: any,
  tenantId: string,
  snapshot: BankStatementSnapshot,
): Promise<number> {
  if (!snapshot.transactions.length) {
    return 0;
  }

  const externalIds = snapshot.transactions.map((tx) => tx.externalId);

  const existing = await db.bankTransaction.findMany({
    where: {
      tenantId,
      bankAccountId: snapshot.accountId,
      externalId: { in: externalIds },
    },
    select: {
      externalId: true,
    },
  });

  const existingIds = new Set(existing.map((row: any) => row.externalId));

  const rowsToInsert = snapshot.transactions
    .filter((tx) => !existingIds.has(tx.externalId))
    .map((tx) => {
      const signedAmount =
        tx.type === 'DEBIT'
          ? toDecimal(tx.amount).negated()
          : toDecimal(tx.amount);

      return {
        tenantId,
        bankAccountId: snapshot.accountId,
        externalId: tx.externalId,
        transactionDate: tx.transactionDate,
        amount: signedAmount,
        currency: tx.currency,
        reference: tx.reference ?? null,
        narration: tx.narration ?? null,
        balanceAfter: tx.balanceAfter ? toDecimal(tx.balanceAfter) : null,
        counterpartyName: tx.counterpartyName ?? null,
        counterpartyAccount: tx.counterpartyAccount ?? null,
        rawPayload: tx.rawPayload ?? null,
      };
    });

  if (!rowsToInsert.length) {
    return 0;
  }

  await db.bankTransaction.createMany({
    data: rowsToInsert,
    skipDuplicates: true,
  });

  return rowsToInsert.length;
}