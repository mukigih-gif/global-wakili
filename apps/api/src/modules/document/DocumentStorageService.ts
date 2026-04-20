import crypto, { randomUUID } from 'crypto';
import type {
  SignedUrlParams,
  SignedUrlResult,
  StorageProvider,
  StorageUploadResult,
} from './document.types';

function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-z0-9._-]/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

function assertStorageKey(key: string): void {
  if (!key || !key.trim()) {
    throw Object.assign(new Error('Storage key is required'), {
      statusCode: 422,
      code: 'INVALID_STORAGE_KEY',
    });
  }
}

export class DocumentStorageService {
  static readonly provider: StorageProvider =
    (process.env.DOCUMENT_STORAGE_PROVIDER?.toUpperCase() as StorageProvider) || 'LOCAL';

  /**
   * Format:
   * {tenantId}/{context}/{timestamp}_{uuid}_{filename}
   */
  static generateStorageKey(params: {
    tenantId: string;
    matterId?: string | null;
    fileName: string;
  }): string {
    const timestamp = Date.now();
    const uuid = randomUUID();
    const sanitizedName = sanitizeFileName(params.fileName);
    const context = params.matterId ? `mat_${params.matterId}` : 'general';

    return `${params.tenantId}/${context}/${timestamp}_${uuid}_${sanitizedName}`;
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

    // Production provider upload would happen here.
    const fileUrl = `https://storage.globalwakili.com/${encodeURIComponent(key)}`;

    return {
      provider: this.provider,
      storageKey: key,
      fileUrl,
      fileHash,
      fileSize: buffer.length,
      mimeType,
    };
  }

  static async delete(key: string): Promise<void> {
    assertStorageKey(key);
    // Production provider delete would happen here.
  }

  static async getDownloadUrl(params: SignedUrlParams): Promise<SignedUrlResult> {
    if (!params.fileUrl?.trim()) {
      throw Object.assign(new Error('File URL is required'), {
        statusCode: 422,
        code: 'INVALID_FILE_URL',
      });
    }

    const disposition = params.disposition ?? 'attachment';
    const expiresInSeconds =
      params.expiresInSeconds && params.expiresInSeconds > 0
        ? Math.min(params.expiresInSeconds, 900)
        : 300;

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    const url =
      `${params.fileUrl}` +
      `?disposition=${encodeURIComponent(disposition)}` +
      `&expiresAt=${encodeURIComponent(expiresAt.toISOString())}`;

    return {
      url,
      expiresAt,
      disposition,
    };
  }
}