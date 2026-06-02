/**
 * PassiveActivityService.ts
 *
 * Activity ingestion layer for passive time capture.
 *
 * Creates PassiveCaptureEvent records when background activities occur.
 * Each event represents a time suggestion for a lawyer to review.
 *
 * Idempotent — unique constraint on (tenantId, userId, activitySource, activityAt)
 * prevents duplicate events from repeated polling.
 *
 * Activity types:
 *   EMAIL        — email sent/received on a matter thread
 *   CALENDAR     — calendar event attended (meeting, hearing, call)
 *   DOCUMENT     — document opened/edited in the document platform
 *   MATTER_API   — API activity on a matter (file upload, note created, etc.)
 *
 * WIP-004 — Gap 009.
 */

type ActivityDbClient = {
  passiveCaptureEvent: {
    upsert: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown[]>;
    count: (args: unknown) => Promise<number>;
  };
  user: {
    findFirst: (args: unknown) => Promise<{ id: string } | null>;
  };
  matter: {
    findFirst: (args: unknown) => Promise<{ id: string } | null>;
  };
};

export type ActivityType = 'EMAIL' | 'CALENDAR' | 'DOCUMENT' | 'MATTER_API';

export type IngestActivityInput = {
  tenantId: string;
  userId: string;
  matterId?: string | null;
  activityType: ActivityType;
  activitySource: string;       // unique identifier e.g. "email:thread-abc123"
  activityAt: Date;
  durationMinutes: number;
  suggestedDescription?: string | null;
  metadata?: Record<string, unknown> | null;
};

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required'), {
      statusCode: 400,
      code: 'PASSIVE_CAPTURE_TENANT_REQUIRED',
    });
  }
}

function normalizeDuration(minutes: number): number {
  const clamped = Math.max(1, Math.min(Math.round(minutes), 480)); // 1 min – 8 hrs
  return clamped;
}

export class PassiveActivityService {
  /**
   * Ingests a single activity event.
   * Upserts — re-ingesting the same source+timestamp updates metadata only.
   */
  static async ingestActivity(
    db: ActivityDbClient,
    input: IngestActivityInput,
  ): Promise<{ created: boolean; eventId: string }> {
    assertTenant(input.tenantId);

    if (!input.userId?.trim()) {
      throw Object.assign(new Error('User ID is required'), {
        statusCode: 422,
        code: 'PASSIVE_CAPTURE_USER_REQUIRED',
      });
    }

    if (!input.activitySource?.trim()) {
      throw Object.assign(new Error('Activity source is required'), {
        statusCode: 422,
        code: 'PASSIVE_CAPTURE_SOURCE_REQUIRED',
      });
    }

    const durationMinutes = normalizeDuration(input.durationMinutes);

    const data = {
      tenantId: input.tenantId,
      userId: input.userId,
      matterId: input.matterId ?? null,
      activityType: input.activityType,
      activitySource: input.activitySource.trim(),
      activityAt: input.activityAt,
      durationMinutes,
      suggestedDescription: input.suggestedDescription?.trim() ?? null,
      status: 'PENDING_REVIEW',
      metadata: input.metadata ?? {},
    };

    const existing = await (db.passiveCaptureEvent as any).findFirst({
      where: {
        tenantId: input.tenantId,
        userId: input.userId,
        activitySource: data.activitySource,
        activityAt: input.activityAt,
      },
      select: { id: true },
    });

    if (existing) {
      return { created: false, eventId: (existing as any).id };
    }

    const created = await (db.passiveCaptureEvent as any).create({
      data: {
        ...data,
        id: undefined, // let DB generate
      },
    });

    return { created: true, eventId: (created as any).id };
  }

  /**
   * Bulk ingest — used by workers polling email/calendar APIs.
   * Returns counts of created vs skipped (duplicate) events.
   */
  static async ingestBatch(
    db: ActivityDbClient,
    events: IngestActivityInput[],
  ): Promise<{ ingested: number; skipped: number; errors: number }> {
    let ingested = 0;
    let skipped = 0;
    let errors = 0;

    for (const event of events) {
      try {
        const result = await this.ingestActivity(db, event);
        if (result.created) ingested++;
        else skipped++;
      } catch (err) {
        console.error('[PASSIVE_CAPTURE] Ingest error', {
          source: event.activitySource,
          userId: event.userId,
          err: err instanceof Error ? err.message : String(err),
        });
        errors++;
      }
    }

    return { ingested, skipped, errors };
  }

  /**
   * Returns PENDING_REVIEW events for a user to act on.
   */
  static async getPendingReview(
    db: ActivityDbClient,
    params: {
      tenantId: string;
      userId: string;
      page?: number;
      limit?: number;
    },
  ) {
    assertTenant(params.tenantId);

    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, params.limit ?? 25);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      (db.passiveCaptureEvent as any).findMany({
        where: {
          tenantId: params.tenantId,
          userId: params.userId,
          status: 'PENDING_REVIEW',
        },
        orderBy: [{ activityAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      (db.passiveCaptureEvent as any).count({
        where: {
          tenantId: params.tenantId,
          userId: params.userId,
          status: 'PENDING_REVIEW',
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /**
   * Convenience helpers for each activity source.
   */
  static async ingestEmailActivity(
    db: ActivityDbClient,
    params: {
      tenantId: string;
      userId: string;
      matterId?: string | null;
      emailThreadId: string;
      subject?: string | null;
      sentAt: Date;
      durationMinutes?: number;
    },
  ) {
    return this.ingestActivity(db, {
      tenantId: params.tenantId,
      userId: params.userId,
      matterId: params.matterId,
      activityType: 'EMAIL',
      activitySource: `email:${params.emailThreadId}`,
      activityAt: params.sentAt,
      durationMinutes: params.durationMinutes ?? 6,
      suggestedDescription: params.subject
        ? `Email: ${params.subject}`
        : 'Email correspondence',
      metadata: { emailThreadId: params.emailThreadId, subject: params.subject },
    });
  }

  static async ingestCalendarActivity(
    db: ActivityDbClient,
    params: {
      tenantId: string;
      userId: string;
      matterId?: string | null;
      eventId: string;
      title?: string | null;
      startTime: Date;
      durationMinutes: number;
    },
  ) {
    return this.ingestActivity(db, {
      tenantId: params.tenantId,
      userId: params.userId,
      matterId: params.matterId,
      activityType: 'CALENDAR',
      activitySource: `calendar:${params.eventId}`,
      activityAt: params.startTime,
      durationMinutes: params.durationMinutes,
      suggestedDescription: params.title
        ? `Meeting: ${params.title}`
        : 'Calendar event',
      metadata: { eventId: params.eventId, title: params.title },
    });
  }

  static async ingestDocumentActivity(
    db: ActivityDbClient,
    params: {
      tenantId: string;
      userId: string;
      matterId?: string | null;
      documentId: string;
      documentTitle?: string | null;
      accessedAt: Date;
      durationMinutes?: number;
    },
  ) {
    return this.ingestActivity(db, {
      tenantId: params.tenantId,
      userId: params.userId,
      matterId: params.matterId,
      activityType: 'DOCUMENT',
      activitySource: `document:${params.documentId}:${params.accessedAt.getTime()}`,
      activityAt: params.accessedAt,
      durationMinutes: params.durationMinutes ?? 15,
      suggestedDescription: params.documentTitle
        ? `Document review: ${params.documentTitle}`
        : 'Document work',
      metadata: { documentId: params.documentId, title: params.documentTitle },
    });
  }

  static async ingestMatterApiActivity(
    db: ActivityDbClient,
    params: {
      tenantId: string;
      userId: string;
      matterId: string;
      action: string;
      occurredAt: Date;
      durationMinutes?: number;
    },
  ) {
    return this.ingestActivity(db, {
      tenantId: params.tenantId,
      userId: params.userId,
      matterId: params.matterId,
      activityType: 'MATTER_API',
      activitySource: `matter:${params.matterId}:${params.action}:${params.occurredAt.getTime()}`,
      activityAt: params.occurredAt,
      durationMinutes: params.durationMinutes ?? 5,
      suggestedDescription: `Matter activity: ${params.action}`,
      metadata: { matterId: params.matterId, action: params.action },
    });
  }
}
