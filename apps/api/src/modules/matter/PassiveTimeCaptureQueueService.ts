/**
 * PassiveTimeCaptureQueueService.ts
 *
 * Enqueues passive time capture jobs to the integrations queue.
 *
 * Job types:
 *   passive.capture.email    — ingest email thread activity
 *   passive.capture.calendar — ingest calendar event activity
 *   passive.capture.document — ingest document access activity
 *   passive.capture.matter   — ingest matter API activity
 *   passive.capture.approve  — lawyer approved a capture event → convert to TimeEntry
 *   passive.capture.discard  — lawyer discarded a capture event
 *   passive.wip.refresh      — refresh UnbilledWip for a matter
 *
 * WIP-004 — Gap 009.
 */

import { getIntegrationQueue } from '../queues/queue';

export type PassiveCaptureJobType =
  | 'passive.capture.email'
  | 'passive.capture.calendar'
  | 'passive.capture.document'
  | 'passive.capture.matter'
  | 'passive.capture.approve'
  | 'passive.capture.discard'
  | 'passive.wip.refresh';

export class PassiveTimeCaptureQueueService {
  private static queue() {
    return getIntegrationQueue();
  }

  static async enqueueEmailActivity(params: {
    tenantId: string;
    userId: string;
    matterId?: string | null;
    emailThreadId: string;
    subject?: string | null;
    sentAt: Date | string;
    durationMinutes?: number;
  }) {
    return this.queue().add('passive.capture.email', {
      ...params,
      sentAt: params.sentAt instanceof Date ? params.sentAt.toISOString() : params.sentAt,
    });
  }

  static async enqueueCalendarActivity(params: {
    tenantId: string;
    userId: string;
    matterId?: string | null;
    eventId: string;
    title?: string | null;
    startTime: Date | string;
    durationMinutes: number;
  }) {
    return this.queue().add('passive.capture.calendar', {
      ...params,
      startTime: params.startTime instanceof Date ? params.startTime.toISOString() : params.startTime,
    });
  }

  static async enqueueDocumentActivity(params: {
    tenantId: string;
    userId: string;
    matterId?: string | null;
    documentId: string;
    documentTitle?: string | null;
    accessedAt: Date | string;
    durationMinutes?: number;
  }) {
    return this.queue().add('passive.capture.document', {
      ...params,
      accessedAt: params.accessedAt instanceof Date ? params.accessedAt.toISOString() : params.accessedAt,
    });
  }

  static async enqueueMatterActivity(params: {
    tenantId: string;
    userId: string;
    matterId: string;
    action: string;
    occurredAt: Date | string;
    durationMinutes?: number;
  }) {
    return this.queue().add('passive.capture.matter', {
      ...params,
      occurredAt: params.occurredAt instanceof Date ? params.occurredAt.toISOString() : params.occurredAt,
    });
  }

  static async enqueueApproval(params: {
    tenantId: string;
    captureEventId: string;
    approvedBy: string;
    isBillable?: boolean;
    description?: string | null;
  }) {
    return this.queue().add('passive.capture.approve', params);
  }

  static async enqueueDiscard(params: {
    tenantId: string;
    captureEventId: string;
    discardedBy: string;
    reason?: string | null;
  }) {
    return this.queue().add('passive.capture.discard', params);
  }

  static async enqueueWipRefresh(params: {
    tenantId: string;
    matterId: string;
  }) {
    return this.queue().add('passive.wip.refresh', params);
  }
}
