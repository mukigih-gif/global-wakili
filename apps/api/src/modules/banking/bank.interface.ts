export interface BankAdapter {
  getBalance(accountId: string): Promise<number>;
  getTransactions(accountId: string): Promise<any[]>;
}