/**
 * DocumentRetentionService.ts
 *
 * Retention policy query layer — returns documents eligible for action.
 * All queries are tenant-scoped (tenantId required, enforced by guard).
 *
 * Default retention period: 7 years (Kenya Advocates Act minimum for client files).
 * Configurable per call via retentionYears parameter.
 *
 * Enforcement (archive/delete) is handled by DocumentRetentionRunner.
 *
 * WIP-003 — Gap 007 hardening.
 */

type RetentionDbClient = {
  document: {
    findMany: (args: unknown) => Promise<unknown[]>;
  };
};

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for retention queries'), {
      statusCode: 400,
      code: 'RETENTION_TENANT_REQUIRED',
    });
  }
}

export class DocumentRetentionService {
  /** Documents whose explicit expiryDate has passed — eligible for archiving. */
  static async getExpiryEligibleDocuments(db: RetentionDbClient, tenantId: string) {
    assertTenant(tenantId);

    return db.document.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: { not: 'ARCHIVED' },
        expiryDate: { lte: new Date() },
      },
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Archived documents past the retention window — eligible for disposal.
   * Default: 7 years from archival date (Kenya legal minimum).
   */
  static async getDisposalEligibleDocuments(
    db: RetentionDbClient,
    params: { tenantId: string; retentionYears?: number },
  ) {
    assertTenant(params.tenantId);

    const retentionYears = params.retentionYears ?? 7;
    const threshold = new Date();
    threshold.setFullYear(threshold.getFullYear() - retentionYears);

    return db.document.findMany({
      where: {
        tenantId: params.tenantId,
        status: 'ARCHIVED',
        deletedAt: { lte: threshold },
      },
      orderBy: [{ deletedAt: 'asc' }, { updatedAt: 'asc' }],
    });
  }

  /** Archived documents still within retention — must be preserved. */
  static async getRetentionReviewQueue(
    db: RetentionDbClient,
    params: { tenantId: string; retentionYears?: number },
  ) {
    assertTenant(params.tenantId);

    const retentionYears = params.retentionYears ?? 7;
    const threshold = new Date();
    threshold.setFullYear(threshold.getFullYear() - retentionYears);

    return db.document.findMany({
      where: {
        tenantId: params.tenantId,
        status: 'ARCHIVED',
        OR: [
          { deletedAt: null },
          { deletedAt: { gt: threshold } },
        ],
      },
      orderBy: [{ updatedAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /** Documents expiring within the next N days — eligible for advance notification. */
  static async getExpiringDocuments(
    db: RetentionDbClient,
    params: { tenantId: string; withinDays: number },
  ) {
    assertTenant(params.tenantId);

    const now = new Date();
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + params.withinDays);

    return db.document.findMany({
      where: {
        tenantId: params.tenantId,
        deletedAt: null,
        status: { not: 'ARCHIVED' },
        expiryDate: { gte: now, lte: horizon },
      },
      orderBy: [{ expiryDate: 'asc' }],
    });
  }
}
