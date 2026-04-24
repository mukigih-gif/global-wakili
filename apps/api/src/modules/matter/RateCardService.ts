import { Prisma } from '@global-wakili/database';

function toDecimal(value: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined || value === '') {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(value);
}

export class RateCardService {
  static async upsertMatterRateCard(
    db: any,
    params: {
      tenantId: string;
      matterId: string;
      currency?: string | null;
      originatorId?: string | null;
      partnerRate?: Prisma.Decimal | string | number | null;
      associateRate?: Prisma.Decimal | string | number | null;
      clerkRate?: Prisma.Decimal | string | number | null;
      customRates?: Record<string, unknown> | null;
    },
  ) {
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

    const metadata = {
      ...(matter.metadata ?? {}),
      billing: {
        ...(matter.metadata?.billing ?? {}),
        currency: params.currency?.trim().toUpperCase() ?? matter.metadata?.billing?.currency ?? 'KES',
        originatorId:
          params.originatorId ??
          matter.metadata?.originatorId ??
          matter.metadata?.billing?.originatorId ??
          null,
        partnerRate: params.partnerRate !== undefined ? toDecimal(params.partnerRate).toString() : matter.metadata?.billing?.partnerRate ?? null,
        associateRate:
          params.associateRate !== undefined ? toDecimal(params.associateRate).toString() : matter.metadata?.billing?.associateRate ?? null,
        clerkRate: params.clerkRate !== undefined ? toDecimal(params.clerkRate).toString() : matter.metadata?.billing?.clerkRate ?? null,
        customRates: params.customRates ?? matter.metadata?.billing?.customRates ?? null,
      },
      originatorId: params.originatorId ?? matter.metadata?.originatorId ?? null,
    };

    return db.matter.update({
      where: { id: params.matterId },
      data: {
        metadata,
      },
    });
  }

  static async resolveApplicableRate(
    db: any,
    params: {
      tenantId: string;
      matterId: string;
      roleKey: string;
    },
  ) {
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

    const billing = matter.metadata?.billing ?? {};
    const role = params.roleKey.trim().toLowerCase();

    let rate: string | null = null;

    if (role === 'partner') rate = billing.partnerRate ?? null;
    else if (role === 'associate') rate = billing.associateRate ?? null;
    else if (role === 'clerk') rate = billing.clerkRate ?? null;
    else rate = billing.customRates?.[role] ?? null;

    return {
      matterId: matter.id,
      roleKey: role,
      rate: rate ? toDecimal(rate) : new Prisma.Decimal(0),
      currency: billing.currency ?? 'KES',
      originatorId: billing.originatorId ?? matter.metadata?.originatorId ?? null,
    };
  }
}