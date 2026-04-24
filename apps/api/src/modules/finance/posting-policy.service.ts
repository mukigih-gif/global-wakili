import { Prisma } from '@global-wakili/database';
import type {
  JournalPostingInput,
  JournalValidationIssue,
  PostingPolicyContext,
  PostingPolicyResult,
  TenantDbClient,
} from './finance.types';
import { JournalValidationService } from './journal-validation.service';

function toDecimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return new Prisma.Decimal(0);
  }

  return new Prisma.Decimal(value);
}

const TRUST_SUBTYPES = new Set([
  'TRUST_BANK',
  'TRUST_LIABILITY',
  'RETAINER_LIABILITY',
]);

const OFFICE_SUBTYPES = new Set([
  'OFFICE_BANK',
  'ACCOUNTS_RECEIVABLE',
  'ACCOUNTS_PAYABLE',
  'VAT_OUTPUT',
  'VAT_INPUT',
  'PAYE_LIABILITY',
  'NSSF_LIABILITY',
  'SHIF_LIABILITY',
  'HOUSING_LEVY_LIABILITY',
  'LEGAL_FEES_INCOME',
  'GENERAL_EXPENSE',
  'DISBURSEMENT_ASSET',
  'SUSPENSE',
]);

export class PostingPolicyService {
  static async evaluate(
    db: TenantDbClient,
    tenantId: string,
    input: JournalPostingInput,
    context: PostingPolicyContext = {},
  ): Promise<PostingPolicyResult> {
    const validation = await JournalValidationService.validate(db, tenantId, input);
    const issues: JournalValidationIssue[] = [...validation.issues];

    if (context.enforcePeriodLock !== false) {
      const month = input.date.getMonth() + 1;
      const year = input.date.getFullYear();

      const accountingPeriod = await db.accountingPeriod.findUnique({
        where: {
          tenantId_month_year: {
            tenantId,
            month,
            year,
          },
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!accountingPeriod) {
        issues.push({
          code: 'MISSING_PERIOD',
          message: 'No accounting period exists for the supplied journal date.',
        });
      } else if (accountingPeriod.status === 'CLOSED' || accountingPeriod.status === 'LOCKED') {
        issues.push({
          code: 'PERIOD_LOCKED',
          message: 'The accounting period for this journal date is closed or locked.',
        });
      }
    }

    const accounts = await db.chartOfAccount.findMany({
      where: {
        tenantId,
        id: {
          in: [...new Set(input.lines.map((line) => line.accountId))],
        },
      },
      select: {
        id: true,
        subtype: true,
        currency: true,
      },
    });

    let containsTrustAccount = false;
    let containsOfficeAccount = false;

    for (const account of accounts) {
      if (!account.subtype) continue;

      if (TRUST_SUBTYPES.has(account.subtype)) {
        containsTrustAccount = true;
      }

      if (OFFICE_SUBTYPES.has(account.subtype)) {
        containsOfficeAccount = true;
      }
    }

    if (containsTrustAccount && containsOfficeAccount) {
      issues.push({
        code: 'TRUST_COMMINGLING',
        message: 'Trust and office accounts cannot be mixed in the same journal posting.',
      });
    }

    if (containsTrustAccount && context.allowTrustPosting === false) {
      issues.push({
        code: 'TRUST_ACCOUNT_POLICY_VIOLATION',
        message: 'Trust account posting is not allowed in this operation context.',
      });
    }

    if (containsOfficeAccount && context.allowOfficePosting === false) {
      issues.push({
        code: 'OFFICE_ACCOUNT_POLICY_VIOLATION',
        message: 'Office account posting is not allowed in this operation context.',
      });
    }

    if (input.currency && context.allowMultiCurrency === false) {
      issues.push({
        code: 'MULTI_CURRENCY_POLICY_VIOLATION',
        message: 'Multi-currency posting is not allowed in this operation context.',
      });
    }

    if (input.currency) {
      const distinctCurrencies = new Set(
        accounts
          .map((account) => account.currency)
          .filter((currency): currency is string => Boolean(currency)),
      );

      if (distinctCurrencies.size > 1) {
        issues.push({
          code: 'MULTI_CURRENCY_POLICY_VIOLATION',
          message: 'A single journal cannot span accounts configured with different currencies.',
        });
      }

      if (distinctCurrencies.size === 1) {
        const [accountCurrency] = [...distinctCurrencies];
        if (accountCurrency && accountCurrency !== input.currency) {
          issues.push({
            code: 'MULTI_CURRENCY_POLICY_VIOLATION',
            message: 'Journal currency does not match the configured account currency.',
          });
        }
      }

      const exchangeRate = toDecimal(input.exchangeRate ?? 0);
      if (exchangeRate.lte(0)) {
        issues.push({
          code: 'INVALID_EXCHANGE_RATE',
          message: 'A positive exchange rate is required for a foreign-currency journal.',
        });
      }
    }

    if (context.expectedSourceModule && input.sourceModule !== context.expectedSourceModule) {
      issues.push({
        code: 'INVALID_SOURCE_MODULE',
        message: `Posting source module must be ${context.expectedSourceModule}.`,
        meta: {
          expectedSourceModule: context.expectedSourceModule,
          receivedSourceModule: input.sourceModule ?? null,
        },
      });
    }

    return {
      allowed: issues.length === 0,
      issues,
    };
  }

  static async assertAllowed(
    db: TenantDbClient,
    tenantId: string,
    input: JournalPostingInput,
    context: PostingPolicyContext = {},
  ): Promise<PostingPolicyResult> {
    const result = await this.evaluate(db, tenantId, input, context);

    if (!result.allowed) {
      throw Object.assign(new Error('Posting policy validation failed'), {
        statusCode: 422,
        code: 'POSTING_POLICY_VIOLATION',
        details: result.issues,
      });
    }

    return result;
  }
}