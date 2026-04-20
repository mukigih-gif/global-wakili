import type {
  BankAccountCredentials,
  BankProvider,
  BankStatementFetchParams,
  BankStatementSnapshot,
} from '../bank.interface';

export class NCBABankProvider implements BankProvider {
  readonly code = 'ncba' as const;
  readonly displayName = 'NCBA Bank';

  async validateConfig(credentials: BankAccountCredentials): Promise<void> {
    if (!credentials.accountNumber) {
      throw Object.assign(new Error('NCBA account number is required'), {
        statusCode: 400,
        code: 'BANK_CONFIG_INVALID',
      });
    }
  }

  async fetchStatement(
    credentials: BankAccountCredentials,
    params: BankStatementFetchParams,
  ): Promise<BankStatementSnapshot> {
    await this.validateConfig(credentials);

    return {
      provider: this.code,
      accountId: params.accountId,
      fetchedAt: new Date(),
      openingBalance: null,
      closingBalance: null,
      currency: 'KES',
      transactions: [],
    };
  }
}