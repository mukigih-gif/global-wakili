import type {
  BankAccountCredentials,
  BankProvider,
  BankStatementFetchParams,
  BankStatementSnapshot,
} from '../bank.interface';

export class MpesaService implements BankProvider {
  readonly code = 'mpesa' as const;
  readonly displayName = 'M-Pesa';

  async validateConfig(credentials: BankAccountCredentials): Promise<void> {
    if (!credentials.accountNumber && !credentials.metadata?.shortCode) {
      throw Object.assign(new Error('M-Pesa short code or account number is required'), {
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