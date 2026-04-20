import { Prisma } from '@global-wakili/database';
import type { Request } from 'express';
import { GeneralLedgerService } from '../finance/GeneralLedgerService';

function toDecimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(value);
}

export class ProcurementPostingService {
  static async postVendorBillApproval(
    req: Request,
    params: {
      vendorBillId: string;
    },
  ) {
    const bill = await req.db.vendorBill.findFirst({
      where: {
        tenantId: req.tenantId!,
        id: params.vendorBillId,
      },
      include: {
        lines: true,
        vendor: true,
      },
    });

    if (!bill) {
      throw Object.assign(new Error('Vendor bill not found'), {
        statusCode: 404,
        code: 'MISSING_BILL',
      });
    }

    const apAccount = await req.db.chartOfAccount.findFirst({
      where: {
        tenantId: req.tenantId!,
        subtype: 'ACCOUNTS_PAYABLE',
        isActive: true,
      },
      select: { id: true },
    });

    if (!apAccount) {
      throw Object.assign(new Error('Accounts payable account not configured'), {
        statusCode: 500,
        code: 'AP_ACCOUNT_NOT_CONFIGURED',
      });
    }

    const lines = bill.lines.map((line: any) => ({
      accountId: line.expenseAccountId,
      debit: toDecimal(line.total),
      credit: new Prisma.Decimal(0),
      matterId: bill.matterId ?? null,
      reference: bill.billNumber,
      description: line.description,
    }));

    lines.push({
      accountId: apAccount.id,
      debit: new Prisma.Decimal(0),
      credit: toDecimal(bill.total).minus(toDecimal(bill.whtAmount)),
      matterId: bill.matterId ?? null,
      reference: bill.billNumber,
      description: `Accounts payable for vendor bill ${bill.billNumber}`,
    });

    if (toDecimal(bill.whtAmount).gt(0)) {
      const whtPayable = await req.db.chartOfAccount.findFirst({
        where: {
          tenantId: req.tenantId!,
          subtype: 'WITHHOLDING_TAX_PAYABLE',
          isActive: true,
        },
        select: { id: true },
      });

      if (!whtPayable) {
        throw Object.assign(new Error('WHT payable account not configured'), {
          statusCode: 500,
          code: 'WHT_ACCOUNT_NOT_CONFIGURED',
        });
      }

      lines.push({
        accountId: whtPayable.id,
        debit: new Prisma.Decimal(0),
        credit: toDecimal(bill.whtAmount),
        matterId: bill.matterId ?? null,
        reference: bill.billNumber,
        description: `Withholding tax payable for vendor bill ${bill.billNumber}`,
      });
    }

    return GeneralLedgerService.postJournal(
      req,
      {
        reference: `VBILL-${bill.billNumber}`,
        description: `Vendor bill approval for ${bill.vendor?.name ?? 'vendor'}`,
        date: bill.billDate,
        currency: bill.currency,
        exchangeRate: 1,
        sourceModule: 'procurement',
        sourceEntityType: 'VendorBill',
        sourceEntityId: bill.id,
        lines,
      },
      {
        enforcePeriodLock: true,
        allowMultiCurrency: false,
        expectedSourceModule: 'procurement',
      },
    );
  }

  static async postVendorPayment(
    req: Request,
    params: {
      vendorBillId: string;
      amount: Prisma.Decimal | number | string;
      paymentDate?: Date;
      bankAccountChartId: string;
      reference?: string | null;
    },
  ) {
    const bill = await req.db.vendorBill.findFirst({
      where: {
        tenantId: req.tenantId!,
        id: params.vendorBillId,
      },
      include: {
        vendor: true,
      },
    });

    if (!bill) {
      throw Object.assign(new Error('Vendor bill not found'), {
        statusCode: 404,
        code: 'MISSING_BILL',
      });
    }

    const apAccount = await req.db.chartOfAccount.findFirst({
      where: {
        tenantId: req.tenantId!,
        subtype: 'ACCOUNTS_PAYABLE',
        isActive: true,
      },
      select: { id: true },
    });

    if (!apAccount) {
      throw Object.assign(new Error('Accounts payable account not configured'), {
        statusCode: 500,
        code: 'AP_ACCOUNT_NOT_CONFIGURED',
      });
    }

    const amount = toDecimal(params.amount);

    return GeneralLedgerService.postJournal(
      req,
      {
        reference: params.reference ?? `VPAY-${bill.billNumber}`,
        description: `Vendor payment for ${bill.vendor?.name ?? 'vendor'}`,
        date: params.paymentDate ?? new Date(),
        currency: bill.currency,
        exchangeRate: 1,
        sourceModule: 'procurement',
        sourceEntityType: 'VendorBillPayment',
        sourceEntityId: bill.id,
        lines: [
          {
            accountId: apAccount.id,
            debit: amount,
            credit: new Prisma.Decimal(0),
            matterId: bill.matterId ?? null,
            reference: bill.billNumber,
            description: `Reduce accounts payable for vendor bill ${bill.billNumber}`,
          },
          {
            accountId: params.bankAccountChartId,
            debit: new Prisma.Decimal(0),
            credit: amount,
            matterId: bill.matterId ?? null,
            reference: bill.billNumber,
            description: `Cash/bank payment for vendor bill ${bill.billNumber}`,
          },
        ],
      },
      {
        enforcePeriodLock: true,
        allowMultiCurrency: false,
        expectedSourceModule: 'procurement',
      },
    );
  }
}