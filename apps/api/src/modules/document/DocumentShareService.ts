// apps/api/src/modules/document/DocumentShareService.ts

import { DocumentAccessService } from './DocumentAccessService';
import { DocumentAuditService } from './DocumentAuditService';

export type DocumentShareRequest = {
  tenantId: string;
  documentId: string;
  actorId: string;
  recipientUserIds?: string[];
  recipientEmails?: string[];
  expiresAt?: Date | string | null;
  allowDownload?: boolean;
  message?: string | null;
  requestId?: string | null;
};

function normalizeRecipients(params: DocumentShareRequest): {
  recipientUserIds: string[];
  recipientEmails: string[];
} {
  const recipientUserIds = Array.from(
    new Set((params.recipientUserIds ?? []).map((value) => value.trim()).filter(Boolean)),
  );

  const recipientEmails = Array.from(
    new Set(
      (params.recipientEmails ?? [])
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  return { recipientUserIds, recipientEmails };
}

function parseExpiry(value?: Date | string | null): Date | null {
  if (!value) return null;

  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid document share expiry'), {
      statusCode: 422,
      code: 'DOCUMENT_SHARE_EXPIRY_INVALID',
    });
  }

  if (parsed.getTime() <= Date.now()) {
    throw Object.assign(new Error('Document share expiry must be in the future'), {
      statusCode: 422,
      code: 'DOCUMENT_SHARE_EXPIRY_PAST',
    });
  }

  return parsed;
}

export class DocumentShareService {
  /**
   * Fail-closed enterprise share contract.
   *
   * Document sharing must not be simulated through email links or weak signed URLs.
   * It requires a dedicated share model with expiry, revocation, recipient identity,
   * access scope, and audit history.
   */
  static async createShareRequest(db: any, params: DocumentShareRequest) {
    if (!params.tenantId?.trim()) {
      throw Object.assign(new Error('Tenant ID is required for document sharing'), {
        statusCode: 400,
        code: 'DOCUMENT_SHARE_TENANT_REQUIRED',
      });
    }

    if (!params.documentId?.trim()) {
      throw Object.assign(new Error('Document ID is required for document sharing'), {
        statusCode: 422,
        code: 'DOCUMENT_SHARE_DOCUMENT_REQUIRED',
      });
    }

    if (!params.actorId?.trim()) {
      throw Object.assign(new Error('Actor ID is required for document sharing'), {
        statusCode: 422,
        code: 'DOCUMENT_SHARE_ACTOR_REQUIRED',
      });
    }

    const recipients = normalizeRecipients(params);

    if (!recipients.recipientUserIds.length && !recipients.recipientEmails.length) {
      throw Object.assign(new Error('At least one share recipient is required'), {
        statusCode: 422,
        code: 'DOCUMENT_SHARE_RECIPIENT_REQUIRED',
      });
    }

    const expiry = parseExpiry(params.expiresAt);

    const access = await DocumentAccessService.verifyAccess(db, {
      tenantId: params.tenantId,
      userId: params.actorId,
      documentId: params.documentId,
      requiredAction: params.allowDownload ? 'download' : 'view',
    });

    await DocumentAuditService.logAction(db, {
      tenantId: params.tenantId,
      userId: params.actorId,
      documentId: params.documentId,
      matterId: access.document.matterId ?? null,
      action: 'SHARE_REQUESTED',
      requestId: params.requestId ?? null,
      fileHash: access.document.fileHash,
      version: access.document.version,
      metadata: {
        recipientUserCount: recipients.recipientUserIds.length,
        recipientEmailCount: recipients.recipientEmails.length,
        expiresAt: expiry?.toISOString() ?? null,
        allowDownload: params.allowDownload === true,
      },
    });

    throw Object.assign(
      new Error('Document sharing requires the DocumentShare model before activation'),
      {
        statusCode: 501,
        code: 'DOCUMENT_SHARE_MODEL_REQUIRED',
      },
    );
  }
}

export default DocumentShareService;