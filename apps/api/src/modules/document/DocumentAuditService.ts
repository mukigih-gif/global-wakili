// apps/api/src/modules/document/DocumentAuditService.ts

export type DocumentAuditAction =
  | 'UPLOADED'
  | 'VIEWED'
  | 'DOWNLOADED'
  | 'SIGNED_URL_ISSUED'
  | 'SEARCHED'
  | 'ACCESS_DENIED'
  | 'ARCHIVED'
  | 'RESTORED'
  | 'VERSION_CREATED'
  | 'SHARE_REQUESTED'
  | 'SIGNATURE_REQUESTED'
  | 'APPROVAL_REQUESTED'
  | 'INTELLIGENCE_REQUESTED'
  | 'CAPABILITY_VIEWED';

export class DocumentAuditService {
  static async logAction(
    db: any,
    params: {
      tenantId: string;
      userId?: string | null;
      documentId?: string | null;
      matterId?: string | null;
      action: DocumentAuditAction;
      requestId?: string | null;
      ipAddress?: string | null;
      userAgent?: string | null;
      fileHash?: string | null;
      version?: number | null;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    if (!params.tenantId?.trim()) {
      throw Object.assign(new Error('Tenant ID is required for document audit'), {
        statusCode: 400,
        code: 'DOCUMENT_AUDIT_TENANT_REQUIRED',
      });
    }

    return db.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId ?? null,
        action: `DOCUMENT_${params.action}`,
        entityId: params.documentId ?? null,
        entityType: 'DOCUMENT',
        metadata: {
          requestId: params.requestId ?? null,
          matterId: params.matterId ?? null,
          fileHash: params.fileHash ?? null,
          version: params.version ?? null,
          ip: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
          timestamp: new Date().toISOString(),
          ...(params.metadata ?? {}),
        },
      },
    });
  }
}