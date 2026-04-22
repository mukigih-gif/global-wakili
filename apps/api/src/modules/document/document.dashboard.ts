// apps/api/src/modules/document/document.dashboard.ts

import { DocumentAccessPolicyService } from './DocumentAccessPolicyService';

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return Number(value) || 0;
}

function getDocumentCategory(metadata: unknown): string {
  const meta = (metadata ?? {}) as Record<string, unknown>;
  return typeof meta.category === 'string' ? meta.category : 'OTHER';
}

function getDocumentTags(metadata: unknown): string[] {
  const meta = (metadata ?? {}) as Record<string, unknown>;
  return Array.isArray(meta.tags)
    ? meta.tags.filter((tag): tag is string => typeof tag === 'string')
    : [];
}

function isConfidential(metadata: unknown): boolean {
  return ((metadata ?? {}) as Record<string, unknown>).isConfidential === true;
}

function isRestricted(metadata: unknown): boolean {
  return ((metadata ?? {}) as Record<string, unknown>).isRestricted === true;
}

function compactDocument(document: any) {
  return {
    id: document.id,
    title: document.title,
    matterId: document.matterId ?? null,
    matter: document.matter ?? null,
    uploadedBy: document.uploadedBy ?? null,
    uploader: document.uploader ?? null,
    mimeType: document.mimeType ?? null,
    fileSize: document.fileSize ?? null,
    status: document.status ?? null,
    version: document.version ?? null,
    expiryDate: document.expiryDate ?? null,
    createdAt: document.createdAt ?? null,
    metadata: {
      category: getDocumentCategory(document.metadata),
      tags: getDocumentTags(document.metadata),
      isConfidential: isConfidential(document.metadata),
      isRestricted: isRestricted(document.metadata),
    },
  };
}

export class DocumentDashboardService {
  static async getDashboard(
    db: any,
    params: {
      tenantId: string;
      userId?: string | null;
      matterId?: string | null;
      from?: Date | string | null;
      to?: Date | string | null;
      expiryWindowDays?: number;
      disposalRetentionYears?: number;
      includeRestricted?: boolean;
    },
  ) {
    if (!params.tenantId?.trim()) {
      throw Object.assign(new Error('Tenant ID is required for document dashboard'), {
        statusCode: 400,
        code: 'DOCUMENT_DASHBOARD_TENANT_REQUIRED',
      });
    }

    const now = new Date();
    const from = normalizeDate(params.from);
    const to = normalizeDate(params.to);
    const expiryWindowDays = params.expiryWindowDays ?? 30;
    const disposalRetentionYears = params.disposalRetentionYears ?? 7;

    const expiryWindowEnd = new Date(now);
    expiryWindowEnd.setDate(expiryWindowEnd.getDate() + expiryWindowDays);

    const disposalThreshold = new Date(now);
    disposalThreshold.setFullYear(disposalThreshold.getFullYear() - disposalRetentionYears);

    const dateRangeAnd =
      from || to
        ? [
            {
              createdAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            },
          ]
        : [];

    const activeWhere = DocumentAccessPolicyService.buildDocumentWhere({
      tenantId: params.tenantId,
      userId: params.userId,
      matterId: params.matterId ?? null,
      includeRestricted: params.includeRestricted,
      deletedAtMode: 'active',
      extraAnd: dateRangeAnd,
    });

    const archivedWhere = DocumentAccessPolicyService.buildDocumentWhere({
      tenantId: params.tenantId,
      userId: params.userId,
      matterId: params.matterId ?? null,
      includeRestricted: params.includeRestricted,
      deletedAtMode: 'archived',
      extraAnd: dateRangeAnd,
    });

    const expiringWhere = DocumentAccessPolicyService.buildDocumentWhere({
      tenantId: params.tenantId,
      userId: params.userId,
      matterId: params.matterId ?? null,
      includeRestricted: params.includeRestricted,
      deletedAtMode: 'active',
      extraAnd: [
        ...dateRangeAnd,
        {
          expiryDate: {
            gte: now,
            lte: expiryWindowEnd,
          },
        },
      ],
    });

    const expiredWhere = DocumentAccessPolicyService.buildDocumentWhere({
      tenantId: params.tenantId,
      userId: params.userId,
      matterId: params.matterId ?? null,
      includeRestricted: params.includeRestricted,
      deletedAtMode: 'active',
      extraAnd: [
        ...dateRangeAnd,
        {
          expiryDate: {
            lt: now,
          },
        },
      ],
    });

    const disposalEligibleWhere = DocumentAccessPolicyService.buildDocumentWhere({
      tenantId: params.tenantId,
      userId: params.userId,
      matterId: params.matterId ?? null,
      includeRestricted: params.includeRestricted,
      deletedAtMode: 'archived',
      extraAnd: [
        {
          deletedAt: {
            lte: disposalThreshold,
          },
        },
      ],
    });

    const [
      totalActiveDocuments,
      totalArchivedDocuments,
      totalActiveStorage,
      expiringDocuments,
      expiredDocuments,
      disposalEligibleDocuments,
      recentDocuments,
      activeDocumentsForBreakdown,
      uploadGroups,
    ] = await Promise.all([
      db.document.count({ where: activeWhere }),
      db.document.count({ where: archivedWhere }),
      db.document.aggregate({
        where: activeWhere,
        _sum: {
          fileSize: true,
        },
      }),
      db.document.findMany({
        where: expiringWhere,
        orderBy: [{ expiryDate: 'asc' }, { createdAt: 'desc' }],
        take: 20,
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
      }),
      db.document.findMany({
        where: expiredWhere,
        orderBy: [{ expiryDate: 'asc' }, { createdAt: 'desc' }],
        take: 20,
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
      }),
      db.document.findMany({
        where: disposalEligibleWhere,
        orderBy: [{ deletedAt: 'asc' }],
        take: 20,
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
      }),
      db.document.findMany({
        where: activeWhere,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 20,
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
      }),
      db.document.findMany({
        where: activeWhere,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 1000,
        select: {
          id: true,
          mimeType: true,
          fileSize: true,
          status: true,
          version: true,
          metadata: true,
        },
      }),
      db.document.groupBy({
        by: ['uploadedBy'],
        where: activeWhere,
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    const uploaderIds = uploadGroups
      .map((group: any) => group.uploadedBy)
      .filter(Boolean);

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

    const categoryBreakdown: Record<string, number> = {};
    const mimeTypeBreakdown: Record<string, number> = {};
    const statusBreakdown: Record<string, number> = {};
    const versionBreakdown: Record<string, number> = {};
    let confidentialCount = 0;
    let restrictedCount = 0;

    for (const document of activeDocumentsForBreakdown) {
      const category = getDocumentCategory(document.metadata);
      const mimeType = document.mimeType ?? 'unknown';
      const status = document.status ?? 'UNKNOWN';
      const versionBucket =
        Number(document.version ?? 1) > 1 ? 'VERSIONED' : 'FIRST_VERSION';

      categoryBreakdown[category] = (categoryBreakdown[category] ?? 0) + 1;
      mimeTypeBreakdown[mimeType] = (mimeTypeBreakdown[mimeType] ?? 0) + 1;
      statusBreakdown[status] = (statusBreakdown[status] ?? 0) + 1;
      versionBreakdown[versionBucket] = (versionBreakdown[versionBucket] ?? 0) + 1;

      if (isConfidential(document.metadata)) confidentialCount += 1;
      if (isRestricted(document.metadata)) restrictedCount += 1;
    }

    const accessibleDocIdsForAudit = recentDocuments
      .map((document: any) => document.id)
      .filter(Boolean);

    const recentAuditActivity = accessibleDocIdsForAudit.length
      ? await db.auditLog.findMany({
          where: {
            tenantId: params.tenantId,
            entityType: 'DOCUMENT',
            entityId: {
              in: accessibleDocIdsForAudit,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 20,
        })
      : [];

    return {
      tenantId: params.tenantId,
      matterId: params.matterId ?? null,
      generatedAt: new Date(),
      accessScope: {
        userId: params.userId ?? null,
        includeRestricted: params.includeRestricted === true,
        note:
          params.includeRestricted === true
            ? 'Privileged dashboard scope requested.'
            : 'Dashboard is filtered through document access policy.',
      },
      summary: {
        totalActiveDocuments,
        totalArchivedDocuments,
        activeStorageBytes: toNumber(totalActiveStorage?._sum?.fileSize),
        confidentialCount,
        restrictedCount,
        categoryBreakdown,
        mimeTypeBreakdown,
        statusBreakdown,
        versionBreakdown,
      },
      expiry: {
        expiryWindowDays,
        expiringCount: expiringDocuments.length,
        expiringDocuments: expiringDocuments.map(compactDocument),
        expiredCount: expiredDocuments.length,
        expiredDocuments: expiredDocuments.map(compactDocument),
      },
      retention: {
        disposalRetentionYears,
        disposalEligibleCount: disposalEligibleDocuments.length,
        disposalEligibleDocuments: disposalEligibleDocuments.map(compactDocument),
      },
      uploads: {
        topUploaders: uploadGroups.map((group: any) => ({
          uploadedBy: group.uploadedBy,
          user: uploadUserMap.get(group.uploadedBy) ?? null,
          documentCount: group._count.id,
        })),
      },
      recentDocuments: recentDocuments.map(compactDocument),
      audit: {
        recentActivity: recentAuditActivity,
      },
    };
  }
}