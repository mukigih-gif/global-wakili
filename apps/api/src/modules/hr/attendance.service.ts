// apps/api/src/modules/hr/attendance.service.ts

import { Prisma, prisma } from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

export type ClockMethod =
  | 'WEB'
  | 'MOBILE'
  | 'BIOMETRIC'
  | 'ADMIN'
  | 'IMPORT'
  | 'API';

export type AttendanceStatus =
  | 'CLOCKED_IN'
  | 'CLOCKED_OUT'
  | 'LATE'
  | 'ABSENT'
  | 'ON_LEAVE'
  | 'EXCEPTION'
  | 'MANUAL_ADJUSTED';

export type GeoFenceInput = {
  tenantId: string;
  name: string;
  branchId?: string | null;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  active?: boolean;
  metadata?: Record<string, unknown>;
};

export type ClockInput = {
  tenantId: string;
  employeeId: string;
  actorId: string;
  method?: ClockMethod;
  occurredAt?: Date;
  latitude?: number | null;
  longitude?: number | null;
  deviceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
};

const ZERO = new Prisma.Decimal(0);

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

function asRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, any>;
}

function appendHistory(metadata: unknown, entry: Record<string, unknown>) {
  const current = asRecord(metadata);
  const history = Array.isArray(current.history) ? current.history : [];

  return {
    ...current,
    history: [...history, entry],
  };
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function distanceMeters(
  pointA: { latitude: number; longitude: number },
  pointB: { latitude: number; longitude: number },
): number {
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(pointB.latitude - pointA.latitude);
  const dLon = toRadians(pointB.longitude - pointA.longitude);

  const lat1 = toRadians(pointA.latitude);
  const lat2 = toRadians(pointB.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

function attendanceDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export class AttendanceService {
  async createGeoFence(input: GeoFenceInput & { actorId: string }) {
    const geoFence = delegate(prisma, 'geoFence');

    if (input.radiusMeters < 10 || input.radiusMeters > 10000) {
      throw Object.assign(new Error('Geofence radius must be between 10m and 10,000m'), {
        statusCode: 422,
        code: 'INVALID_GEOFENCE_RADIUS',
      });
    }

    return geoFence.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        branchId: input.branchId ?? null,
        latitude: new Prisma.Decimal(input.latitude),
        longitude: new Prisma.Decimal(input.longitude),
        radiusMeters: input.radiusMeters,
        active: input.active ?? true,
        createdById: input.actorId,
        metadata: input.metadata ?? {},
      },
    });
  }

  async clockIn(input: ClockInput) {
    return prisma.$transaction(async (tx) => {
      const attendanceRecord = delegate(tx, 'attendanceRecord');
      const employee = delegate(tx, 'employee');

      const occurredAt = input.occurredAt ?? new Date();

      const existingEmployee = await employee.findFirst({
        where: {
          id: input.employeeId,
          tenantId: input.tenantId,
        },
        select: {
          id: true,
          branchId: true,
          status: true,
        },
      });

      if (!existingEmployee) {
        throw Object.assign(new Error('Employee not found'), {
          statusCode: 404,
          code: 'EMPLOYEE_NOT_FOUND',
        });
      }

      if (['TERMINATED', 'INACTIVE'].includes(String(existingEmployee.status).toUpperCase())) {
        throw Object.assign(new Error('Inactive employee cannot clock in'), {
          statusCode: 409,
          code: 'EMPLOYEE_INACTIVE_ATTENDANCE_BLOCKED',
        });
      }

      const openRecord = await attendanceRecord.findFirst({
        where: {
          tenantId: input.tenantId,
          employeeId: input.employeeId,
          clockOutAt: null,
          status: 'CLOCKED_IN',
        },
      });

      if (openRecord) {
        throw Object.assign(new Error('Employee already has an open clock-in record'), {
          statusCode: 409,
          code: 'ATTENDANCE_OPEN_CLOCK_IN_EXISTS',
        });
      }

      const geoValidation = await this.validateGeoFence(tx, {
        tenantId: input.tenantId,
        branchId: existingEmployee.branchId ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      });

      return attendanceRecord.create({
        data: {
          tenantId: input.tenantId,
          employeeId: input.employeeId,
          branchId: existingEmployee.branchId ?? null,
          attendanceDate: attendanceDay(occurredAt),
          clockInAt: occurredAt,
          clockInMethod: input.method ?? 'WEB',
          clockInLatitude: input.latitude !== undefined && input.latitude !== null
            ? new Prisma.Decimal(input.latitude)
            : null,
          clockInLongitude: input.longitude !== undefined && input.longitude !== null
            ? new Prisma.Decimal(input.longitude)
            : null,
          clockInGeoFenceId: geoValidation.geoFenceId,
          clockInGeoFenceValid: geoValidation.valid,
          clockInGeoFenceDistanceMeters: geoValidation.distanceMeters,
          clockInDeviceId: input.deviceId ?? null,
          clockInIpAddress: input.ipAddress ?? null,
          clockInUserAgent: input.userAgent ?? null,
          status: geoValidation.valid ? 'CLOCKED_IN' : 'EXCEPTION',
          notes: input.notes ?? null,
          createdById: input.actorId,
          metadata: appendHistory(input.metadata, {
            action: 'CLOCK_IN',
            actorId: input.actorId,
            method: input.method ?? 'WEB',
            geoFence: geoValidation,
            at: occurredAt.toISOString(),
          }) as any,
        },
      });
    });
  }

  async clockOut(input: ClockInput) {
    return prisma.$transaction(async (tx) => {
      const attendanceRecord = delegate(tx, 'attendanceRecord');

      const occurredAt = input.occurredAt ?? new Date();

      const openRecord = await attendanceRecord.findFirst({
        where: {
          tenantId: input.tenantId,
          employeeId: input.employeeId,
          clockOutAt: null,
          status: {
            in: ['CLOCKED_IN', 'EXCEPTION'],
          },
        },
        orderBy: {
          clockInAt: 'desc',
        },
      });

      if (!openRecord) {
        throw Object.assign(new Error('No open clock-in record found'), {
          statusCode: 404,
          code: 'ATTENDANCE_OPEN_CLOCK_IN_NOT_FOUND',
        });
      }

      if (occurredAt < openRecord.clockInAt) {
        throw Object.assign(new Error('Clock-out time cannot be before clock-in time'), {
          statusCode: 422,
          code: 'INVALID_CLOCK_OUT_TIME',
        });
      }

      const geoValidation = await this.validateGeoFence(tx, {
        tenantId: input.tenantId,
        branchId: openRecord.branchId ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      });

      const hoursWorked = new Prisma.Decimal(
        (occurredAt.getTime() - new Date(openRecord.clockInAt).getTime()) / (1000 * 60 * 60),
      ).toDecimalPlaces(2);

      const finalStatus =
        openRecord.status === 'EXCEPTION' || !geoValidation.valid
          ? 'EXCEPTION'
          : 'CLOCKED_OUT';

      return attendanceRecord.update({
        where: {
          id: openRecord.id,
        },
        data: {
          clockOutAt: occurredAt,
          clockOutMethod: input.method ?? 'WEB',
          clockOutLatitude: input.latitude !== undefined && input.latitude !== null
            ? new Prisma.Decimal(input.latitude)
            : null,
          clockOutLongitude: input.longitude !== undefined && input.longitude !== null
            ? new Prisma.Decimal(input.longitude)
            : null,
          clockOutGeoFenceId: geoValidation.geoFenceId,
          clockOutGeoFenceValid: geoValidation.valid,
          clockOutGeoFenceDistanceMeters: geoValidation.distanceMeters,
          clockOutDeviceId: input.deviceId ?? null,
          clockOutIpAddress: input.ipAddress ?? null,
          clockOutUserAgent: input.userAgent ?? null,
          hoursWorked,
          status: finalStatus,
          notes: input.notes ?? openRecord.notes,
          metadata: appendHistory(openRecord.metadata, {
            action: 'CLOCK_OUT',
            actorId: input.actorId,
            method: input.method ?? 'WEB',
            geoFence: geoValidation,
            hoursWorked: hoursWorked.toString(),
            at: occurredAt.toISOString(),
          }) as any,
          updatedById: input.actorId,
          updatedAt: new Date(),
        },
      });
    });
  }

  async createManualAttendance(input: ClockInput & {
    clockInAt: Date;
    clockOutAt?: Date | null;
    reason: string;
  }) {
    if (!input.reason?.trim()) {
      throw Object.assign(new Error('Manual attendance reason is required'), {
        statusCode: 400,
        code: 'MANUAL_ATTENDANCE_REASON_REQUIRED',
      });
    }

    const attendanceRecord = delegate(prisma, 'attendanceRecord');

    const hoursWorked = input.clockOutAt
      ? new Prisma.Decimal(
          (input.clockOutAt.getTime() - input.clockInAt.getTime()) / (1000 * 60 * 60),
        ).toDecimalPlaces(2)
      : ZERO;

    return attendanceRecord.create({
      data: {
        tenantId: input.tenantId,
        employeeId: input.employeeId,
        attendanceDate: attendanceDay(input.clockInAt),
        clockInAt: input.clockInAt,
        clockOutAt: input.clockOutAt ?? null,
        clockInMethod: 'ADMIN',
        clockOutMethod: input.clockOutAt ? 'ADMIN' : null,
        hoursWorked,
        status: 'MANUAL_ADJUSTED',
        notes: input.notes ?? input.reason,
        createdById: input.actorId,
        metadata: appendHistory(input.metadata, {
          action: 'MANUAL_ATTENDANCE_CREATED',
          actorId: input.actorId,
          reason: input.reason,
          at: new Date().toISOString(),
        }) as any,
      },
    });
  }

  async listAttendance(input: {
    tenantId: string;
    employeeId?: string;
    branchId?: string;
    from?: Date;
    to?: Date;
    status?: AttendanceStatus | string;
    take?: number;
    skip?: number;
  }) {
    const attendanceRecord = delegate(prisma, 'attendanceRecord');

    return attendanceRecord.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.employeeId ? { employeeId: input.employeeId } : {}),
        ...(input.branchId ? { branchId: input.branchId } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.from || input.to
          ? {
              attendanceDate: {
                ...(input.from ? { gte: input.from } : {}),
                ...(input.to ? { lte: input.to } : {}),
              },
            }
          : {}),
      },
      orderBy: [
        { attendanceDate: 'desc' },
        { clockInAt: 'desc' },
      ],
      take: Math.min(input.take ?? 100, 100),
      skip: input.skip ?? 0,
    });
  }

  async getAttendanceSummary(input: {
    tenantId: string;
    employeeId?: string;
    from: Date;
    to: Date;
  }) {
    const records = await this.listAttendance({
      tenantId: input.tenantId,
      employeeId: input.employeeId,
      from: input.from,
      to: input.to,
      take: 5000,
    });

    return records.reduce(
      (summary: any, record: any) => ({
        ...summary,
        recordCount: summary.recordCount + 1,
        totalHours: summary.totalHours.plus(decimal(record.hoursWorked)),
        exceptionCount:
          summary.exceptionCount + (String(record.status) === 'EXCEPTION' ? 1 : 0),
        manualAdjustmentCount:
          summary.manualAdjustmentCount +
          (String(record.status) === 'MANUAL_ADJUSTED' ? 1 : 0),
      }),
      {
        tenantId: input.tenantId,
        employeeId: input.employeeId ?? null,
        from: input.from,
        to: input.to,
        recordCount: 0,
        totalHours: ZERO,
        exceptionCount: 0,
        manualAdjustmentCount: 0,
        generatedAt: new Date(),
      },
    );
  }

  private async validateGeoFence(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      branchId?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    },
  ) {
    if (input.latitude === null || input.latitude === undefined || input.longitude === null || input.longitude === undefined) {
      return {
        required: false,
        valid: true,
        geoFenceId: null,
        distanceMeters: null,
        reason: 'No coordinates supplied',
      };
    }

    const geoFence = delegate(tx, 'geoFence');

    const fences = await geoFence.findMany({
      where: {
        tenantId: input.tenantId,
        active: true,
        OR: [
          { branchId: input.branchId ?? null },
          { branchId: null },
        ],
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!fences.length) {
      return {
        required: false,
        valid: true,
        geoFenceId: null,
        distanceMeters: null,
        reason: 'No active geofence configured',
      };
    }

    const point = {
      latitude: input.latitude,
      longitude: input.longitude,
    };

    let nearest: {
      id: string;
      distance: number;
      radius: number;
    } | null = null;

    for (const fence of fences) {
      const distance = distanceMeters(point, {
        latitude: Number(fence.latitude),
        longitude: Number(fence.longitude),
      });

      if (!nearest || distance < nearest.distance) {
        nearest = {
          id: fence.id,
          distance,
          radius: Number(fence.radiusMeters),
        };
      }

      if (distance <= Number(fence.radiusMeters)) {
        return {
          required: true,
          valid: true,
          geoFenceId: fence.id,
          distanceMeters: new Prisma.Decimal(distance).toDecimalPlaces(2),
          reason: null,
        };
      }
    }

    return {
      required: true,
      valid: false,
      geoFenceId: nearest?.id ?? null,
      distanceMeters: nearest ? new Prisma.Decimal(nearest.distance).toDecimalPlaces(2) : null,
      reason: nearest
        ? `Outside geofence by ${Math.max(nearest.distance - nearest.radius, 0).toFixed(2)} meters`
        : 'Outside geofence',
    };
  }
}

export const attendanceService = new AttendanceService();

export default AttendanceService;