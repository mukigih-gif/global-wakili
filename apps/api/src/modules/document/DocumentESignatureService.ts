// apps/api/src/modules/document/DocumentESignatureService.ts

import { DocumentAccessService } from './DocumentAccessService';
import { DocumentAuditService } from './DocumentAuditService';

export type DocumentSignatureRequest = {
  tenantId: string;
  documentId: string;
  actorId: string;
  signerName: string;
  signerEmail: string;
  signerRole?: string | null;
  reason?: string | null;
  requestId?: string | null;
};

function assertEmail(email: string): void {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error('Valid signer email is required'), {
      statusCode: 422,
      code: 'DOCUMENT_SIGNATURE_EMAIL_INVALID',
    });
  }
}

export class DocumentESignatureService {
  /**
   * Fail-closed e-signature contract.
   *
   * E-signatures require provider-backed signer identity verification,
   * immutable event trail, certificate capture, consent text, timestamping,
   * and signed artifact storage.
   */
  static async requestSignature(db: any, params: DocumentSignatureRequest) {
    if (!params.tenantId?.trim()) {
      throw Object.assign(new Error('Tenant ID is required for e-signature'), {
        statusCode: 400,
        code: 'DOCUMENT_SIGNATURE_TENANT_REQUIRED',
      });
    }

    if (!params.documentId?.trim()) {
      throw Object.assign(new Error('Document ID is required for e-signature'), {
        statusCode: 422,
        code: 'DOCUMENT_SIGNATURE_DOCUMENT_REQUIRED',
      });
    }

    if (!params.actorId?.trim()) {
      throw Object.assign(new Error('Actor ID is required for e-signature'), {
        statusCode: 422,
        code: 'DOCUMENT_SIGNATURE_ACTOR_REQUIRED',
      });
    }

    if (!params.signerName?.trim()) {
      throw Object.assign(new Error('Signer name is required'), {
        statusCode: 422,
        code: 'DOCUMENT_SIGNATURE_SIGNER_NAME_REQUIRED',
      });
    }

    assertEmail(params.signerEmail);

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
      action: 'SIGNATURE_REQUESTED',
      requestId: params.requestId ?? null,
      fileHash: access.document.fileHash,
      version: access.document.version,
      metadata: {
        signerName: params.signerName.trim(),
        signerEmail: params.signerEmail.trim().toLowerCase(),
        signerRole: params.signerRole?.trim() ?? null,
        reason: params.reason?.trim() ?? null,
      },
    });

    throw Object.assign(
      new Error('Document e-signature provider and signature model are required before activation'),
      {
        statusCode: 501,
        code: 'DOCUMENT_ESIGN_PROVIDER_REQUIRED',
      },
    );
  }
}

export default DocumentESignatureService;