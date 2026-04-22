// apps/api/src/modules/document/DocumentService.ts

import { DocumentStorageService } from './DocumentStorageService';
import { DocumentVersionService } from './DocumentVersionService';
import { DocumentMalwareScanService } from './DocumentMalwareScanService';
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
    if (!payload.tenantId?.trim()) {
      throw Object.assign(new Error('Tenant ID is required'), {
        statusCode: 400,
        code: 'DOCUMENT_TENANT_REQUIRED',
      });
    }

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

    const scanResult = await DocumentMalwareScanService.scanBuffer({
      tenantId: payload.tenantId,
      uploadedBy: payload.uploadedBy,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      buffer: payload.buffer,
    });

    DocumentMalwareScanService.assertClean(scanResult);

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
      metadata: {
        ...(payload.metadata ?? {}),
        malwareScan: {
          verdict: scanResult.verdict,
          provider: scanResult.provider,
          scannedAt: scanResult.scannedAt.toISOString(),
          fileHash: scanResult.fileHash,
          reason: scanResult.reason ?? null,
        },
      },
      changeSummary:
        payload.metadata?.sourceEditor === 'UPLOAD'
          ? 'Upload'
          : 'New version',
    });
  }

    static async getDocumentDetails(
    db: TenantDocumentDbClient,
    tenantId: string,
    documentId: string,
  ) {
    const document = await db.document.findFirst({
      where: {
        id: documentId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        matterId: true,
        title: true,
        description: true,
        expiryDate: true,
        mimeType: true,
        fileSize: true,
        fileHash: true,
        uploadedBy: true,
        previousId: true,
        version: true,
        status: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
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
    });

    if (!document) {
      throw Object.assign(new Error('Document not found'), {
        statusCode: 404,
        code: 'DOCUMENT_NOT_FOUND',
      });
    }

    return document;
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

  static async restoreDocument(
    db: TenantDocumentDbClient,
    params: {
      tenantId: string;
      documentId: string;
    },
  ) {
    if (!params.tenantId?.trim()) {
      throw Object.assign(new Error('Tenant ID is required'), {
        statusCode: 400,
        code: 'DOCUMENT_TENANT_REQUIRED',
      });
    }

    if (!params.documentId?.trim()) {
      throw Object.assign(new Error('Document ID is required'), {
        statusCode: 422,
        code: 'DOCUMENT_ID_REQUIRED',
      });
    }

    const document = await db.document.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.documentId,
      },
      select: {
        id: true,
        deletedAt: true,
        status: true,
      },
    });

    if (!document) {
      throw Object.assign(new Error('Document not found'), {
        statusCode: 404,
        code: 'DOCUMENT_NOT_FOUND',
      });
    }

    if (!document.deletedAt && document.status !== 'ARCHIVED' && document.status !== 'DELETED') {
      throw Object.assign(new Error('Document is not archived'), {
        statusCode: 409,
        code: 'DOCUMENT_NOT_ARCHIVED',
      });
    }

    return db.document.update({
      where: {
        id: params.documentId,
      },
      data: {
        deletedAt: null,
        status: 'ACTIVE',
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