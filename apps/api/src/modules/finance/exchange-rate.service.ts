import { Prisma } from '@global-wakili/database';

type ExchangeRateDbClient = {
  exchangeRate: {
    upsert: Function;
    findFirst: Function;
    findMany: Function;
  };
};

function toDecimal(value: Prisma.Decimal | number | string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export class ExchangeRateService {
  static async upsertRate(
    db: ExchangeRateDbClient,
    tenantId: string,
    input: {
      baseCurrency: string;
      quoteCurrency: string;
      rate: Prisma.Decimal | number | string;
      effectiveDate: Date;
      source?: string | null;
    },
  ) {
    return db.exchangeRate.upsert({
      where: {
        tenantId_baseCurrency_quoteCurrency_effectiveDate: {
          tenantId,
          baseCurrency: input.baseCurrency.trim().toUpperCase(),
          quoteCurrency: input.quoteCurrency.trim().toUpperCase(),
          effectiveDate: input.effectiveDate,
        },
      },
      update: {
        rate: toDecimal(input.rate),
        source: input.source?.trim() ?? null,
      },
      create: {
        tenantId,
        baseCurrency: input.baseCurrency.trim().toUpperCase(),
        quoteCurrency: input.quoteCurrency.trim().toUpperCase(),
        rate: toDecimal(input.rate),
        effectiveDate: input.effectiveDate,
        source: input.source?.trim() ?? null,
      },
    });
  }

  static async getRate(
    db: ExchangeRateDbClient,
    tenantId: string,
    params: {
      baseCurrency: string;
      quoteCurrency: string;
      asOfDate?: Date;
    },
  ) {
    const asOfDate = params.asOfDate ?? new Date();

    const rate = await db.exchangeRate.findFirst({
      where: {
        tenantId,
        baseCurrency: params.baseCurrency.trim().toUpperCase(),
        quoteCurrency: params.quoteCurrency.trim().toUpperCase(),
        effectiveDate: {
          lte: asOfDate,
        },
      },
      orderBy: {
        effectiveDate: 'desc',
      },
    });

    if (!rate) {
      throw Object.assign(new Error('Exchange rate not found'), {
        statusCode: 404,
        code: 'EXCHANGE_RATE_NOT_FOUND',
        details: {
          tenantId,
          baseCurrency: params.baseCurrency,
          quoteCurrency: params.quoteCurrency,
          asOfDate,
        },
      });
    }

    return rate;
  }

  static async convert(
    db: ExchangeRateDbClient,
    tenantId: string,
    params: {
      amount: Prisma.Decimal | number | string;
      baseCurrency: string;
      quoteCurrency: string;
      asOfDate?: Date;
    },
  ): Promise<Prisma.Decimal> {
    if (
      params.baseCurrency.trim().toUpperCase() ===
      params.quoteCurrency.trim().toUpperCase()
    ) {
      return toDecimal(params.amount);
    }

    const rate = await this.getRate(db, tenantId, {
      baseCurrency: params.baseCurrency,
      quoteCurrency: params.quoteCurrency,
      asOfDate: params.asOfDate,
    });

    return toDecimal(params.amount).mul(toDecimal(rate.rate));
  }

  static async list(
    db: ExchangeRateDbClient,
    tenantId: string,
    filters?: {
      baseCurrency?: string;
      quoteCurrency?: string;
    },
  ) {
    return db.exchangeRate.findMany({
      where: {
        tenantId,
        ...(filters?.baseCurrency
          ? { baseCurrency: filters.baseCurrency.trim().toUpperCase() }
          : {}),
        ...(filters?.quoteCurrency
          ? { quoteCurrency: filters.quoteCurrency.trim().toUpperCase() }
          : {}),
      },
      orderBy: [{ effectiveDate: 'desc' }],
    });
  }
}