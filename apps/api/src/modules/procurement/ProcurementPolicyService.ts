import { Prisma } from '@global-wakili/database';
import type {
  DecimalLike,
  ProcurementValidationIssue,
  ProcurementValidationResult,
  TenantProcurementDbClient,
  VendorBillInput,
} from './procurement.types';

function toDecimal(value: DecimalLike | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) return new Prisma.Decimal(0);
  return new Prisma.Decimal(value);
}

export class ProcurementPolicyService {
  static async evaluateVendorBill(
    db: TenantProcurementDbClient,
    tenantId: string,
    input: VendorBillInput,
  ): Promise<ProcurementValidationResult> {
    const issues: ProcurementValidationIssue[] = [];

    const vendor = await db.vendor.findFirst({
      where: {
        tenantId,
        id: input.vendorId,
      },
      select: {
        id: true,
        status: true,
        currency: true,
      },
    });

    if (!vendor) {
      issues.push({
        code: 'MISSING_VENDOR',
        message: 'Vendor not found.',
      });
    } else {
      if (vendor.status === 'INACTIVE') {
        issues.push({
          code: 'INACTIVE_VENDOR',
          message: 'Vendor is inactive.',
        });
      }

      if (vendor.status === 'BLACKLISTED') {
        issues.push({
          code: 'BLACKLISTED_VENDOR',
          message: 'Vendor is blacklisted.',
        });
      }

      if (input.currency && vendor.currency && input.currency !== vendor.currency) {
        issues.push({
          code: 'INVALID_CURRENCY',
          message: 'Vendor bill currency does not match vendor currency.',
        });
      }
    }

    const duplicateBill = await db.vendorBill.findFirst({
      where: {
        tenantId,
        billNumber: input.billNumber,
      },
      select: { id: true },
    });

    if (duplicateBill) {
      issues.push({
        code: 'DUPLICATE_BILL_NUMBER',
        message: 'Vendor bill number already exists.',
      });
    }

    if (!(input.billDate instanceof Date) || Number.isNaN(input.billDate.getTime())) {
      issues.push({
        code: 'INVALID_BILL_DATE',
        message: 'Bill date is invalid.',
      });
    }

    if (input.dueDate && Number.isNaN(input.dueDate.getTime())) {
      issues.push({
        code: 'INVALID_DUE_DATE',
        message: 'Due date is invalid.',
      });
    }

    if (input.dueDate && input.dueDate < input.billDate) {
      issues.push({
        code: 'INVALID_DUE_DATE',
        message: 'Due date cannot be before bill date.',
      });
    }

    const subTotal = toDecimal(input.subTotal);
    const vatAmount = toDecimal(input.vatAmount);
    const whtAmount = toDecimal(input.whtAmount);
    const total = toDecimal(input.total);

    if (subTotal.lt(0) || vatAmount.lt(0) || whtAmount.lt(0) || total.lt(0)) {
      issues.push({
        code: 'NEGATIVE_AMOUNT',
        message: 'Amounts cannot be negative.',
      });
    }

    if (total.eq(0)) {
      issues.push({
        code: 'ZERO_AMOUNT',
        message: 'Bill total cannot be zero.',
      });
    }

    if (toDecimal(input.whtRate).lt(0)) {
      issues.push({
        code: 'INVALID_WHT',
        message: 'WHT rate cannot be negative.',
      });
    }

    if (vatAmount.gt(total)) {
      issues.push({
        code: 'INVALID_VAT',
        message: 'VAT amount cannot exceed bill total.',
      });
    }

    if (input.branchId) {
      const branch = await db.branch.findFirst({
        where: {
          tenantId,
          id: input.branchId,
        },
        select: { id: true },
      });

      if (!branch) {
        issues.push({
          code: 'POLICY_VIOLATION',
          message: 'Branch not found for tenant.',
        });
      }
    }

    if (input.matterId) {
      const matter = await db.matter.findFirst({
        where: {
          tenantId,
          id: input.matterId,
        },
        select: { id: true },
      });

      if (!matter) {
        issues.push({
          code: 'POLICY_VIOLATION',
          message: 'Matter not found for tenant.',
        });
      }
    }

    for (const line of input.lines) {
      if (toDecimal(line.quantity).lte(0) || toDecimal(line.unitPrice).lt(0)) {
        issues.push({
          code: 'INVALID_AMOUNT',
          message: 'Line quantity must be greater than zero and unit price cannot be negative.',
        });
        break;
      }

      if (line.expenseAccountId) {
        const account = await db.chartOfAccount.findFirst({
          where: {
            tenantId,
            id: line.expenseAccountId,
            isActive: true,
          },
          select: {
            id: true,
            category: true,
          },
        });

        if (!account) {
          issues.push({
            code: 'MISSING_EXPENSE_ACCOUNT',
            message: 'Expense account not found or inactive.',
          });
          break;
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  static async assertVendorBillAllowed(
    db: TenantProcurementDbClient,
    tenantId: string,
    input: VendorBillInput,
  ): Promise<void> {
    const result = await this.evaluateVendorBill(db, tenantId, input);

    if (!result.valid) {
      throw Object.assign(new Error('Vendor bill policy validation failed'), {
        statusCode: 422,
        code: 'PROCUREMENT_POLICY_VIOLATION',
        details: result.issues,
      });
    }
  }
}