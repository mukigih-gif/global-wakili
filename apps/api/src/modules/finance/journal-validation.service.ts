import { Prisma } from '@global-wakili/database';
import type {
  FinanceAccountSnapshot,
  JournalLineInput,
  JournalPostingInput,
  JournalValidationIssue,
  JournalValidationResult,
  TenantDbClient,
} from './finance.types';

function toDecimal(value: Prisma.Decimal | number | string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function isPositive(value: Prisma.Decimal): boolean {
  return value.gt(0);
}

function isZero(value: Prisma.Decimal): boolean {
  return value.eq(0);
}

export class JournalValidationService {
  static async validate(
    db: TenantDbClient,
    tenantId: string,
    input: JournalPostingInput,
  ): Promise<JournalValidationResult> {
    const issues: JournalValidationIssue[] = [];

    if (!input.reference?.trim()) {
      issues.push({
        code: 'INVALID_REFERENCE',
        message: 'Journal reference is required.',
      });
    }

    if (!input.description?.trim()) {
      issues.push({
        code: 'INVALID_DESCRIPTION',
        message: 'Journal description is required.',
      });
    }

    if (!(input.date instanceof Date) || Number.isNaN(input.date.getTime())) {
      issues.push({
        code: 'INVALID_DATE',
        message: 'Journal date is invalid.',
      });
    }

    if (!input.lines?.length) {
      issues.push({
        code: 'EMPTY_LINES',
        message: 'A journal must contain at least one line.',
      });

      return {
        valid: false,
        totalDebit: new Prisma.Decimal(0),
        totalCredit: new Prisma.Decimal(0),
        issues,
      };
    }

    const accountIds = [...new Set(input.lines.map((line) => line.accountId))];

    const accounts = await db.chartOfAccount.findMany({
      where: {
        tenantId,
        id: { in: accountIds },
      },
      select: {
        id: true,
        tenantId: true,
        code: true,
        name: true,
        type: true,
        subtype: true,
        isActive: true,
        allowManualPosting: true,
        currency: true,
      },
    });

    const accountMap = new Map<string, FinanceAccountSnapshot>(
      accounts.map((account: FinanceAccountSnapshot) => [account.id, account]),
    );

    let totalDebit = new Prisma.Decimal(0);
    let totalCredit = new Prisma.Decimal(0);

    input.lines.forEach((line, index) => {
      const debit = toDecimal(line.debit);
      const credit = toDecimal(line.credit);

      if (debit.lt(0) || credit.lt(0)) {
        issues.push({
          code: 'NEGATIVE_AMOUNT',
          message: 'Debit and credit values cannot be negative.',
          lineIndex: index,
          accountId: line.accountId,
        });
      }

      if (isPositive(debit) && isPositive(credit)) {
        issues.push({
          code: 'BOTH_DEBIT_AND_CREDIT_SET',
          message: 'A journal line cannot have both debit and credit values greater than zero.',
          lineIndex: index,
          accountId: line.accountId,
        });
      }

      if (isZero(debit) && isZero(credit)) {
        issues.push({
          code: 'BOTH_DEBIT_AND_CREDIT_ZERO',
          message: 'A journal line must contain either a debit or a credit amount.',
          lineIndex: index,
          accountId: line.accountId,
        });
      }

      const account = accountMap.get(line.accountId);

      if (!account) {
        issues.push({
          code: 'MISSING_ACCOUNT',
          message: 'Referenced account does not exist for this tenant.',
          lineIndex: index,
          accountId: line.accountId,
        });
      } else {
        if (account.tenantId !== tenantId) {
          issues.push({
            code: 'ACCOUNT_TENANT_MISMATCH',
            message: 'Referenced account belongs to a different tenant.',
            lineIndex: index,
            accountId: line.accountId,
          });
        }

        if (!account.isActive) {
          issues.push({
            code: 'INACTIVE_ACCOUNT',
            message: 'Referenced account is inactive.',
            lineIndex: index,
            accountId: line.accountId,
          });
        }

        if (!account.allowManualPosting) {
          issues.push({
            code: 'LOCKED_ACCOUNT',
            message: 'Referenced account does not allow manual posting.',
            lineIndex: index,
            accountId: line.accountId,
          });
        }
      }

      totalDebit = totalDebit.plus(debit);
      totalCredit = totalCredit.plus(credit);
    });

    if (totalDebit.eq(0) && totalCredit.eq(0)) {
      issues.push({
        code: 'ZERO_VALUE_JOURNAL',
        message: 'A zero-value journal cannot be posted.',
      });
    }

    if (!totalDebit.eq(totalCredit)) {
      issues.push({
        code: 'UNBALANCED_JOURNAL',
        message: 'Journal debits and credits do not balance.',
        meta: {
          totalDebit: totalDebit.toString(),
          totalCredit: totalCredit.toString(),
        },
      });
    }

    return {
      valid: issues.length === 0,
      totalDebit,
      totalCredit,
      issues,
    };
  }

  static async assertValid(
    db: TenantDbClient,
    tenantId: string,
    input: JournalPostingInput,
  ): Promise<JournalValidationResult> {
    const result = await this.validate(db, tenantId, input);

    if (!result.valid) {
      throw Object.assign(new Error('Journal validation failed'), {
        statusCode: 422,
        code: 'JOURNAL_VALIDATION_FAILED',
        details: result.issues,
      });
    }

    return result;
  }

  static normalizeLines(lines: JournalLineInput[]): JournalLineInput[] {
    return lines.map((line) => ({
      ...line,
      debit: toDecimal(line.debit).toString(),
      credit: toDecimal(line.credit).toString(),
      description: line.description?.trim() ?? null,
      reference: line.reference?.trim() ?? null,
      clientId: line.clientId ?? null,
      matterId: line.matterId ?? null,
      branchId: line.branchId ?? null,
    }));
  }
}