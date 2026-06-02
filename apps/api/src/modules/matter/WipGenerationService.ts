/**
 * WipGenerationService.ts
 *
 * Maintains the UnbilledWip aggregate for each matter.
 *
 * UnbilledWip stores a pre-computed rollup of unbilled time entry hours and
 * amounts per matter. It is updated whenever a TimeEntry is:
 *   - created (DRAFT)
 *   - approved
 *   - invoiced (removed from WIP)
 *   - deleted or written off
 *
 * Call refreshWipForMatter() after any of the above state changes.
 *
 * Also handles converting an approved PassiveCaptureEvent into a TimeEntry
 * and updating UnbilledWip atomically.
 *
 * WIP-004 — Gap 009.
 */

type WipDbClient = {
  timeEntry: {
    aggregate: (args: unknown) => Promise<{
      _sum?: { durationHours?: unknown; billableAmount?: unknown } | null;
      _count?: { id?: number } | null;
    }>;
  };
  unbilledWip: {
    upsert: (args: unknown) => Promise<unknown>;
    findFirst: (args: unknown) => Promise<unknown | null>;
  };
  passiveCaptureEvent?: {
    findFirst: (args: unknown) => Promise<{
      id: string;
      tenantId: string;
      userId: string;
      matterId: string | null;
      durationMinutes: number;
      suggestedDescription: string | null;
      activityAt: Date;
    } | null>;
    update: (args: unknown) => Promise<unknown>;
  };
  $transaction?: <T>(fn: (tx: WipDbClient) => Promise<T>) => Promise<T>;
};

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof value === 'object' && value !== null && 'toString' in value) {
    const n = Number((value as { toString(): string }).toString());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export class WipGenerationService {
  /**
   * Recalculates and upserts UnbilledWip for a single matter.
   * Should be called after any TimeEntry state change on that matter.
   */
  static async refreshWipForMatter(
    db: WipDbClient,
    params: { tenantId: string; matterId: string },
  ): Promise<void> {
    if (!params.tenantId?.trim()) {
      throw Object.assign(new Error('Tenant ID is required'), {
        statusCode: 400,
        code: 'WIP_TENANT_REQUIRED',
      });
    }

    if (!params.matterId?.trim()) {
      throw Object.assign(new Error('Matter ID is required'), {
        statusCode: 400,
        code: 'WIP_MATTER_REQUIRED',
      });
    }

    const aggregate = await db.timeEntry.aggregate({
      where: {
        tenantId: params.tenantId,
        matterId: params.matterId,
        isInvoiced: false,
        status: { in: ['DRAFT', 'SUBMITTED', 'APPROVED'] },
      },
      _sum: { durationHours: true, billableAmount: true },
      _count: { id: true },
    });

    const totalHours = toNumber(aggregate._sum?.durationHours);
    const totalUnbilledAmount = toNumber(aggregate._sum?.billableAmount);
    const timeEntryCount =
      typeof aggregate._count === 'number'
        ? aggregate._count
        : (aggregate._count?.id ?? 0);

    await db.unbilledWip.upsert({
      where: { matterId: params.matterId } as any,
      create: {
        tenantId: params.tenantId,
        matterId: params.matterId,
        timeEntryCount,
        totalHours,
        totalUnbilledAmount,
        lastUpdatedAt: new Date(),
      },
      update: {
        timeEntryCount,
        totalHours,
        totalUnbilledAmount,
        lastUpdatedAt: new Date(),
      },
    });
  }

  /**
   * Converts an APPROVED PassiveCaptureEvent into a DRAFT TimeEntry
   * and refreshes UnbilledWip for the associated matter.
   *
   * Called by the approval workflow when a lawyer accepts a passive suggestion.
   */
  static async convertCaptureEventToTimeEntry(
    db: WipDbClient & {
      passiveCaptureEvent: NonNullable<WipDbClient['passiveCaptureEvent']>;
      timeEntry: WipDbClient['timeEntry'] & {
        create: (args: unknown) => Promise<{ id: string; matterId: string }>;
      };
    },
    params: {
      tenantId: string;
      captureEventId: string;
      approvedBy: string;
      isBillable?: boolean;
      description?: string | null;
    },
  ): Promise<{ timeEntryId: string; matterId: string }> {
    if (!params.tenantId?.trim()) {
      throw Object.assign(new Error('Tenant ID is required'), {
        statusCode: 400,
        code: 'WIP_CONVERSION_TENANT_REQUIRED',
      });
    }

    const event = await db.passiveCaptureEvent.findFirst({
      where: { id: params.captureEventId, tenantId: params.tenantId },
    });

    if (!event) {
      throw Object.assign(new Error('Passive capture event not found'), {
        statusCode: 404,
        code: 'PASSIVE_CAPTURE_EVENT_NOT_FOUND',
      });
    }

    if (!event.matterId) {
      throw Object.assign(
        new Error('Passive capture event must have a matter assigned before conversion'),
        { statusCode: 422, code: 'PASSIVE_CAPTURE_MATTER_REQUIRED' },
      );
    }

    const durationHours = (event.durationMinutes / 60).toFixed(2);

    const timeEntry = await (db as any).timeEntry.create({
      data: {
        tenantId: params.tenantId,
        matterId: event.matterId,
        advocateId: event.userId,
        description:
          params.description?.trim() ||
          event.suggestedDescription ||
          `Passive capture: ${event.activityAt.toLocaleDateString()}`,
        entryDate: event.activityAt,
        startTime: event.activityAt,
        durationHours,
        durationMinutes: event.durationMinutes,
        appliedRate: '0.00',
        billableAmount: '0.00',
        isBillable: params.isBillable ?? true,
        status: 'DRAFT',
        billingModel: 'HOURLY',
      },
      select: { id: true, matterId: true },
    });

    // Mark capture event as CONVERTED
    await db.passiveCaptureEvent.update({
      where: { id: params.captureEventId } as any,
      data: {
        status: 'CONVERTED',
        convertedTimeEntryId: timeEntry.id,
      },
    });

    // Refresh UnbilledWip
    await this.refreshWipForMatter(db as WipDbClient, {
      tenantId: params.tenantId,
      matterId: event.matterId,
    });

    console.info('[WIP] Passive event converted', {
      captureEventId: params.captureEventId,
      timeEntryId: timeEntry.id,
      matterId: event.matterId,
      durationMinutes: event.durationMinutes,
    });

    return { timeEntryId: timeEntry.id, matterId: event.matterId };
  }
}
