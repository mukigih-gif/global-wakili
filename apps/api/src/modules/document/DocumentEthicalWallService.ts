import type { TenantDocumentDbClient } from './document.types';

export class DocumentEthicalWallService {
  /**
   * Evaluates whether a document belongs to a restricted matter and whether the
   * user is inside the ethical wall team.
   */
  static async evaluate(
    db: TenantDocumentDbClient,
    params: {
      tenantId: string;
      userId: string;
      documentId: string;
    },
  ) {
    const document = await db.document.findFirst({
      where: {
        id: params.documentId,
        tenantId: params.tenantId,
        deletedAt: null,
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
      },
    });

    if (!document) {
      throw Object.assign(new Error('Document not found'), {
        statusCode: 404,
        code: 'DOCUMENT_NOT_FOUND',
      });
    }

    const isOwner = document.uploadedBy === params.userId;
    const isPartner = document.matter?.partnerId === params.userId;
    const isAssigned = document.matter?.assignedLawyerId === params.userId;
    const isRestrictedMatter = document.matter?.metadata?.isRestricted === true;
    const isInsideWall = isOwner || isPartner || isAssigned;

    return {
      document,
      ethicalWall: {
        isRestrictedMatter,
        isOwner,
        isPartner,
        isAssigned,
        isInsideWall,
        isBlocked: isRestrictedMatter && !isInsideWall,
      },
    };
  }

  static async assertInsideWall(
    db: TenantDocumentDbClient,
    params: {
      tenantId: string;
      userId: string;
      documentId: string;
    },
  ) {
    const result = await this.evaluate(db, params);

    if (result.ethicalWall.isBlocked) {
      throw Object.assign(
        new Error('Ethical Wall: you are not assigned to this restricted matter'),
        {
          statusCode: 403,
          code: 'DOCUMENT_ETHICAL_WALL_BLOCKED',
        },
      );
    }

    return result;
  }
}