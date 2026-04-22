// apps/api/src/modules/document/DocumentApprovalBridgeService.ts

import { DocumentAccessService } from './DocumentAccessService';
import { DocumentAuditService } from './DocumentAuditService';

export type DocumentApprovalRequest = {
  tenantId: string;
  documentId: string;
  actorId: string;
  approvalType:
    | 'DOCUMENT_REVIEW'
    | 'CONTRACT_REVIEW'
    | 'COURT_FILING_REVIEW'
    | 'CLIENT_RELEASE'
    | 'INTERNAL_APPROVAL';
  reason?: string | null;
  requestId?: string | null;
};

export class DocumentApprovalBridgeService {
  /**
   * Fail-closed bridge to the future Central Approval Workflow module.
   *
   * This keeps Document Management from creating isolated approval logic that
   * later drifts from finance, trust, procurement, HR, court filing, and billing approvals.
   */
  static async submitForApproval(db: any, params: DocumentApprovalRequest) {
    if (!params.tenantId?.trim()) {
      throw Object.assign(new Error('Tenant ID is required for document approval'), {
        statusCode: 400,
        code: 'DOCUMENT_APPROVAL_TENANT_REQUIRED',
      });
    }

    if (!params.documentId?.trim()) {
      throw Object.assign(new Error('Document ID is required for document approval'), {
        statusCode: 422,
        code: 'DOCUMENT_APPROVAL_DOCUMENT_REQUIRED',
      });
    }

    if (!params.actorId?.trim()) {
      throw Object.assign(new Error('Actor ID is required for document approval'), {
        statusCode: 422,
        code: 'DOCUMENT_APPROVAL_ACTOR_REQUIRED',
      });
    }

    const access = await DocumentAccessService.verifyAccess(db, {
      tenantId: params.tenantId,
      userId: params.actorId,
      documentId: params.documentId,
      requiredAction: 'view',
    });

    await DocumentAuditService.logAction(db, {
      tenantId: params.tenantId,
      userId: params.actorId,
      documentId: params.documentId,
      matterId: access.document.matterId ?? null,
      action: 'APPROVAL_REQUESTED',
      requestId: params.requestId ?? null,
      fileHash: access.document.fileHash,
      version: access.document.version,
      metadata: {
        approvalType: params.approvalType,
        reason: params.reason?.trim() ?? null,
      },
    });

    throw Object.assign(
      new Error('Central Approval Workflow module is required before document approvals can be activated'),
      {
        statusCode: 501,
        code: 'DOCUMENT_APPROVAL_MODULE_REQUIRED',
      },
    );
  }
}

export default DocumentApprovalBridgeService;