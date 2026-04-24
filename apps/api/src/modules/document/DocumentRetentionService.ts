export class DocumentRetentionService {
  /**
   * Documents with explicit expiry dates that have passed.
   */
  static async getExpiryEligibleDocuments(db: any, tenantId: string) {
    return db.document.findMany({
      where: {
        tenantId,
        deletedAt: null,
        expiryDate: {
          lte: new Date(),
        },
      },
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Archived/deleted documents that may now be reviewed for disposal.
   * Uses deletedAt as the current retention clock because the schema does not yet
   * expose a dedicated matter-closure date on Document.
   */
  static async getDisposalEligibleDocuments(
    db: any,
    params: {
      tenantId: string;
      retentionYears?: number;
    },
  ) {
    const retentionYears = params.retentionYears ?? 7;
    const threshold = new Date();
    threshold.setFullYear(threshold.getFullYear() - retentionYears);

    return db.document.findMany({
      where: {
        tenantId: params.tenantId,
        status: 'ARCHIVED',
        deletedAt: {
          lte: threshold,
        },
      },
      orderBy: [{ deletedAt: 'asc' }, { updatedAt: 'asc' }],
    });
  }

  /**
   * Archived documents still within retention that should remain preserved.
   */
  static async getRetentionReviewQueue(
    db: any,
    params: {
      tenantId: string;
      retentionYears?: number;
    },
  ) {
    const retentionYears = params.retentionYears ?? 7;
    const threshold = new Date();
    threshold.setFullYear(threshold.getFullYear() - retentionYears);

    return db.document.findMany({
      where: {
        tenantId: params.tenantId,
        status: 'ARCHIVED',
        OR: [
          { deletedAt: null },
          {
            deletedAt: {
              gt: threshold,
            },
          },
        ],
      },
      orderBy: [{ updatedAt: 'asc' }, { createdAt: 'asc' }],
    });
  }
}