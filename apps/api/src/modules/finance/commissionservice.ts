// apps/api/src/modules/finance/commissionservice.ts

import { Prisma } from '@global-wakili/database';

type CommissionContext = {
  tenantId: string;
  req: {
    db: any;
  };
};

function requiredString(value: unknown, label: string, code: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw Object.assign(new Error(`${label} is required`), {
      statusCode: 422,
      code,
    });
  }

  return value.trim();
}

function toDecimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) return new Prisma.Decimal(0);
  return new Prisma.Decimal(value);
}

/**
 * Finance commission projection boundary.
 *
 * Matter owns commission context and originator economics.
 * Payroll owns approved payout execution through CommissionPayout.
 * Finance uses this service to project commission exposure from schema-aligned
 * TimeEntry and MatterOriginator data for reporting, dashboards, profitability,
 * and period-end visibility.
 *
 * This service intentionally does not write fake `accruedCommission` or
 * `matter.commissionStructure` records because those models/relations do not
 * exist in the current Prisma schema.
 */
export class CommissionService {
  static async syncTimeCommission(context: CommissionContext, timeEntryId: string) {
    const db = context.req.db;
    const tenantId = requiredString(context.tenantId, 'Tenant ID', 'FINANCE_TENANT_REQUIRED');
    const normalizedTimeEntryId = requiredString(
      timeEntryId,
      'Time entry ID',
      'FINANCE_TIME_ENTRY_REQUIRED',
    );

    const entry = await db.timeEntry.findFirst({
      where: {
        tenantId,
        id: normalizedTimeEntryId,
      },
      include: {
        matter: {
          select: {
            id: true,
            tenantId: true,
            title: true,
            leadAdvocateId: true,
            originator: {
              select: {
                originatorId: true,
                commissionRate: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!entry) {
      throw Object.assign(new Error('Time entry not found for commission calculation'), {
        statusCode: 404,
        code: 'FINANCE_TIME_ENTRY_NOT_FOUND',
      });
    }

    const durationHours = toDecimal(entry.durationHours);
    const appliedRate = toDecimal(entry.appliedRate);
    const billableAmount = toDecimal(entry.billableAmount).equals(0)
      ? durationHours.mul(appliedRate)
      : toDecimal(entry.billableAmount);

    const originator = entry.matter?.originator?.isActive ? entry.matter.originator : null;
    const originatorRate = originator ? toDecimal(originator.commissionRate).div(100) : new Prisma.Decimal(0);
    const originatorAmount = billableAmount.mul(originatorRate);

    return {
      persisted: false,
      reason:
        'Commission accrual persistence is deferred to Payroll/CommissionPayout; Finance returns a projection only.',
      tenantId,
      timeEntryId: entry.id,
      matterId: entry.matterId,
      advocateId: entry.advocateId,
      billableAmount,
      originatorId: originator?.originatorId ?? null,
      originatorRatePercent: originator ? toDecimal(originator.commissionRate) : new Prisma.Decimal(0),
      originatorAmount,
      leadAdvocateId: entry.matter?.leadAdvocateId ?? null,
      metadata: {
        source: 'finance.commissionservice',
        deferredTo: 'payroll.CommissionPayout',
      },
    };
  }
}

export default CommissionService;