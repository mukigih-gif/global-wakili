export class TimerService {
  static async start(
    db: any,
    params: {
      tenantId: string;
      matterId: string;
      userId: string;
      description?: string | null;
      activityCode?: string | null;
    },
  ) {
    const existingRunning = await db.timerSession.findFirst({
      where: {
        tenantId: params.tenantId,
        userId: params.userId,
        endedAt: null,
      },
      select: {
        id: true,
        matterId: true,
        startedAt: true,
      },
    });

    if (existingRunning) {
      throw Object.assign(new Error('User already has an active timer session'), {
        statusCode: 409,
        code: 'ACTIVE_TIMER_EXISTS',
        details: existingRunning,
      });
    }

    return db.timerSession.create({
      data: {
        tenantId: params.tenantId,
        matterId: params.matterId,
        userId: params.userId,
        startedAt: new Date(),
        description: params.description?.trim() ?? null,
        activityCode: params.activityCode ?? null,
      },
    });
  }

  static async stop(
    db: any,
    params: {
      tenantId: string;
      userId: string;
    },
  ) {
    const session = await db.timerSession.findFirst({
      where: {
        tenantId: params.tenantId,
        userId: params.userId,
        endedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        matterId: true,
        userId: true,
        startedAt: true,
        description: true,
        activityCode: true,
      },
    });

    if (!session) {
      throw Object.assign(new Error('No active timer session found'), {
        statusCode: 404,
        code: 'NO_ACTIVE_TIMER',
      });
    }

    const endedAt = new Date();
    const durationMs = endedAt.getTime() - new Date(session.startedAt).getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    const updated = await db.timerSession.update({
      where: { id: session.id },
      data: {
        endedAt,
        durationMs,
        durationHours,
      },
    });

    return {
      session: updated,
      rawDurationMs: durationMs,
      roundedHours: Number(durationHours.toFixed(4)),
    };
  }

  static async getActiveSession(
    db: any,
    params: {
      tenantId: string;
      userId: string;
    },
  ) {
    return db.timerSession.findFirst({
      where: {
        tenantId: params.tenantId,
        userId: params.userId,
        endedAt: null,
      },
      orderBy: [{ startedAt: 'desc' }],
    });
  }
}