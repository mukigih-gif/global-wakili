// apps/api/src/utils/period-lock.ts

import { AccountingPeriodStatus } from '@prisma/client';

type AccountingPeriodRecord = {
  id: string;
  tenantId: string;
  name: string;
  month: number;
  year: number;
  startDate: Date;
  endDate: Date;
  status: AccountingPeriodStatus;
  isClosed: boolean;
};

const PERIOD_SELECT = {
  id: true,
  tenantId: true,
  name: true,
  month: true,
  year: true,
  startDate: true,
  endDate: true,
  status: true,
  isClosed: true,
} as const;

type AccountingPeriodDelegate = {
  create(args: {
    data: {
      tenantId: string;
      name: string;
      month: number;
      year: number;
      startDate: Date;
      endDate: Date;
      status: AccountingPeriodStatus;
      isClosed: boolean;
    };
    select: typeof PERIOD_SELECT;
  }): Promise<AccountingPeriodRecord>;

  findFirst(args: {
    where: {
      tenantId: string;
      startDate: {
        lte: Date;
      };
      endDate: {
        gte: Date;
      };
    };
    select: {
      id: true;
      tenantId: true;
      name: true;
      month: true;
      year: true;
      startDate: true;
      endDate: true;
      status: true;
      isClosed: true;
    };
  }): Promise<AccountingPeriodRecord | null>;

  findUnique(args: {
    where: {
      tenantId_month_year: {
        tenantId: string;
        month: number;
        year: number;
      };
    };
    select: {
      id: true;
      tenantId: true;
      name: true;
      month: true;
      year: true;
      startDate: true;
      endDate: true;
      status: true;
      isClosed: true;
    };
  }): Promise<AccountingPeriodRecord | null>;
};

type PeriodLockDbClient = {
  accountingPeriod: AccountingPeriodDelegate;
};

type PeriodLockErrorDetails = {
  tenantId: string;
  periodId?: string;
  periodName?: string;
  month?: number;
  year?: number;
  effectiveDate?: string;
  status?: AccountingPeriodStatus;
};

function buildPeriodLockError(
  message: string,
  code: string,
  statusCode: number,
  details: PeriodLockErrorDetails,
): Error & {
  statusCode: number;
  code: string;
  details: PeriodLockErrorDetails;
} {
  return Object.assign(new Error(message), {
    statusCode,
    code,
    details,
  });
}

function requireTenantId(tenantId: string): string {
  if (typeof tenantId !== 'string' || !tenantId.trim()) {
    throw buildPeriodLockError(
      'Tenant ID is required for accounting period validation',
      'TENANT_REQUIRED',
      400,
      {
        tenantId: '',
      },
    );
  }

  return tenantId.trim();
}

function normalizeEffectiveDate(effectiveDate: Date): Date {
  if (!(effectiveDate instanceof Date) || Number.isNaN(effectiveDate.getTime())) {
    throw buildPeriodLockError(
      'A valid effective date is required for accounting period validation',
      'INVALID_EFFECTIVE_DATE',
      400,
      {
        tenantId: '',
      },
    );
  }

  return effectiveDate;
}

function assertAccountingPeriodDelegate(
  db: unknown,
): asserts db is PeriodLockDbClient {
  const candidate = db as {
    accountingPeriod?: {
      findFirst?: unknown;
      findUnique?: unknown;
    };
  };

  if (
    !candidate?.accountingPeriod ||
    typeof candidate.accountingPeriod.findFirst !== 'function' ||
    typeof candidate.accountingPeriod.findUnique !== 'function'
  ) {
    throw buildPeriodLockError(
      'Accounting period delegate is not available on the database client',
      'ACCOUNTING_PERIOD_DELEGATE_UNAVAILABLE',
      500,
      {
        tenantId: '',
      },
    );
  }
}

function assertPeriodIsOpen(period: AccountingPeriodRecord): void {
  if (
    period.isClosed ||
    period.status === AccountingPeriodStatus.CLOSED ||
    period.status === AccountingPeriodStatus.LOCKED
  ) {
    throw buildPeriodLockError(
      'The accounting period is closed or locked',
      'ACCOUNTING_PERIOD_LOCKED',
      409,
      {
        tenantId: period.tenantId,
        periodId: period.id,
        periodName: period.name,
        month: period.month,
        year: period.year,
        status: period.status,
      },
    );
  }
}

export async function ensureOpenPeriod(
  db: unknown,
  tenantId: string,
  effectiveDate: Date,
): Promise<AccountingPeriodRecord> {
  assertAccountingPeriodDelegate(db);

  const resolvedTenantId = requireTenantId(tenantId);
  const resolvedDate = normalizeEffectiveDate(effectiveDate);

  const month = resolvedDate.getMonth() + 1; // server-local; see FINDING-007-007
  const year = resolvedDate.getFullYear();
  const where = { tenantId_month_year: { tenantId: resolvedTenantId, month, year } };

  const existing = await db.accountingPeriod.findUnique({ where, select: PERIOD_SELECT });
  if (existing) return existing;

  try {
    return await db.accountingPeriod.create({
      data: {
        tenantId: resolvedTenantId,
        name: `${year}-${String(month).padStart(2, '0')}`,
        month,
        year,
        startDate: new Date(year, month - 1, 1, 0, 0, 0, 0),
        endDate: new Date(year, month, 0, 23, 59, 59, 999),
        status: AccountingPeriodStatus.OPEN,
        isClosed: false,
      },
      select: PERIOD_SELECT,
    });
  } catch (err) {
    // Lost a concurrent create race -> P2002 on unique(tenantId, month, year).
    const refetched = await db.accountingPeriod.findUnique({ where, select: PERIOD_SELECT });
    if (refetched) return refetched;
    throw err;
  }
}

export async function assertPeriodOpen(
  db: unknown,
  tenantId: string,
  effectiveDate: Date,
): Promise<void> {
  const period = await ensureOpenPeriod(db, tenantId, effectiveDate);
  assertPeriodIsOpen(period);
}

export async function assertAccountingMonthOpen(
  db: unknown,
  tenantId: string,
  month: number,
  year: number,
): Promise<void> {
  assertAccountingPeriodDelegate(db);

  const resolvedTenantId = requireTenantId(tenantId);

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw buildPeriodLockError(
      'Accounting period month must be between 1 and 12',
      'INVALID_ACCOUNTING_MONTH',
      400,
      {
        tenantId: resolvedTenantId,
        month,
        year,
      },
    );
  }

  if (!Number.isInteger(year) || year < 1900) {
    throw buildPeriodLockError(
      'Accounting period year is invalid',
      'INVALID_ACCOUNTING_YEAR',
      400,
      {
        tenantId: resolvedTenantId,
        month,
        year,
      },
    );
  }

  const period = await db.accountingPeriod.findUnique({
    where: {
      tenantId_month_year: {
        tenantId: resolvedTenantId,
        month,
        year,
      },
    },
    select: {
      id: true,
      tenantId: true,
      name: true,
      month: true,
      year: true,
      startDate: true,
      endDate: true,
      status: true,
      isClosed: true,
    },
  });

  if (!period) {
    throw buildPeriodLockError(
      'No accounting period exists for the supplied month and year',
      'ACCOUNTING_PERIOD_NOT_FOUND',
      404,
      {
        tenantId: resolvedTenantId,
        month,
        year,
      },
    );
  }

  assertPeriodIsOpen(period);
}

export default assertPeriodOpen;