// apps/api/src/modules/document/DocumentVersionService.ts

import { DocumentStorageService } from './DocumentStorageService';
import type {
  DocumentMetadata,
  TenantDocumentDbClient,
  VersionChainCreationPayload,
} from './document.types';
import {
  assertAllowedFileSize,
  assertAllowedMimeType,
  sanitizeDocumentTags,
} from './document.validators';

function normalizeTitle(fileName: string, explicitTitle?: string | null): string {
  return explicitTitle?.trim() || fileName.trim();
}

function normalizeExpiryDate(value?: Date | string | null): Date | null {
  if (!value) return null;

  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid expiry date'), {
      statusCode: 422,
      code: 'INVALID_DOCUMENT_EXPIRY_DATE',
    });
  }

  return parsed;
}

function normalizeMetadata(
  metadata: DocumentMetadata | null | undefined,
  fileName: string,
): DocumentMetadata {
  const normalized: DocumentMetadata = {
    ...(metadata ?? {}),
    originalName:
      typeof metadata?.originalName === 'string' && metadata.originalName.trim()
        ? metadata.originalName.trim()
        : fileName.trim(),
    tags: sanitizeDocumentTags(metadata?.tags),
    isConfidential: metadata?.isConfidential === true,
    isRestricted: metadata?.isRestricted === true,
    category: metadata?.category ?? 'OTHER',
    sourceEditor: metadata?.sourceEditor ?? 'UPLOAD',
  };

  return normalized;
}

export class DocumentVersionService {
  /**
   * Creates a new Document row as the next version in the chain.
   * The previous version is linked using previousId.
   *
   * Security guarantees:
   * - tenantId is required
   * - uploader must be active within the tenant
   * - matter ownership is tenant-scoped
   * - metadata is preserved for confidentiality / ethical wall enforcement
   * - storage upload is cleaned up if DB persistence fails
   */
  static async createChainedVersion(
    db: TenantDocumentDbClient,
    payload: VersionChainCreationPayload,
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
    const expiryDate = normalizeExpiryDate(payload.expiryDate);
    const metadata = normalizeMetadata(payload.metadata, payload.fileName);

    const latestDoc = await db.document.findFirst({
      where: {
        tenantId: payload.tenantId,
        matterId: payload.matterId ?? null,
        title,
        deletedAt: null,
      },
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        version: true,
      },
    });

    const storageKey = DocumentStorageService.generateStorageKey({
      tenantId: payload.tenantId,
      matterId: payload.matterId,
      fileName: payload.fileName,
    });

    const uploadResult = await DocumentStorageService.upload(
      storageKey,
      payload.buffer,
      payload.mimeType,
    );

    try {
      const created = await db.document.create({
        data: {
          tenantId: payload.tenantId,
          matterId: payload.matterId ?? null,
          title,
          description: payload.description?.trim() ?? null,
          expiryDate,
          mimeType: payload.mimeType,
          fileSize: payload.fileSize,
          fileUrl: uploadResult.fileUrl,
          fileHash: uploadResult.fileHash,
          uploadedBy: payload.uploadedBy,
          previousId: latestDoc?.id ?? null,
          version: latestDoc ? latestDoc.version + 1 : 1,
          status: payload.status ?? 'ACTIVE',
          metadata,
        },
      });

      return {
        document: created,
        storage: uploadResult,
        chain: {
          previousId: latestDoc?.id ?? null,
          version: latestDoc ? latestDoc.version + 1 : 1,
        },
      };
    } catch (error) {
      await DocumentStorageService.delete(uploadResult.storageKey).catch(() => undefined);
      throw error;
    }
  }

  static async getLatestInChain(
    db: TenantDocumentDbClient,
    params: {
      tenantId: string;
      matterId?: string | null;
      title: string;
    },
  ) {
    return db.document.findFirst({
      where: {
        tenantId: params.tenantId,
        matterId: params.matterId ?? null,
        title: params.title,
        deletedAt: null,
      },
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
    });
  }

  static async getChainHistory(
    db: TenantDocumentDbClient,
    params: {
      tenantId: string;
      matterId?: string | null;
      title: string;
    },
  ) {
    if (!db.document.findMany) {
      throw Object.assign(
        new Error('Document history listing is not supported by this DB client contract'),
        {
          statusCode: 500,
          code: 'DOCUMENT_HISTORY_NOT_SUPPORTED',
        },
      );
    }

    return db.document.findMany({
      where: {
        tenantId: params.tenantId,
        matterId: params.matterId ?? null,
        title: params.title,
      },
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
    });
  }
}