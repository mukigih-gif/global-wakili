// apps/api/src/modules/document/DocumentStorageService.ts

import crypto, { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import type {
  SignedUrlParams,
  SignedUrlResult,
  StorageProvider,
  StorageUploadResult,
} from './document.types';

const MAX_SIGNED_URL_TTL_SECONDS = 900;
const DEFAULT_SIGNED_URL_TTL_SECONDS = 300;

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function getStorageProvider(): StorageProvider {
  return ((process.env.DOCUMENT_STORAGE_PROVIDER ?? 'LOCAL').toUpperCase() as StorageProvider);
}

function getLocalStorageRoot(): string {
  return process.env.DOCUMENT_LOCAL_STORAGE_DIR
    ? path.resolve(process.env.DOCUMENT_LOCAL_STORAGE_DIR)
    : path.resolve(process.cwd(), '.storage', 'documents');
}

function sanitizePathSegment(value: string): string {
  return value
    .replace(/[^a-z0-9._-]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function sanitizeFileName(fileName: string): string {
  const baseName = path.basename(fileName || 'document');
  const sanitized = sanitizePathSegment(baseName);
  return sanitized || `document_${Date.now()}`;
}

function assertStorageKey(key: string): void {
  if (!key || !key.trim()) {
    throw Object.assign(new Error('Storage key is required'), {
      statusCode: 422,
      code: 'INVALID_STORAGE_KEY',
    });
  }

  if (key.includes('..') || key.includes('\\') || key.startsWith('/')) {
    throw Object.assign(new Error('Unsafe storage key rejected'), {
      statusCode: 422,
      code: 'UNSAFE_STORAGE_KEY',
    });
  }
}

function assertProviderReady(provider: StorageProvider): void {
  if (isProduction() && provider === 'LOCAL') {
    throw Object.assign(
      new Error('LOCAL document storage is not allowed in production'),
      {
        statusCode: 500,
        code: 'DOCUMENT_STORAGE_PROVIDER_NOT_CONFIGURED',
      },
    );
  }

  if (isProduction() && provider === 'S3' && !process.env.DOCUMENT_S3_BUCKET) {
    throw Object.assign(
      new Error('S3 document storage is missing DOCUMENT_S3_BUCKET'),
      {
        statusCode: 500,
        code: 'DOCUMENT_S3_BUCKET_REQUIRED',
      },
    );
  }

  if (isProduction() && provider === 'AZURE' && !process.env.DOCUMENT_AZURE_CONTAINER) {
    throw Object.assign(
      new Error('Azure document storage is missing DOCUMENT_AZURE_CONTAINER'),
      {
        statusCode: 500,
        code: 'DOCUMENT_AZURE_CONTAINER_REQUIRED',
      },
    );
  }

  if (isProduction() && provider === 'GCS' && !process.env.DOCUMENT_GCS_BUCKET) {
    throw Object.assign(
      new Error('GCS document storage is missing DOCUMENT_GCS_BUCKET'),
      {
        statusCode: 500,
        code: 'DOCUMENT_GCS_BUCKET_REQUIRED',
      },
    );
  }
}

function signDownloadUrl(input: {
  fileUrl: string;
  disposition: string;
  expiresAt: Date;
}): string {
  const secret = process.env.DOCUMENT_SIGNING_SECRET || process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw Object.assign(new Error('Document signing secret is not configured'), {
      statusCode: 500,
      code: 'DOCUMENT_SIGNING_SECRET_REQUIRED',
    });
  }

  return crypto
    .createHmac('sha256', secret)
    .update(`${input.fileUrl}|${input.disposition}|${input.expiresAt.toISOString()}`)
    .digest('hex');
}

function getLocalPathForKey(key: string): string {
  assertStorageKey(key);

  const root = getLocalStorageRoot();
  const resolved = path.resolve(root, ...key.split('/'));

  if (!resolved.startsWith(root)) {
    throw Object.assign(new Error('Resolved local storage path escaped root'), {
      statusCode: 422,
      code: 'UNSAFE_LOCAL_STORAGE_PATH',
    });
  }

  return resolved;
}

export class DocumentStorageService {
  static get provider(): StorageProvider {
    return getStorageProvider();
  }

  static generateStorageKey(params: {
    tenantId: string;
    matterId?: string | null;
    fileName: string;
  }): string {
    if (!params.tenantId?.trim()) {
      throw Object.assign(new Error('Tenant ID is required for storage key generation'), {
        statusCode: 400,
        code: 'DOCUMENT_STORAGE_TENANT_REQUIRED',
      });
    }

    const timestamp = Date.now();
    const uuid = randomUUID();
    const safeTenant = sanitizePathSegment(params.tenantId);
    const safeMatter = params.matterId ? sanitizePathSegment(params.matterId) : null;
    const sanitizedName = sanitizeFileName(params.fileName);
    const context = safeMatter ? `mat_${safeMatter}` : 'general';

    const key = `${safeTenant}/${context}/${timestamp}_${uuid}_${sanitizedName}`;
    assertStorageKey(key);

    return key;
  }

  static generateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  static async upload(
    key: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<StorageUploadResult> {
    assertStorageKey(key);
    assertProviderReady(this.provider);

    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw Object.assign(new Error('Document buffer is missing or empty'), {
        statusCode: 422,
        code: 'INVALID_DOCUMENT_BUFFER',
      });
    }

    if (!mimeType?.trim()) {
      throw Object.assign(new Error('Document MIME type is required'), {
        statusCode: 422,
        code: 'INVALID_DOCUMENT_MIME_TYPE',
      });
    }

    const fileHash = this.generateFileHash(buffer);

    if (this.provider === 'LOCAL') {
      const localPath = getLocalPathForKey(key);

      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, buffer, { flag: 'wx' });

      return {
        provider: this.provider,
        storageKey: key,
        fileUrl: `local://documents/${encodeURIComponent(key)}`,
        fileHash,
        fileSize: buffer.length,
        mimeType,
      };
    }

    throw Object.assign(
      new Error(
        `Document storage provider ${this.provider} is configured but upload adapter is not implemented`,
      ),
      {
        statusCode: 501,
        code: 'DOCUMENT_STORAGE_ADAPTER_NOT_IMPLEMENTED',
        details: {
          provider: this.provider,
        },
      },
    );
  }

  static async delete(key: string): Promise<void> {
    assertStorageKey(key);
    assertProviderReady(this.provider);

    if (this.provider === 'LOCAL') {
      const localPath = getLocalPathForKey(key);

      await fs.unlink(localPath).catch((error) => {
        if (error?.code === 'ENOENT') return;
        throw error;
      });

      return;
    }

    throw Object.assign(
      new Error(
        `Document storage provider ${this.provider} is configured but delete adapter is not implemented`,
      ),
      {
        statusCode: 501,
        code: 'DOCUMENT_STORAGE_DELETE_NOT_IMPLEMENTED',
      },
    );
  }

  static async getDownloadUrl(params: SignedUrlParams): Promise<SignedUrlResult> {
    if (!params.fileUrl?.trim()) {
      throw Object.assign(new Error('File URL is required'), {
        statusCode: 422,
        code: 'INVALID_FILE_URL',
      });
    }

    if (isProduction() && params.fileUrl.startsWith('local://')) {
      throw Object.assign(
        new Error('Local document URLs are not permitted in production'),
        {
          statusCode: 500,
          code: 'DOCUMENT_LOCAL_URL_NOT_ALLOWED',
        },
      );
    }

    const disposition = params.disposition ?? 'attachment';
    const expiresInSeconds =
      params.expiresInSeconds && params.expiresInSeconds > 0
        ? Math.min(params.expiresInSeconds, MAX_SIGNED_URL_TTL_SECONDS)
        : DEFAULT_SIGNED_URL_TTL_SECONDS;

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const signature = signDownloadUrl({
      fileUrl: params.fileUrl,
      disposition,
      expiresAt,
    });

    const separator = params.fileUrl.includes('?') ? '&' : '?';
    const url =
      `${params.fileUrl}${separator}` +
      `disposition=${encodeURIComponent(disposition)}` +
      `&expiresAt=${encodeURIComponent(expiresAt.toISOString())}` +
      `&signature=${encodeURIComponent(signature)}`;

    return {
      url,
      expiresAt,
      disposition,
    };
  }
}