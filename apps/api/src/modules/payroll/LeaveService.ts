// apps/api/src/modules/payroll/LeaveService.ts

import { Prisma, prisma } from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

export type LeaveAdjustmentType =
  | 'PAID_LEAVE'
  | 'UNPAID_LEAVE'
  | 'SICK_LEAVE'
  | 'MATERNITY_LEAVE'
  | 'PATERNITY_LEAVE'
  | 'COMPASSIONATE_LEAVE'
  | 'STUDY_LEAVE'
  | 'OTHER';

export type PayrollLeaveImpactInput = {
  tenantId: string;
  employeeId: string;
  periodStart: Date;
  periodEnd: Date;
  basicPay: string | number | Prisma.Decimal;
  workingDaysInPeriod?: number;
};

export type PayrollLeaveImpactResult = {
  tenantId: string;
  employeeId: string;
  periodStart: Date;
  periodEnd: Date;
  paidLeaveDays: Prisma.Decimal;
  unpaidLeaveDays: Prisma.Decimal;
  payableDays: Prisma.Decimal;
  workingDaysInPeriod: Prisma.Decimal;
  dailyRate: Prisma.Decimal;
  unpaidLeaveDeduction: Prisma.Decimal;
  leaveRecords: Array<{
    id: string;
    leaveType: string | null;
    startDate: Date | null;
    endDate: Date | null;
    days: Prisma.Decimal;
    paid: boolean;
    status: string | null;
  }>;
};

const ZERO = new Prisma.Decimal(0);

function delegate(db: DbClient, name: string) {
  const modelDelegate = db[name];

  if (!modelDelegate) {
    throw Object.assign(
      new Error(`Prisma model delegate "${name}" is missing. Apply HR/Payroll schema before activating this workflow.`),
      {
        statusCode: 500,
        code: 'PAYROLL_SCHEMA_DELEGATE_MISSING',
        model: name,
      },
    );
  }

  return modelDelegate;
}

function money(value: unknown): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;

  const decimal = new Prisma.Decimal(value as any);

  if (!decimal.isFinite()) {
    throw Object.assign(new Error('Invalid decimal value'), {
      statusCode: 422,
      code: 'INVALID_DECIMAL_VALUE',
    });
  }

  return decimal.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function decimal(value: unknown): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;

  const parsed = new Prisma.Decimal(value as any);

  if (!parsed.isFinite()) return ZERO;

  return parsed;
}

function overlapDateRange(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): { start: Date; end: Date } | null {
  const start = aStart > bStart ? aStart : bStart;
  const end = aEnd < bEnd ? aEnd : bEnd;

  if (start > end) return null;

  return { start, end };
}

function inclusiveDays(start: Date, end: Date): Prisma.Decimal {
  const msPerDay = 24 * 60 * 60 * 1000;
  const normalizedStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const normalizedEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());

  return new Prisma.Decimal(Math.floor((normalizedEnd - normalizedStart) / msPerDay) + 1);
}

function isPaidLeaveType(type: string | null | undefined): boolean {
  const normalized = String(type ?? '').toUpperCase();

  return [
    'PAID_LEAVE',
    'ANNUAL_LEAVE',
    'SICK_LEAVE',
    'MATERNITY_LEAVE',
    'PATERNITY_LEAVE',
    'COMPASSIONATE_LEAVE',
  ].includes(normalized);
}

export class LeaveService {
  async calculatePayrollLeaveImpact(
    input: PayrollLeaveImpactInput,
  ): Promise<PayrollLeaveImpactResult> {
    const workingDaysInPeriod = decimal(input.workingDaysInPeriod ?? 22);

    if (workingDaysInPeriod.lte(0)) {
      throw Object.assign(new Error('workingDaysInPeriod must be greater than zero'), {
        statusCode: 422,
        code: 'INVALID_WORKING_DAYS',
      });
    }

    if (input.periodEnd < input.periodStart) {
      throw Object.assign(new Error('periodEnd cannot be before periodStart'), {
        statusCode: 422,
        code: 'INVALID_LEAVE_PERIOD',
      });
    }

    const leaveRequestDelegate = delegate(prisma, 'leaveRequest');

    const leaveRequests = await leaveRequestDelegate.findMany({
      where: {
        tenantId: input.tenantId,
        employeeId: input.employeeId,
        status: {
          in: ['APPROVED', 'TAKEN', 'COMPLETED'],
        },
        OR: [
          {
            startDate: {
              lte: input.periodEnd,
            },
            endDate: {
              gte: input.periodStart,
            },
          },
        ],
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    const leaveRecords: PayrollLeaveImpactResult['leaveRecords'] = [];

    let paidLeaveDays = ZERO;
    let unpaidLeaveDays = ZERO;

    for (const leave of leaveRequests) {
      const startDate = leave.startDate ? new Date(leave.startDate) : null;
      const endDate = leave.endDate ? new Date(leave.endDate) : startDate;

      if (!startDate || !endDate) continue;

      const overlap = overlapDateRange(startDate, endDate, input.periodStart, input.periodEnd);

      if (!overlap) continue;

      const days = leave.days
        ? decimal(leave.days)
        : inclusiveDays(overlap.start, overlap.end);

      const type = String(leave.leaveType ?? leave.type ?? '').toUpperCase();
      const paid = leave.isPaid === true || isPaidLeaveType(type);

      if (paid) {
        paidLeaveDays = paidLeaveDays.plus(days);
      } else {
        unpaidLeaveDays = unpaidLeaveDays.plus(days);
      }

      leaveRecords.push({
        id: leave.id,
        leaveType: leave.leaveType ?? leave.type ?? null,
        startDate,
        endDate,
        days,
        paid,
        status: leave.status ?? null,
      });
    }

    const basicPay = money(input.basicPay);
    const dailyRate = basicPay.div(workingDaysInPeriod).toDecimalPlaces(2);
    const unpaidLeaveDeduction = dailyRate.mul(unpaidLeaveDays).toDecimalPlaces(2);
    const payableDays = Prisma.Decimal.max(
      workingDaysInPeriod.minus(unpaidLeaveDays),
      ZERO,
    ).toDecimalPlaces(2);

    return {
      tenantId: input.tenantId,
      employeeId: input.employeeId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      paidLeaveDays: paidLeaveDays.toDecimalPlaces(2),
      unpaidLeaveDays: unpaidLeaveDays.toDecimalPlaces(2),
      payableDays,
      workingDaysInPeriod: workingDaysInPeriod.toDecimalPlaces(2),
      dailyRate,
      unpaidLeaveDeduction,
      leaveRecords,
    };
  }

  async buildUnpaidLeaveDeduction(input: PayrollLeaveImpactInput) {
    const impact = await this.calculatePayrollLeaveImpact(input);

    if (impact.unpaidLeaveDeduction.lte(0)) {
      return null;
    }

    return {
      kind: 'OTHER' as const,
      code: 'UNPAID_LEAVE',
      label: 'Unpaid Leave Deduction',
      amount: impact.unpaidLeaveDeduction,
      preTax: false,
      metadata: {
        leaveImpact: impact,
      },
    };
  }

  async getLeaveBalanceForPayroll(input: {
    tenantId: string;
    employeeId: string;
    asOf?: Date;
  }) {
    const leaveBalanceDelegate = delegate(prisma, 'leaveBalance');

    return leaveBalanceDelegate.findMany({
      where: {
        tenantId: input.tenantId,
        employeeId: input.employeeId,
        ...(input.asOf ? { effectiveFrom: { lte: input.asOf } } : {}),
      },
      orderBy: {
        effectiveFrom: 'desc',
      },
    });
  }
}

export const leaveService = new LeaveService();

export default LeaveService;