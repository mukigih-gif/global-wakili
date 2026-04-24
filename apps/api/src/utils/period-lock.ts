import type { PrismaClient } from '@prisma/client';

type TenantScopedDb = PrismaClient | ReturnType<PrismaClient['$extends']>;

export async function assertPeriodOpen(
  db: TenantScopedDb,
  tenantId: string,
  effectiveDate: Date,
): Promise<void> {
  const period = await db.accountingPeriod.findFirst({
    where: {
      tenantId,
      startDate: { lte: effectiveDate },
      endDate: { gte: effectiveDate },
    },
  });

  if (!period) {
    throw new Error('No accounting period exists for the supplied date');
  }

  if (period.status === 'CLOSED' || period.status === 'LOCKED') {
    throw Object.assign(new Error('The accounting period is closed or locked'), {
      statusCode: 409,
      code: 'ACCOUNTING_PERIOD_LOCKED',
    });
  }
}