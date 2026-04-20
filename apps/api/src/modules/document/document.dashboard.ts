import { Prisma } from '@global-wakili/database';

function toDecimal(value: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) return new Prisma.Decimal(0);
  return new Prisma.Decimal(value);
}

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildDateWindow(params: {
  from?: Date | string | null;
  to?: Date | string | null;
}) {
  const from = normalizeDate(params.from);
  const to = normalizeDate(params.to);

  if (!from && !to) return undefined;

  return {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  };
}

export class DocumentDashboardService {
  static async getDashboard(
    db: any,
    params: {
      tenantId: string;
      matterId?: string | null;
      from?: Date | string | null;
      to?: Date | string | null;
      expiryWindowDays?: number;
      disposalRetentionYears?: number;
    },
  ) {
    const expiryWindowDays = params.expiryWindowDays ?? 30;
    const disposalRetentionYears = params.disposalRetentionYears ?? 7;

    const createdAtWindow = buildDateWindow({
      from: params.from ?? null,
      to: params.to ?? null,
    });

    const baseWhere: Record<string, unknown> = {
      tenantId: params.tenantId,
      ...(params.matterId ? { matterId: params.matterId } : {}),
      ...(createdAtWindow ? { createdAt: createdAtWindow } : {}),
    };

    const activeWhere = {
      ...baseWhere,
      deletedAt: null,
    };

    const now = new Date();
    const expiryThreshold = new Date(now.getTime() + expiryWindowDays * 24 * 60 * 60 * 1000);
    const disposalThreshold = new Date();
    disposalThreshold.setFullYear(disposalThreshold.getFullYear() - disposalRetentionYears);

    const [
      totalActiveCount,
      totalArchivedCount,
      allCountsByStatus,
      totalSizeAgg,
      activeDocumentsForBreakdown,
      expiringDocuments,
      expiredDocuments,
      disposalEligibleDocuments,
      retentionReviewQueue,
      recentDocuments,
      recentEvidenceDocuments,
      contractAgg,
      recentContractVersions,
      uploadsByUserRaw,
      auditSummaryRaw,
      matterSummary,
    ] = await Promise.all([
      db.document.count({
        where: activeWhere,
      }),

      db.document.count({
        where: {
          ...baseWhere,
          status: 'ARCHIVED',
        },
      }),

      db.document.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: {
          id: true,
        },
      }),

      db.document.aggregate({
        where: activeWhere,
        _sum: {
          fileSize: true,
        },
      }),

      db.document.findMany({
        where: activeWhere,
        select: {
          id: true,
          status: true,
          fileSize: true,
          metadata: true,
        },
      }),

      db.document.findMany({
        where: {
          ...activeWhere,
          expiryDate: {
            gte: now,
            lte: expiryThreshold,
          },
        },
        include: {
          matter: {
            select: {
              id: true,
              title: true,
              matterCode: true,
            },
          },
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ expiryDate: 'asc' }, { createdAt: 'desc' }],
        take: 20,
      }),

      db.document.findMany({
        where: {
          ...activeWhere,
          expiryDate: {
            lt: now,
          },
        },
        include: {
          matter: {
            select: {
              id: true,
              title: true,
              matterCode: true,
            },
          },
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ expiryDate: 'asc' }, { createdAt: 'desc' }],
        take: 20,
      }),

      db.document.findMany({
        where: {
          ...baseWhere,
          status: 'ARCHIVED',
          deletedAt: {
            lte: disposalThreshold,
          },
        },
        include: {
          matter: {
            select: {
              id: true,
              title: true,
              matterCode: true,
            },
          },
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ deletedAt: 'asc' }, { updatedAt: 'asc' }],
        take: 20,
      }),

      db.document.findMany({
        where: {
          ...baseWhere,
          status: 'ARCHIVED',
          OR: [
            { deletedAt: null },
            {
              deletedAt: {
                gt: disposalThreshold,
              },
            },
          ],
        },
        include: {
          matter: {
            select: {
              id: true,
              title: true,
              matterCode: true,
            },
          },
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ updatedAt: 'asc' }, { createdAt: 'asc' }],
        take: 20,
      }),

      db.document.findMany({
        where: activeWhere,
        include: {
          matter: {
            select: {
              id: true,
              title: true,
              matterCode: true,
            },
          },
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 15,
      }),

      db.document.findMany({
        where: {
          ...activeWhere,
          metadata: {
            path: ['category'],
            equals: 'EVIDENCE',
          },
        },
        include: {
          matter: {
            select: {
              id: true,
              title: true,
              matterCode: true,
            },
          },
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 10,
      }),

      db.contract.aggregate({
        where: {
          tenantId: params.tenantId,
          ...(params.matterId ? { matterId: params.matterId } : {}),
          ...(createdAtWindow ? { createdAt: createdAtWindow } : {}),
        },
        _count: {
          id: true,
        },
      }),

      db.contractVersion.findMany({
        where: {
          tenantId: params.tenantId,
          ...(params.matterId
            ? {
                contract: {
                  matterId: params.matterId,
                },
              }
            : {}),
          ...(createdAtWindow ? { createdAt: createdAtWindow } : {}),
        },
        include: {
          contract: {
            select: {
              id: true,
              contractNumber: true,
              title: true,
              matterId: true,
              matter: {
                select: {
                  id: true,
                  title: true,
                  matterCode: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { versionNumber: 'desc' }],
        take: 10,
      }),

      db.document.groupBy({
        by: ['uploadedBy'],
        where: activeWhere,
        _count: {
          id: true,
        },
        _sum: {
          fileSize: true,
        },
      }),

      db.auditLog.findMany({
        where: {
          tenantId: params.tenantId,
          entityType: 'DOCUMENT',
          ...(createdAtWindow ? { createdAt: createdAtWindow } : {}),
        },
        select: {
          id: true,
          action: true,
          createdAt: true,
          userId: true,
          metadata: true,
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 200,
      }),

      params.matterId
        ? db.matter.findFirst({
            where: {
              tenantId: params.tenantId,
              id: params.matterId,
            },
            select: {
              id: true,
              title: true,
              matterCode: true,
              status: true,
              client: {
                select: {
                  id: true,
                  name: true,
                  clientCode: true,
                },
              },
            },
          })
        : Promise.resolve(null),
    ]);

    const totalSizeBytes = toDecimal(totalSizeAgg._sum.fileSize);

    const statusBreakdown = allCountsByStatus.reduce((acc: Record<string, number>, row: any) => {
      acc[row.status] = row._count.id;
      return acc;
    }, {});

    let confidentialCount = 0;
    let restrictedCount = 0;
    const categoryBreakdown: Record<string, number> = {};
    const versionBreakdown: Record<string, number> = {};

    for (const doc of activeDocumentsForBreakdown) {
      const meta = (doc.metadata ?? {}) as Record<string, any>;
      const category = String(meta.category ?? 'OTHER').toUpperCase();
      const isConfidential = meta.isConfidential === true;
      const isRestricted = meta.isRestricted === true;

      categoryBreakdown[category] = (categoryBreakdown[category] ?? 0) + 1;

      if (isConfidential) confidentialCount += 1;
      if (isRestricted) restrictedCount += 1;

      const versionBucket =
        typeof doc.status === 'string'
          ? String(doc.status).toUpperCase()
          : 'UNKNOWN';
      versionBreakdown[versionBucket] = (versionBreakdown[versionBucket] ?? 0) + 1;
    }

    const evidenceCount = categoryBreakdown.EVIDENCE ?? 0;
    const contractCount = contractAgg._count.id;

    const uploaderIds = uploadsByUserRaw.map((row: any) => row.uploadedBy).filter(Boolean);

    const uploadUsers = uploaderIds.length
      ? await db.user.findMany({
          where: {
            tenantId: params.tenantId,
            id: {
              in: uploaderIds,
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : [];

    const uploadUserMap = new Map(uploadUsers.map((user: any) => [user.id, user]));

    const uploadsByUser = uploadsByUserRaw
      .map((row: any) => ({
        uploadedBy: row.uploadedBy,
        user: uploadUserMap.get(row.uploadedBy) ?? null,
        documentCount: row._count.id,
        totalSizeBytes: toDecimal(row._sum.fileSize),
      }))
      .sort((a: any, b: any) => b.documentCount - a.documentCount)
      .slice(0, 10);

    const auditActionBreakdown = auditSummaryRaw.reduce(
      (acc: Record<string, number>, row: any) => {
        acc[row.action] = (acc[row.action] ?? 0) + 1;
        return acc;
      },
      {},
    );

    const recentAuditActivity = auditSummaryRaw.slice(0, 20);

    return {
      scope: {
        tenantId: params.tenantId,
        matterId: params.matterId ?? null,
        from: normalizeDate(params.from)?.toISOString() ?? null,
        to: normalizeDate(params.to)?.toISOString() ?? null,
      },

      matter: matterSummary,

      summary: {
        totalActiveDocuments: totalActiveCount,
        totalArchivedDocuments: totalArchivedCount,
        totalSizeBytes,
        confidentialCount,
        restrictedCount,
        evidenceCount,
        contractCount,
      },

      breakdowns: {
        statusBreakdown,
        categoryBreakdown,
        lifecycleBreakdown: versionBreakdown,
        auditActionBreakdown,
      },

      expiring: {
        windowDays: expiryWindowDays,
        count: expiringDocuments.length,
        documents: expiringDocuments,
      },

      expired: {
        count: expiredDocuments.length,
        documents: expiredDocuments,
      },

      retention: {
        disposalRetentionYears,
        disposalEligibleCount: disposalEligibleDocuments.length,
        disposalEligibleDocuments,
        retentionReviewCount: retentionReviewQueue.length,
        retentionReviewQueue,
      },

      contracts: {
        totalContracts: contractCount,
        recentVersions: recentContractVersions,
      },

      evidence: {
        totalEvidenceDocuments: evidenceCount,
        recentEvidenceDocuments,
      },

      uploads: {
        topUploaders: uploadsByUser,
      },

      recentDocuments,

      audit: {
        recentActivity: recentAuditActivity,
      },

      generatedAt: new Date(),
    };
  }
}