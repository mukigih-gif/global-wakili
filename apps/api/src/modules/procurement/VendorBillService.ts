import { Prisma } from '@global-wakili/database';
import type {
  DecimalLike,
  TenantProcurementDbClient,
  VendorBillInput,
} from './procurement.types';
import { ProcurementPolicyService } from './ProcurementPolicyService';

function toDecimal(value: DecimalLike | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) return new Prisma.Decimal(0);
  return new Prisma.Decimal(value);
}

export class VendorBillService {
  static calculateOutstanding(params: {
    total: DecimalLike;
    paidAmount?: DecimalLike | null;
    whtAmount?: DecimalLike | null;
  }) {
    const total = toDecimal(params.total);
    const paidAmount = toDecimal(params.paidAmount);
    const outstanding = total.minus(paidAmount);

    return {
      total,
      paidAmount,
      whtAmount: toDecimal(params.whtAmount),
      outstanding: outstanding.gt(0) ? outstanding : new Prisma.Decimal(0),
    };
  }

  static async create(
    db: TenantProcurementDbClient & { $transaction: Function },
    tenantId: string,
    input: VendorBillInput,
  ) {
    await ProcurementPolicyService.assertVendorBillAllowed(db, tenantId, input);

    return db.$transaction(async (tx: any) => {
      const created = await tx.vendorBill.create({
        data: {
          tenantId,
          vendorId: input.vendorId,
          billNumber: input.billNumber.trim(),
          billDate: input.billDate,
          dueDate: input.dueDate ?? null,
          currency: input.currency?.trim().toUpperCase() ?? 'KES',
          subTotal: toDecimal(input.subTotal),
          vatAmount: toDecimal(input.vatAmount),
          whtRate: toDecimal(input.whtRate),
          whtAmount: toDecimal(input.whtAmount),
          total: toDecimal(input.total),
          paidAmount: new Prisma.Decimal(0),
          status: 'DRAFT',
          notes: input.notes?.trim() ?? null,
          branchId: input.branchId ?? null,
          matterId: input.matterId ?? null,
          lines: {
            create: input.lines.map((line) => {
              const quantity = toDecimal(line.quantity);
              const unitPrice = toDecimal(line.unitPrice);
              const taxAmount = toDecimal(line.taxAmount);
              const computedLineTotal = quantity.mul(unitPrice).plus(taxAmount);

              return {
                description: line.description.trim(),
                quantity,
                unitPrice,
                taxRate: toDecimal(line.taxRate),
                taxAmount,
                total: line.lineTotal ? toDecimal(line.lineTotal) : computedLineTotal,
                expenseAccountId: line.expenseAccountId ?? null,
                itemCode: line.itemCode?.trim() ?? null,
              };
            }),
          },
        },
        include: {
          lines: true,
          vendor: true,
        },
      });

      return created;
    });
  }

  static async submitForApproval(
    db: TenantProcurementDbClient,
    tenantId: string,
    vendorBillId: string,
  ) {
    const bill = await db.vendorBill.findFirst({
      where: {
        tenantId,
        id: vendorBillId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!bill) {
      throw Object.assign(new Error('Vendor bill not found'), {
        statusCode: 404,
        code: 'MISSING_BILL',
      });
    }

    if (bill.status !== 'DRAFT') {
      throw Object.assign(new Error('Only draft bills can be submitted for approval'), {
        statusCode: 409,
        code: 'INVALID_STATUS_TRANSITION',
      });
    }

    return db.vendorBill.update({
      where: { id: vendorBillId },
      data: {
        status: 'SUBMITTED',
      },
    });
  }

  static async markApproved(
    db: TenantProcurementDbClient,
    tenantId: string,
    vendorBillId: string,
  ) {
    const bill = await db.vendorBill.findFirst({
      where: {
        tenantId,
        id: vendorBillId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!bill) {
      throw Object.assign(new Error('Vendor bill not found'), {
        statusCode: 404,
        code: 'MISSING_BILL',
      });
    }

    if (!['SUBMITTED', 'DRAFT'].includes(bill.status)) {
      throw Object.assign(new Error('Bill cannot be approved from current status'), {
        statusCode: 409,
        code: 'INVALID_STATUS_TRANSITION',
      });
    }

    return db.vendorBill.update({
      where: { id: vendorBillId },
      data: {
        status: 'APPROVED',
      },
    });
  }

  static async listOpenBills(
    db: TenantProcurementDbClient,
    tenantId: string,
  ) {
    return db.vendorBill.findMany({
      where: {
        tenantId,
        status: {
          in: ['DRAFT', 'SUBMITTED', 'APPROVED', 'PARTIALLY_PAID'],
        },
      },
      include: {
        vendor: true,
      },
      orderBy: [{ billDate: 'desc' }],
    });
  }
}