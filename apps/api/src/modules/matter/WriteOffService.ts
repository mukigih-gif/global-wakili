import { Prisma } from '@global-wakili/database';

function toDecimal(value: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined || value === '') {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(value);
}

export class WriteOffService {
  static async recordWriteOff(
    db: any,
    params: {
      tenantId: string;
      matterId: string;
      invoiceId?: string | null;
      amount: Prisma.Decimal | string | number;
      reason: string;
      approvedById: string;
    },
  ) {
    const amount = toDecimal(params.amount);
    if (amount.lte(0)) {
      throw Object.assign(new Error('Write-off amount must be greater than zero'), {
        statusCode: 422,
        code: 'INVALID_WRITE_OFF_AMOUNT',
      });
    }

    const matter = await db.matter.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.matterId,
      },
      select: {
        id: true,
        metadata: true,
      },
    });

    if (!matter) {
      throw Object.assign(new Error('Matter not found'), {
        statusCode: 404,
        code: 'MISSING_MATTER',
      });
    }

    const currentWriteOffs = Array.isArray(matter.metadata?.writeOffs)
      ? matter.metadata.writeOffs
      : [];

    const entry = {
      invoiceId: params.invoiceId ?? null,
      amount: amount.toString(),
      reason: params.reason.trim(),
      approvedById: params.approvedById,
      recordedAt: new Date().toISOString(),
    };

    return db.matter.update({
      where: { id: params.matterId },
      data: {
        metadata: {
          ...(matter.metadata ?? {}),
          writeOffs: [...currentWriteOffs, entry],
        },
      },
    });
  }
}