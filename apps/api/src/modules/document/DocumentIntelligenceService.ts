// apps/api/src/modules/document/DocumentIntelligenceService.ts

import { DocumentAccessService } from './DocumentAccessService';
import { DocumentAuditService } from './DocumentAuditService';

export type DocumentIntelligenceRequest = {
  tenantId: string;
  documentId: string;
  actorId: string;
  operation:
    | 'OCR'
    | 'SUMMARY'
    | 'CLAUSE_EXTRACTION'
    | 'RISK_REVIEW'
    | 'TRANSLATION'
    | 'CLASSIFICATION';
  requestId?: string | null;
};

export class DocumentIntelligenceService {
  /**
   * Fail-closed bridge to governed OCR/AI document intelligence.
   *
   * No AI/OCR operation should run until tenant isolation, audit logging,
   * provider configuration, data-retention controls, and privilege-safe prompts
   * are formally implemented.
   */
  static async requestAnalysis(db: any, params: DocumentIntelligenceRequest) {
    if (!params.tenantId?.trim()) {
      throw Object.assign(new Error('Tenant ID is required for document intelligence'), {
        statusCode: 400,
        code: 'DOCUMENT_INTELLIGENCE_TENANT_REQUIRED',
      });
    }

    if (!params.documentId?.trim()) {
      throw Object.assign(new Error('Document ID is required for document intelligence'), {
        statusCode: 422,
        code: 'DOCUMENT_INTELLIGENCE_DOCUMENT_REQUIRED',
      });
    }

    if (!params.actorId?.trim()) {
      throw Object.assign(new Error('Actor ID is required for document intelligence'), {
        statusCode: 422,
        code: 'DOCUMENT_INTELLIGENCE_ACTOR_REQUIRED',
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
      action: 'INTELLIGENCE_REQUESTED',
      requestId: params.requestId ?? null,
      fileHash: access.document.fileHash,
      version: access.document.version,
      metadata: {
        operation: params.operation,
      },
    });

    throw Object.assign(
      new Error('Governed AI/OCR document intelligence module is required before activation'),
      {
        statusCode: 501,
        code: 'DOCUMENT_INTELLIGENCE_MODULE_REQUIRED',
      },
    );
  }
}

export default DocumentIntelligenceService;