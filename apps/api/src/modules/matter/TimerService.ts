// apps/api/src/modules/matter/TimerService.ts

import { createHash, randomUUID } from 'crypto';
import { TimeTrackingService } from './TimeTrackingService';

type TimerDbClient = any;

type TimerStartParams = {
  tenantId: string;
  matterId: string;
  userId: string;
  description?: string | null;
  startedAt?: Date | string | null;
};

type TimerStopParams = {
  tenantId: string;
  userId: string;
  timerSessionId?: string | null;
  stoppedAt?: Date | string | null;
  description?: string | null;
  persistTimeEntry?: boolean;
  isBillable?: boolean | null;
  roleKey?: string | null;
  billingModel?: string | null;
};

type TimerCancelParams = {
  tenantId: string;
  userId: string;
  timerSessionId?: string | null;
  reason?: string | null;
};

type TimerListParams = {
  tenantId: string;
  userId?: string | null;
  matterId?: string | null;
  activeOnly?: boolean;
  from?: Date | string | null;
  to?: Date | string | null;
  page?: number;
  limit?: number;
};

type TimerAuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'READ';

function requiredString(value: unknown, label: string, code: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw Object.assign(new Error(`${label} is required`), {
      statusCode: 422,
      code,
    });
  }

  return value.trim();
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();

  if (!trimmed) return null;
  if (trimmed.toLowerCase() === 'undefined') return null;
  if (trimmed.toLowerCase() === 'null') return null;

  return trimmed;
}

function normalizeDate(value: Date | string | null | undefined, fallback: Date, label: string): Date {
  if (value === undefined || value === null || value === '') return fallback;

  const parsed = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error(`Invalid timer ${label}`), {
      statusCode: 422,
      code: `INVALID_TIMER_${label.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
    });
  }

  return parsed;
}

function normalizeOptionalDate(value: Date | string | null | undefined, label: string): Date | null {
  if (value === undefined || value === null || value === '') return null;

  const parsed = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error(`Invalid timer ${label}`), {
      statusCode: 422,
      code: `INVALID_TIMER_${label.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
    });
  }

  return parsed;
}

function normalizeBoolean(value: unknown, fallback = true): boolean {
  if (typeof value === 'boolean') return value;

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  }

  return fallback;
}

function normalizePositiveInt(value: unknown, fallback: number, max: number): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;

  return Math.min(parsed, max);
}

function minutesBetween(startedAt: Date, stoppedAt: Date): number {
  if (stoppedAt <= startedAt) {
    throw Object.assign(new Error('Timer stop time must be after timer start time'), {
      statusCode: 422,
      code: 'INVALID_TIMER_TIME_RANGE',
    });
  }

  return Math.max(1, Math.round((stoppedAt.getTime() - startedAt.getTime()) / 60000));
}

function durationHoursFromMinutes(durationMinutes: number): string {
  return (durationMinutes / 60).toFixed(2);
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null';

  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const object = value as Record<string, unknown>;

  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
    .join(',')}}`;
}

function hashPayload(payload: unknown): string {
  return createHash('sha256').update(stableStringify(payload)).digest('hex');
}

function jsonSafe(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map((item) => jsonSafe(item));
  }

  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};

    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      output[key] = jsonSafe(nested);
    }

    return output;
  }

  return value;
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readJsonField(value: unknown, key: string): unknown {
  return isJsonRecord(value) ? value[key] ?? null : null;
}

function changedJsonFields(beforeData: unknown, afterData: unknown): string[] {
  if (!isJsonRecord(beforeData) || !isJsonRecord(afterData)) {
    return [];
  }

  const keys = new Set([...Object.keys(beforeData), ...Object.keys(afterData)]);

  return [...keys].filter(
    (key) =>
      JSON.stringify(readJsonField(beforeData, key)) !==
      JSON.stringify(readJsonField(afterData, key)),
  );
}

function compactTimerSession(session: any) {
  const startedAt = session.startedAt ? new Date(session.startedAt) : null;
  const stoppedAt = session.stoppedAt ? new Date(session.stoppedAt) : null;

  const computedDurationMinutes =
    typeof session.durationMinutes === 'number'
      ? session.durationMinutes
      : startedAt && stoppedAt
        ? minutesBetween(startedAt, stoppedAt)
        : startedAt
          ? Math.max(0, Math.round((Date.now() - startedAt.getTime()) / 60000))
          : 0;

  return {
    id: session.id,
    tenantId: session.tenantId,
    matterId: session.matterId,
    userId: session.userId,
    startedAt: session.startedAt,
    stoppedAt: session.stoppedAt ?? null,
    durationMinutes: computedDurationMinutes,
    durationHours: durationHoursFromMinutes(computedDurationMinutes),
    isActive: !session.stoppedAt,
    createdAt: session.createdAt ?? null,
    updatedAt: session.updatedAt ?? null,
  };
}

async function assertTenantMatter(
  db: TimerDbClient,
  params: {
    tenantId: string;
    matterId: string;
  },
) {
  if (!db?.matter?.findFirst) {
    throw Object.assign(new Error('Matter delegate is unavailable'), {
      statusCode: 500,
      code: 'MATTER_DELEGATE_UNAVAILABLE',
    });
  }

  const matter = await db.matter.findFirst({
    where: {
      tenantId: params.tenantId,
      id: params.matterId,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      category: true,
      clientId: true,
      leadAdvocateId: true,
      branchId: true,
      status: true,
      deletedAt: true,
    },
  });

  if (!matter) {
    throw Object.assign(new Error('Matter not found for timer'), {
      statusCode: 404,
      code: 'TIMER_MATTER_NOT_FOUND',
    });
  }

  return matter;
}

async function assertTenantUser(
  db: TimerDbClient,
  params: {
    tenantId: string;
    userId: string;
  },
) {
  if (!db?.user?.findFirst) {
    throw Object.assign(new Error('User delegate is unavailable'), {
      statusCode: 500,
      code: 'USER_DELEGATE_UNAVAILABLE',
    });
  }

  const user = await db.user.findFirst({
    where: {
      tenantId: params.tenantId,
      id: params.userId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      email: true,
      branchId: true,
      defaultRate: true,
    },
  });

  if (!user) {
    throw Object.assign(new Error('Timer user not found or inactive'), {
      statusCode: 404,
      code: 'TIMER_USER_NOT_FOUND',
    });
  }

  return user;
}

async function findActiveTimer(
  db: TimerDbClient,
  params: {
    tenantId: string;
    userId: string;
    timerSessionId?: string | null;
  },
) {
  const timerSessionId = toNullableString(params.timerSessionId);

  return db.timerSession.findFirst({
    where: {
      tenantId: params.tenantId,
      userId: params.userId,
      stoppedAt: null,
      ...(timerSessionId ? { id: timerSessionId } : {}),
    },
    orderBy: {
      startedAt: 'desc',
    },
  });
}

async function writeTimerAudit(
  db: TimerDbClient,
  params: {
    tenantId: string;
    userId?: string | null;
    action: TimerAuditAction;
    eventCode: string;
    timerSessionId: string;
    beforeData?: Record<string, unknown> | null;
    afterData?: Record<string, unknown> | null;
    reason?: string | null;
  },
) {
  if (!db?.auditLog?.create || !db?.auditLog?.findFirst) return null;

  const createdAt = new Date().toISOString();

  const previous = await db.auditLog.findFirst({
    where: {
      tenantId: params.tenantId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      hash: true,
    },
  });

  const previousHash =
    typeof previous?.hash === 'string' && previous.hash.trim()
      ? previous.hash
      : '0'.repeat(64);

  const beforeData = params.beforeData
    ? (jsonSafe(params.beforeData) as Record<string, unknown>)
    : null;

  const afterData = {
    ...(jsonSafe(params.afterData ?? {}) as Record<string, unknown>),
    eventCode: params.eventCode,
    domain: 'MATTER_TIMER',
    timerSessionId: params.timerSessionId,
    timestamp: createdAt,
  };

  const changedFields = changedJsonFields(beforeData, afterData);

  const hash = hashPayload({
    tenantId: params.tenantId,
    userId: params.userId ?? null,
    action: params.action,
    entityType: 'TIMER_SESSION',
    entityId: params.timerSessionId,
    beforeData,
    afterData,
    changedFields,
    previousHash,
    createdAt,
    nonce: randomUUID(),
  });

  return db.auditLog.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId ?? null,
      action: params.action,
      severity:
        params.action === 'DELETE'
          ? 'HIGH'
          : params.action === 'UPDATE'
            ? 'WARNING'
            : 'INFO',
      entityType: 'TIMER_SESSION',
      entityId: params.timerSessionId,
      beforeData,
      afterData,
      changedFields,
      ipAddress: null,
      userAgent: null,
      hash,
      previousHash,
      success: true,
      failureReason: null,
      correlationId: null,
      reason: toNullableString(params.reason),
    },
  });
}

async function runInTransaction<T>(
  db: TimerDbClient,
  callback: (tx: TimerDbClient) => Promise<T>,
): Promise<T> {
  if (typeof db?.$transaction === 'function') {
    return db.$transaction(callback);
  }

  return callback(db);
}

function buildTimerListWhere(params: TimerListParams) {
  const tenantId = requiredString(params.tenantId, 'Tenant ID', 'TIMER_TENANT_REQUIRED');

  const where: Record<string, unknown> = {
    tenantId,
  };

  const userId = toNullableString(params.userId);
  if (userId) where.userId = userId;

  const matterId = toNullableString(params.matterId);
  if (matterId) where.matterId = matterId;

  if (params.activeOnly === true) {
    where.stoppedAt = null;
  }

  const from = normalizeOptionalDate(params.from, 'from');
  const to = normalizeOptionalDate(params.to, 'to');

  if (from || to) {
    where.startedAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  return where;
}

export class TimerService {
  /**
   * Starts a single active timer for a tenant user.
   *
   * Enterprise safeguards:
   * - Tenant, matter, and user are validated before creation.
   * - A user may not have more than one active timer.
   * - TimerSession is kept as the lifecycle record; TimeEntry is created only on stop.
   */
  static async startTimer(db: TimerDbClient, params: TimerStartParams) {
    const tenantId = requiredString(params.tenantId, 'Tenant ID', 'TIMER_TENANT_REQUIRED');
    const matterId = requiredString(params.matterId, 'Matter ID', 'TIMER_MATTER_REQUIRED');
    const userId = requiredString(params.userId, 'User ID', 'TIMER_USER_REQUIRED');
    const startedAt = normalizeDate(params.startedAt, new Date(), 'started at');

    const [matter] = await Promise.all([
      assertTenantMatter(db, { tenantId, matterId }),
      assertTenantUser(db, { tenantId, userId }),
    ]);

    const active = await findActiveTimer(db, {
      tenantId,
      userId,
    });

    if (active) {
      throw Object.assign(new Error('User already has an active timer'), {
        statusCode: 409,
        code: 'ACTIVE_TIMER_EXISTS',
        details: {
          activeTimer: compactTimerSession(active),
        },
      });
    }

    const created = await db.timerSession.create({
      data: {
        tenantId,
        matterId,
        userId,
        startedAt,
      },
    });

    await writeTimerAudit(db, {
      tenantId,
      userId,
      action: 'CREATE',
      eventCode: 'TIMER_STARTED',
      timerSessionId: created.id,
      afterData: {
        ...compactTimerSession(created),
        matterTitle: matter.title,
        description: toNullableString(params.description),
      },
    });

    return compactTimerSession(created);
  }

  /**
   * Stops an active timer and optionally posts it as a TimeEntry.
   *
   * The posted TimeEntry uses the hardened TimeTrackingService so rates,
   * billable amounts, matter checks, branch checks, and audit behavior remain centralized.
   */
  static async stopTimer(db: TimerDbClient, params: TimerStopParams) {
    const tenantId = requiredString(params.tenantId, 'Tenant ID', 'TIMER_TENANT_REQUIRED');
    const userId = requiredString(params.userId, 'User ID', 'TIMER_USER_REQUIRED');
    const stoppedAt = normalizeDate(params.stoppedAt, new Date(), 'stopped at');

    return runInTransaction(db, async (tx) => {
      const session = await findActiveTimer(tx, {
        tenantId,
        userId,
        timerSessionId: params.timerSessionId ?? null,
      });

      if (!session) {
        throw Object.assign(new Error('No active timer found for user'), {
          statusCode: 404,
          code: 'ACTIVE_TIMER_NOT_FOUND',
        });
      }

      const startedAt = normalizeDate(session.startedAt, new Date(), 'started at');
      const durationMinutes = minutesBetween(startedAt, stoppedAt);

      await Promise.all([
        assertTenantMatter(tx, {
          tenantId,
          matterId: session.matterId,
        }),
        assertTenantUser(tx, {
          tenantId,
          userId,
        }),
      ]);

      const updated = await tx.timerSession.update({
        where: {
          id: session.id,
        },
        data: {
          stoppedAt,
          durationMinutes,
        },
      });

      let timeEntry: unknown = null;

      if (params.persistTimeEntry !== false) {
        timeEntry = await TimeTrackingService.createTimeEntry(tx, {
          tenantId,
          matterId: session.matterId,
          advocateId: userId,
          description:
            toNullableString(params.description) ??
            `Timer entry for ${durationMinutes} minute(s)`,
          entryDate: startedAt,
          startTime: startedAt,
          endTime: stoppedAt,
          durationMinutes,
          isBillable: normalizeBoolean(params.isBillable, true),
          status: 'DRAFT',
          billingModel: toNullableString(params.billingModel) ?? 'HOURLY',
          roleKey: toNullableString(params.roleKey) ?? 'associate',
        });
      }

      await writeTimerAudit(tx, {
        tenantId,
        userId,
        action: 'UPDATE',
        eventCode: 'TIMER_STOPPED',
        timerSessionId: session.id,
        beforeData: compactTimerSession(session),
        afterData: {
          ...compactTimerSession(updated),
          timeEntry,
          persistedTimeEntry: params.persistTimeEntry !== false,
          description: toNullableString(params.description),
        },
      });

      return {
        timer: compactTimerSession(updated),
        timeEntry,
      };
    });
  }

  static async cancelTimer(db: TimerDbClient, params: TimerCancelParams) {
    const tenantId = requiredString(params.tenantId, 'Tenant ID', 'TIMER_TENANT_REQUIRED');
    const userId = requiredString(params.userId, 'User ID', 'TIMER_USER_REQUIRED');

    return runInTransaction(db, async (tx) => {
      const session = await findActiveTimer(tx, {
        tenantId,
        userId,
        timerSessionId: params.timerSessionId ?? null,
      });

      if (!session) {
        throw Object.assign(new Error('No active timer found for cancellation'), {
          statusCode: 404,
          code: 'ACTIVE_TIMER_NOT_FOUND',
        });
      }

      await tx.timerSession.delete({
        where: {
          id: session.id,
        },
      });

      await writeTimerAudit(tx, {
        tenantId,
        userId,
        action: 'DELETE',
        eventCode: 'TIMER_CANCELLED',
        timerSessionId: session.id,
        beforeData: compactTimerSession(session),
        afterData: {
          cancelled: true,
          reason: toNullableString(params.reason),
        },
        reason: params.reason ?? null,
      });

      return {
        cancelled: true,
        timerSessionId: session.id,
      };
    });
  }

  static async getActiveTimer(
    db: TimerDbClient,
    params: {
      tenantId: string;
      userId: string;
    },
  ) {
    const tenantId = requiredString(params.tenantId, 'Tenant ID', 'TIMER_TENANT_REQUIRED');
    const userId = requiredString(params.userId, 'User ID', 'TIMER_USER_REQUIRED');

    const session = await findActiveTimer(db, {
      tenantId,
      userId,
    });

    return session ? compactTimerSession(session) : null;
  }

  static async listTimerSessions(db: TimerDbClient, params: TimerListParams) {
    const page = normalizePositiveInt(params.page, 1, 1000000);
    const limit = normalizePositiveInt(params.limit, 25, 100);
    const skip = (page - 1) * limit;
    const where = buildTimerListWhere(params);

    const [rows, total] = await Promise.all([
      db.timerSession.findMany({
        where,
        orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.timerSession.count({ where }),
    ]);

    const data = rows.map(compactTimerSession);
    const totalDurationMinutes = data.reduce(
      (sum: number, session: ReturnType<typeof compactTimerSession>) =>
        sum + Number(session.durationMinutes ?? 0),
      0,
    );

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
      totals: {
        durationMinutes: totalDurationMinutes,
        durationHours: durationHoursFromMinutes(totalDurationMinutes),
      },
    };
  }

  static async stopAllActiveTimersForUser(
    db: TimerDbClient,
    params: {
      tenantId: string;
      userId: string;
      stoppedAt?: Date | string | null;
      persistTimeEntries?: boolean;
      reason?: string | null;
    },
  ) {
    const tenantId = requiredString(params.tenantId, 'Tenant ID', 'TIMER_TENANT_REQUIRED');
    const userId = requiredString(params.userId, 'User ID', 'TIMER_USER_REQUIRED');

    const activeSessions = await db.timerSession.findMany({
      where: {
        tenantId,
        userId,
        stoppedAt: null,
      },
      orderBy: {
        startedAt: 'asc',
      },
    });

    const stopped: unknown[] = [];

    for (const session of activeSessions) {
      stopped.push(
        await this.stopTimer(db, {
          tenantId,
          userId,
          timerSessionId: session.id,
          stoppedAt: params.stoppedAt ?? new Date(),
          persistTimeEntry: params.persistTimeEntries ?? false,
          description:
            toNullableString(params.reason) ??
            'Timer stopped during active timer cleanup',
        }),
      );
    }

    return {
      stoppedCount: stopped.length,
      stopped,
    };
  }

  /**
   * Backward-compatible aliases for older callers/routes.
   */
  static async start(db: TimerDbClient, params: TimerStartParams) {
    return this.startTimer(db, params);
  }

  static async stop(db: TimerDbClient, params: TimerStopParams) {
    return this.stopTimer(db, params);
  }

  static async cancel(db: TimerDbClient, params: TimerCancelParams) {
    return this.cancelTimer(db, params);
  }

  static async active(
    db: TimerDbClient,
    params: {
      tenantId: string;
      userId: string;
    },
  ) {
    return this.getActiveTimer(db, params);
  }

  static async getActive(
    db: TimerDbClient,
    params: {
      tenantId: string;
      userId: string;
    },
  ) {
    return this.getActiveTimer(db, params);
  }

  static async list(db: TimerDbClient, params: TimerListParams) {
    return this.listTimerSessions(db, params);
  }
}

export default TimerService;