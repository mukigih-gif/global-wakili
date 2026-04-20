import type {
  BankAccountCredentials,
  BankProvider,
  BankProviderCode,
} from './bank.interface';
import { EquityBankProvider } from './providers/equity.bank';
import { KCBBankProvider } from './providers/kcb.bank';
import { NCBABankProvider } from './providers/ncba.bank';
import { MpesaService } from './providers/mpesa.service';

const providers: Record<BankProviderCode, BankProvider> = {
  equity: new EquityBankProvider(),
  kcb: new KCBBankProvider(),
  ncba: new NCBABankProvider(),
  mpesa: new MpesaService(),
};

export class BankService {
  static getProvider(providerCode: BankProviderCode): BankProvider {
    const provider = providers[providerCode];

    if (!provider) {
      throw Object.assign(new Error(`Unsupported bank provider: ${providerCode}`), {
        statusCode: 400,
        code: 'BANK_PROVIDER_NOT_SUPPORTED',
      });
    }

    return provider;
  }

  static async validateProviderConfig(
    providerCode: BankProviderCode,
    credentials: BankAccountCredentials,
  ): Promise<void> {
    const provider = this.getProvider(providerCode);
    await provider.validateConfig(credentials);
  }

  static listSupportedProviders(): Array<{
    code: BankProviderCode;
    displayName: string;
  }> {
    return Object.values(providers).map((provider) => ({
      code: provider.code,
      displayName: provider.displayName,
    }));
  }
}