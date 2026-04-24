import { Prisma } from '@global-wakili/database';
import type { Request } from 'express';
import { logAdminAction } from '../../utils/audit-logger';
import { AuditSeverity } from '../../types/audit';

function endOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0, 23, 59, 59, 999);
}

export class PeriodCloseService {
  static async closePeriod(
    req: Request,
    params: {
      month: number;
      year: number;
      reason?: string;
    },
  ) {
    const db = req.db;
    const tenantId = req.tenantId!;
    const userId = req.user?.sub ?? null;

    const period = await db.accountingPeriod.findUnique({
      where: {
        tenantId_month_year: {
          tenantId,
          month: params.month,
          year: params.year,
        },
      },
      select: {
        id: true,
        tenantId: true,
        month: true,
        year: true,
        name: true,
        status: true,
        closedAt: true,
        closedById: true,
      },
    });

    if (!period) {
      throw Object.assign(new Error('Accounting period not found'), {
        statusCode: 404,
        code: 'ACCOUNTING_PERIOD_NOT_FOUND',
        details: {
          tenantId,
          month: params.month,
          year: params.year,
        },
      });
    }

    if (period.status === 'LOCKED') {
      throw Object.assign(new Error('Accounting period is locked'), {
        statusCode: 409,
        code: 'ACCOUNTING_PERIOD_LOCKED',
        details: {
          periodId: period.id,
        },
      });
    }

    if (period.status === 'CLOSED') {
      return period;
    }

    const asOfDate = endOfMonth(params.year, params.month);

    const grouped = await db.journalLine.groupBy({
      by: ['accountId'],
      where: {
        tenantId,
        journal: {
          date: { lte: asOfDate },
          reversalOfId: null,
        },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const totals = grouped.reduce(
      (acc: { debit: Prisma.Decimal; credit: Prisma.Decimal }, row: any) => {
        acc.debit = acc.debit.plus(new Prisma.Decimal(row?._sum?.debit ?? 0));
        acc.credit = acc.credit.plus(new Prisma.Decimal(row?._sum?.credit ?? 0));
        return acc;
      },
      {
        debit: new Prisma.Decimal(0),
        credit: new Prisma.Decimal(0),
      },
    );

    if (!totals.debit.equals(totals.credit)) {
      throw Object.assign(
        new Error('Cannot close accounting period because trial balance is not balanced'),
        {
          statusCode: 409,
          code: 'PERIOD_CLOSE_UNBALANCED',
          details: {
            month: params.month,
            year: params.year,
            totalDebit: totals.debit.toString(),
            totalCredit: totals.credit.toString(),
          },
        },
      );
    }

    const updated = await db.accountingPeriod.update({
      where: { id: period.id },
      data: {
        status: 'CLOSED',
        isClosed: true,
        closedAt: new Date(),
        closedById: userId,
      },
    });

    void Promise.resolve(
      logAdminAction({
        req,
        tenantId,
        action: 'ACCOUNTING_PERIOD_CLOSED',
        severity: AuditSeverity.HIGH,
        entityId: updated.id,
        payload: {
          month: params.month,
          year: params.year,
          reason: params.reason ?? null,
        },
      }),
    ).catch((auditError) => {
      console.error('[AUDIT_CRITICAL_FAIL] failed to log period close', auditError);
    });

    return updated;
  }

  static async listPeriods(req: Request) {
    const db = req.db;
    const tenantId = req.tenantId!;

    return db.accountingPeriod.findMany({
      where: { tenantId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }
}