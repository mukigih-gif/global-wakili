import type { TenantDocumentDbClient } from './document.types';

export type DocumentAction =
  | 'view'
  | 'download'
  | 'edit'
  | 'delete'
  | 'restore';

export class DocumentAccessService {
  /**
   * Ethical wall and document-level access gate.
   *
   * Rules:
   * 1. Super admins may be handled by the caller upstream. This service focuses on tenant data checks.
   * 2. Deleted documents cannot be accessed unless action is restore.
   * 3. Restricted matter: only uploader, assigned lawyer, or partner may access.
   * 4. Confidential/restricted document metadata: only uploader, assigned lawyer, or partner may access.
   * 5. Delete/restore are stricter and require uploader, assigned lawyer, or partner.
   */
  static async verifyAccess(
    db: TenantDocumentDbClient,
    params: {
      tenantId: string;
      userId: string;
      documentId: string;
      requiredAction: DocumentAction;
    },
  ) {
    const document = await db.document.findFirst({
      where: {
        id: params.documentId,
        tenantId: params.tenantId,
      },
      include: {
        matter: {
          select: {
            id: true,
            title: true,
            matterCode: true,
            partnerId: true,
            assignedLawyerId: true,
            metadata: true,
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
    });

    if (!document) {
      throw Object.assign(new Error('Document not found'), {
        statusCode: 404,
        code: 'DOCUMENT_NOT_FOUND',
      });
    }

    const isDeleted = Boolean(document.deletedAt);
    if (isDeleted && params.requiredAction !== 'restore') {
      throw Object.assign(new Error('Document is deleted or archived'), {
        statusCode: 410,
        code: 'DOCUMENT_DELETED',
      });
    }

    const isOwner = document.uploadedBy === params.userId;
    const isPartner = document.matter?.partnerId === params.userId;
    const isAssigned = document.matter?.assignedLawyerId === params.userId;

    const docMeta = (document as any).metadata ?? {};
    const isConfidential = docMeta.isConfidential === true;
    const isRestrictedDocument = docMeta.isRestricted === true;
    const isRestrictedMatter = document.matter?.metadata?.isRestricted === true;

    const isMatterTeam = isOwner || isPartner || isAssigned;

    if (isRestrictedMatter && !isMatterTeam) {
      throw Object.assign(
        new Error('Ethical Wall: you are not assigned to this restricted matter'),
        {
          statusCode: 403,
          code: 'DOCUMENT_ETHICAL_WALL_RESTRICTED_MATTER',
        },
      );
    }

    if ((isRestrictedDocument || isConfidential) && !isMatterTeam) {
      throw Object.assign(
        new Error('Restricted or confidential document access denied'),
        {
          statusCode: 403,
          code: 'DOCUMENT_RESTRICTED_ACCESS_DENIED',
        },
      );
    }

    if (['delete', 'restore', 'edit'].includes(params.requiredAction) && !isMatterTeam) {
      throw Object.assign(
        new Error(`You are not allowed to ${params.requiredAction} this document`),
        {
          statusCode: 403,
          code: 'DOCUMENT_ACTION_FORBIDDEN',
        },
      );
    }

    return {
      document,
      access: {
        isOwner,
        isPartner,
        isAssigned,
        isMatterTeam,
        isRestrictedMatter,
        isRestrictedDocument,
        isConfidential,
        requiredAction: params.requiredAction,
      },
    };
  }
}