// apps/api/src/modules/document/DocumentAuditService.ts

import { logSecurityEvent, inferAuditAction } from '../../utils/audit-logger';
import { AuditSeverity } from '../../types/audit';

export type DocumentAuditAction =
  | 'UPLOADED'
  | 'VIEWED'
  | 'EDITED'
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

    return logSecurityEvent({
      db,
      tenantId: params.tenantId,
      userId: params.userId ?? null,
      action: inferAuditAction(params.action),
      severity: AuditSeverity.INFO,
      entityType: 'DOCUMENT',
      entityId: params.documentId ?? 'N/A',
      requestId: params.requestId ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      afterData: {
        eventCode: `DOCUMENT_${params.action}`,
        matterId: params.matterId ?? null,
        fileHash: params.fileHash ?? null,
        version: params.version ?? null,
        ...(params.metadata ?? {}),
      },
      allowMissingTenant: true,
    });
  }
}
