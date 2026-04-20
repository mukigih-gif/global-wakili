import { DocumentStorageService } from './DocumentStorageService';
import { DocumentVersionService } from './DocumentVersionService';
import type {
  FileUploadPayload,
  TenantDocumentDbClient,
} from './document.types';
import {
  assertAllowedFileSize,
  assertAllowedMimeType,
} from './document.validators';

function normalizeTitle(fileName: string, explicitTitle?: string | null): string {
  return explicitTitle?.trim() || fileName.trim();
}

export class DocumentService {
  /**
   * Creates a new document or a new chained version, depending on whether a prior
   * document with the same title exists in the same tenant + matter scope.
   */
  static async createDocument(
    db: TenantDocumentDbClient,
    payload: FileUploadPayload,
  ) {
    if (!payload.fileName?.trim()) {
      throw Object.assign(new Error('File name is required'), {
        statusCode: 422,
        code: 'DOCUMENT_FILE_NAME_REQUIRED',
      });
    }

    if (!payload.uploadedBy?.trim()) {
      throw Object.assign(new Error('Uploader is required'), {
        statusCode: 422,
        code: 'DOCUMENT_UPLOADER_REQUIRED',
      });
    }

    assertAllowedMimeType(payload.mimeType);
    assertAllowedFileSize(payload.fileSize);

    if (!payload.buffer || !Buffer.isBuffer(payload.buffer) || payload.buffer.length === 0) {
      throw Object.assign(new Error('Document buffer is missing or empty'), {
        statusCode: 422,
        code: 'INVALID_DOCUMENT_BUFFER',
      });
    }

    if (payload.fileSize !== payload.buffer.length) {
      throw Object.assign(new Error('Declared file size does not match buffer length'), {
        statusCode: 422,
        code: 'DOCUMENT_FILE_SIZE_MISMATCH',
      });
    }

    const [matter, uploader] = await Promise.all([
      payload.matterId
        ? db.matter.findFirst({
            where: {
              tenantId: payload.tenantId,
              id: payload.matterId,
            },
            select: { id: true },
          })
        : Promise.resolve(null),
      db.user.findFirst({
        where: {
          tenantId: payload.tenantId,
          id: payload.uploadedBy,
          status: 'ACTIVE',
        },
        select: { id: true },
      }),
    ]);

    if (payload.matterId && !matter) {
      throw Object.assign(new Error('Matter not found for tenant'), {
        statusCode: 404,
        code: 'DOCUMENT_MATTER_NOT_FOUND',
      });
    }

    if (!uploader) {
      throw Object.assign(new Error('Uploader not found for tenant or inactive'), {
        statusCode: 404,
        code: 'DOCUMENT_UPLOADER_NOT_FOUND',
      });
    }

    const title = normalizeTitle(payload.fileName, payload.title);

    return DocumentVersionService.createChainedVersion(db, {
      tenantId: payload.tenantId,
      matterId: payload.matterId ?? null,
      uploadedBy: payload.uploadedBy,
      fileName: payload.fileName,
      title,
      description: payload.description ?? null,
      expiryDate: payload.expiryDate ?? null,
      mimeType: payload.mimeType,
      fileSize: payload.fileSize,
      buffer: payload.buffer,
      status: payload.status ?? 'ACTIVE',
      metadata: payload.metadata ?? null,
      changeSummary: payload.metadata?.sourceEditor === 'UPLOAD'
        ? 'Upload'
        : 'New version',
    });
  }

  static async getDocumentDetails(
    db: TenantDocumentDbClient,
    tenantId: string,
    documentId: string,
  ) {
    return db.document.findFirst({
      where: {
        id: documentId,
        tenantId,
        deletedAt: null,
      },
      include: {
        matter: {
          select: {
            title: true,
            matterCode: true,
          },
        },
        uploader: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
  }

  static async getLatestDocumentByTitle(
    db: TenantDocumentDbClient,
    params: {
      tenantId: string;
      matterId?: string | null;
      title: string;
    },
  ) {
    return DocumentVersionService.getLatestInChain(db, params);
  }

  static async softDeleteDocument(
    db: TenantDocumentDbClient,
    params: {
      tenantId: string;
      documentId: string;
    },
  ) {
    const document = await db.document.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.documentId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!document) {
      throw Object.assign(new Error('Document not found'), {
        statusCode: 404,
        code: 'DOCUMENT_NOT_FOUND',
      });
    }

    return db.document.update({
      where: {
        id: params.documentId,
      },
      data: {
        deletedAt: new Date(),
        status: 'ARCHIVED',
      },
    });
  }

  static async getDownloadLink(
    db: TenantDocumentDbClient,
    params: {
      tenantId: string;
      documentId: string;
      disposition?: 'inline' | 'attachment';
    },
  ) {
    const document = await db.document.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.documentId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        fileUrl: true,
        mimeType: true,
      },
    });

    if (!document) {
      throw Object.assign(new Error('Document not found'), {
        statusCode: 404,
        code: 'DOCUMENT_NOT_FOUND',
      });
    }

    return DocumentStorageService.getDownloadUrl({
      fileUrl: document.fileUrl,
      fileName: document.title,
      mimeType: document.mimeType,
      disposition: params.disposition ?? 'attachment',
      expiresInSeconds: 300,
    });
  }
}