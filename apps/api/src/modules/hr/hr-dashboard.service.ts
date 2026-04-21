// apps/api/src/modules/hr/hr-dashboard.service.ts

import { Prisma, prisma } from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

const ZERO = new Prisma.Decimal(0);

export type HrDashboardInput = {
  tenantId: string;
  branchId?: string | null;
  departmentId?: string | null;
  year?: number;
  month?: number;
};

function delegate(db: DbClient, name: string) {
  const modelDelegate = db[name];

  if (!modelDelegate) {
    throw Object.assign(
      new Error(`Prisma model delegate "${name}" is missing. Apply HR schema before activating this workflow.`),
      {
        statusCode: 500,
        code: 'HR_SCHEMA_DELEGATE_MISSING',
        model: name,
      },
    );
  }

  return modelDelegate;
}

function decimal(value: unknown): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;

  const parsed = new Prisma.Decimal(value as any);

  if (!parsed.isFinite()) return ZERO;

  return parsed.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function getPeriodWhere(input: HrDashboardInput, field = 'createdAt') {
  if (input.year && input.month) {
    return {
      [field]: {
        gte: new Date(input.year, input.month - 1, 1),
        lt: new Date(input.year, input.month, 1),
      },
    };
  }

  if (input.year) {
    return {
      [field]: {
        gte: new Date(input.year, 0, 1),
        lt: new Date(input.year + 1, 0, 1),
      },
    };
  }

  return {};
}

export class HrDashboardService {
  async getDashboard(input: HrDashboardInput) {
    const employee = delegate(prisma, 'employee');
    const department = delegate(prisma, 'department');
    const employeeContract = delegate(prisma, 'employeeContract');
    const leaveRequest = delegate(prisma, 'leaveRequest');
    const attendanceRecord = delegate(prisma, 'attendanceRecord');
    const performanceReview = delegate(prisma, 'performanceReview');
    const disciplinaryCase = delegate(prisma, 'disciplinaryCase');
    const hrDocument = delegate(prisma, 'hrDocument');

    const employeeWhere = {
      tenantId: input.tenantId,
      ...(input.branchId ? { branchId: input.branchId } : {}),
      ...(input.departmentId ? { departmentId: input.departmentId } : {}),
    };

    const periodWhereCreated = getPeriodWhere(input, 'createdAt');
    const attendancePeriodWhere = getPeriodWhere(input, 'attendanceDate');

    const [
      totalEmployees,
      activeEmployees,
      payrollEligibleEmployees,
      employeeStatusBreakdown,
      employmentTypeBreakdown,
      departmentCount,
      activeDepartmentCount,
      activeContracts,
      contractsExpiringSoon,
      pendingLeaveRequests,
      attendanceExceptions,
      openPerformanceReviews,
      completedPerformanceReviews,
      openDisciplinaryCases,
      pendingSignatureDocuments,
      signedDocuments,
      recentEmployees,
      recentDisciplinaryCases,
      attendanceRecords,
    ] = await Promise.all([
      employee.count({ where: employeeWhere }),

      employee.count({
        where: {
          ...employeeWhere,
          status: {
            in: ['ACTIVE', 'ON_PROBATION', 'ON_LEAVE', 'SUSPENDED'],
          },
        },
      }),

      employee.count({
        where: {
          ...employeeWhere,
          payrollEligible: true,
          status: {
            in: ['ACTIVE', 'ON_PROBATION', 'ON_LEAVE'],
          },
        },
      }),

      employee.groupBy({
        by: ['status'],
        where: employeeWhere,
        _count: { id: true },
      }),

      employee.groupBy({
        by: ['employmentType'],
        where: employeeWhere,
        _count: { id: true },
      }),

      department.count({
        where: {
          tenantId: input.tenantId,
          ...(input.branchId ? { branchId: input.branchId } : {}),
        },
      }),

      department.count({
        where: {
          tenantId: input.tenantId,
          status: 'ACTIVE',
          ...(input.branchId ? { branchId: input.branchId } : {}),
        },
      }),

      employeeContract.count({
        where: {
          tenantId: input.tenantId,
          status: 'ACTIVE',
          ...(input.branchId ? { branchId: input.branchId } : {}),
          ...(input.departmentId ? { departmentId: input.departmentId } : {}),
        },
      }),

      employeeContract.count({
        where: {
          tenantId: input.tenantId,
          status: 'ACTIVE',
          endDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60),
          },
          ...(input.branchId ? { branchId: input.branchId } : {}),
          ...(input.departmentId ? { departmentId: input.departmentId } : {}),
        },
      }),

      leaveRequest.count({
        where: {
          tenantId: input.tenantId,
          status: {
            in: ['PENDING', 'PENDING_APPROVAL'],
          },
        },
      }),

      attendanceRecord.count({
        where: {
          tenantId: input.tenantId,
          status: 'EXCEPTION',
          ...attendancePeriodWhere,
        },
      }),

      performanceReview.count({
        where: {
          tenantId: input.tenantId,
          status: {
            in: ['DRAFT', 'SELF_REVIEW', 'MANAGER_REVIEW', 'CALIBRATION'],
          },
          ...periodWhereCreated,
        },
      }),

      performanceReview.count({
        where: {
          tenantId: input.tenantId,
          status: 'COMPLETED',
          ...periodWhereCreated,
        },
      }),

      disciplinaryCase.count({
        where: {
          tenantId: input.tenantId,
          status: {
            in: ['OPEN', 'UNDER_REVIEW', 'HEARING_SCHEDULED', 'ACTION_ISSUED'],
          },
          ...periodWhereCreated,
        },
      }),

      hrDocument.count({
        where: {
          tenantId: input.tenantId,
          status: 'PENDING_SIGNATURE',
        },
      }),

      hrDocument.count({
        where: {
          tenantId: input.tenantId,
          status: 'SIGNED',
          ...periodWhereCreated,
        },
      }),

      employee.findMany({
        where: employeeWhere,
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      disciplinaryCase.findMany({
        where: {
          tenantId: input.tenantId,
          status: {
            in: ['OPEN', 'UNDER_REVIEW', 'HEARING_SCHEDULED', 'ACTION_ISSUED'],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      attendanceRecord.findMany({
        where: {
          tenantId: input.tenantId,
          ...attendancePeriodWhere,
        },
        select: {
          id: true,
          employeeId: true,
          status: true,
          hoursWorked: true,
        },
        take: 5000,
      }),
    ]);

    const attendanceSummary = attendanceRecords.reduce(
      (summary: any, record: any) => ({
        recordCount: summary.recordCount + 1,
        totalHours: summary.totalHours.plus(decimal(record.hoursWorked)),
        exceptionCount:
          summary.exceptionCount + (String(record.status) === 'EXCEPTION' ? 1 : 0),
      }),
      {
        recordCount: 0,
        totalHours: ZERO,
        exceptionCount: 0,
      },
    );

    return {
      tenantId: input.tenantId,
      filters: {
        branchId: input.branchId ?? null,
        departmentId: input.departmentId ?? null,
        year: input.year ?? null,
        month: input.month ?? null,
      },
      workforce: {
        totalEmployees,
        activeEmployees,
        payrollEligibleEmployees,
        employeeStatusBreakdown,
        employmentTypeBreakdown,
      },
      departments: {
        departmentCount,
        activeDepartmentCount,
      },
      contracts: {
        activeContracts,
        contractsExpiringSoon,
      },
      leave: {
        pendingLeaveRequests,
      },
      attendance: {
        attendanceExceptions,
        attendanceRecordCount: attendanceSummary.recordCount,
        totalHours: attendanceSummary.totalHours.toDecimalPlaces(2),
      },
      performance: {
        openPerformanceReviews,
        completedPerformanceReviews,
      },
      disciplinary: {
        openDisciplinaryCases,
        recentDisciplinaryCases,
      },
      documents: {
        pendingSignatureDocuments,
        signedDocuments,
      },
      recentEmployees,
      generatedAt: new Date(),
    };
  }
}

export const hrDashboardService = new HrDashboardService();

export default HrDashboardService;