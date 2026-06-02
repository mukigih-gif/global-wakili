/**
 * DocumentStorageService.ts
 *
 * Multi-provider document storage: LOCAL (dev), S3, GCS (stub), Azure (stub).
 *
 * Provider selection: DOCUMENT_STORAGE_PROVIDER env var (LOCAL | S3 | GCS | AZURE).
 * Defaults to LOCAL in development. LOCAL is blocked in production.
 *
 * S3 required env vars:
 *   DOCUMENT_S3_BUCKET, DOCUMENT_S3_REGION
 * Optional:
 *   DOCUMENT_S3_ENDPOINT  — custom endpoint (MinIO, Cloudflare R2, etc.)
 *   DOCUMENT_S3_ACCESS_KEY_ID, DOCUMENT_S3_SECRET_ACCESS_KEY  — explicit creds
 *   (falls back to AWS default credential chain: env AWS_*, instance profile, etc.)
 *
 * WIP-003 — Gap 007.
 */

import crypto, { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
  if (!key?.trim()) {
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
    throw Object.assign(new Error('LOCAL document storage is not allowed in production'), {
      statusCode: 500,
      code: 'DOCUMENT_STORAGE_PROVIDER_NOT_CONFIGURED',
    });
  }

  if (provider === 'S3' && !process.env.DOCUMENT_S3_BUCKET) {
    throw Object.assign(new Error('S3 document storage requires DOCUMENT_S3_BUCKET'), {
      statusCode: 500,
      code: 'DOCUMENT_S3_BUCKET_REQUIRED',
    });
  }

  if (isProduction() && provider === 'AZURE' && !process.env.DOCUMENT_AZURE_CONTAINER) {
    throw Object.assign(new Error('Azure document storage requires DOCUMENT_AZURE_CONTAINER'), {
      statusCode: 500,
      code: 'DOCUMENT_AZURE_CONTAINER_REQUIRED',
    });
  }

  if (isProduction() && provider === 'GCS' && !process.env.DOCUMENT_GCS_BUCKET) {
    throw Object.assign(new Error('GCS document storage requires DOCUMENT_GCS_BUCKET'), {
      statusCode: 500,
      code: 'DOCUMENT_GCS_BUCKET_REQUIRED',
    });
  }
}

// ── S3 helpers ────────────────────────────────────────────────────────────────

let _s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (_s3Client) return _s3Client;

  const region = process.env.DOCUMENT_S3_REGION || process.env.AWS_REGION || 'us-east-1';
  const endpoint = process.env.DOCUMENT_S3_ENDPOINT?.trim() || undefined;
  const accessKeyId = process.env.DOCUMENT_S3_ACCESS_KEY_ID?.trim() || process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.DOCUMENT_S3_SECRET_ACCESS_KEY?.trim() || process.env.AWS_SECRET_ACCESS_KEY?.trim();

  _s3Client = new S3Client({
    region,
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
  });

  return _s3Client;
}

function getS3Bucket(): string {
  const bucket = process.env.DOCUMENT_S3_BUCKET?.trim();
  if (!bucket) {
    throw Object.assign(new Error('DOCUMENT_S3_BUCKET is not configured'), {
      statusCode: 500,
      code: 'DOCUMENT_S3_BUCKET_REQUIRED',
    });
  }
  return bucket;
}

async function s3Upload(key: string, buffer: Buffer, mimeType: string): Promise<string> {
  const bucket = getS3Bucket();
  await getS3Client().send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    ServerSideEncryption: 'AES256',
  }));

  const region = process.env.DOCUMENT_S3_REGION || process.env.AWS_REGION || 'us-east-1';
  const endpoint = process.env.DOCUMENT_S3_ENDPOINT?.trim();
  return endpoint
    ? `${endpoint.replace(/\/$/, '')}/${bucket}/${key}`
    : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

async function s3Delete(key: string): Promise<void> {
  const bucket = getS3Bucket();
  await getS3Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

async function s3PresignedUrl(key: string, expiresInSeconds: number, disposition: string): Promise<string> {
  const bucket = getS3Bucket();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: `${disposition}; filename="${path.basename(key)}"`,
  });

  return getSignedUrl(getS3Client(), command, { expiresIn: expiresInSeconds });
}

// ── Local helpers ─────────────────────────────────────────────────────────────

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

function signDownloadUrl(input: { fileUrl: string; disposition: string; expiresAt: Date }): string {
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

// ── Service ───────────────────────────────────────────────────────────────────

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

  static async upload(key: string, buffer: Buffer, mimeType: string): Promise<StorageUploadResult> {
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

    if (this.provider === 'S3') {
      const fileUrl = await s3Upload(key, buffer, mimeType);
      return { provider: 'S3', storageKey: key, fileUrl, fileHash, fileSize: buffer.length, mimeType };
    }

    throw Object.assign(
      new Error(`Document storage provider ${this.provider} upload adapter not yet implemented`),
      { statusCode: 501, code: 'DOCUMENT_STORAGE_ADAPTER_NOT_IMPLEMENTED', details: { provider: this.provider } },
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

    if (this.provider === 'S3') {
      await s3Delete(key);
      return;
    }

    throw Object.assign(
      new Error(`Document storage provider ${this.provider} delete adapter not yet implemented`),
      { statusCode: 501, code: 'DOCUMENT_STORAGE_DELETE_NOT_IMPLEMENTED' },
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
      throw Object.assign(new Error('Local document URLs are not permitted in production'), {
        statusCode: 500,
        code: 'DOCUMENT_LOCAL_URL_NOT_ALLOWED',
      });
    }

    const disposition = params.disposition ?? 'attachment';
    const expiresInSeconds =
      params.expiresInSeconds && params.expiresInSeconds > 0
        ? Math.min(params.expiresInSeconds, MAX_SIGNED_URL_TTL_SECONDS)
        : DEFAULT_SIGNED_URL_TTL_SECONDS;

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    // For S3 keys (no scheme prefix), generate a real AWS presigned URL
    if (this.provider === 'S3' && !params.fileUrl.includes('://')) {
      const presigned = await s3PresignedUrl(params.fileUrl, expiresInSeconds, disposition);
      return { url: presigned, expiresAt, disposition };
    }

    // S3 https:// URLs — extract key from URL and presign
    if (this.provider === 'S3' && params.fileUrl.startsWith('https://')) {
      const bucket = getS3Bucket();
      const urlObj = new URL(params.fileUrl);
      // Path-style: /bucket/key  — virtual-hosted: hostname has bucket prefix
      const key = urlObj.hostname.startsWith(`${bucket}.`)
        ? urlObj.pathname.replace(/^\//, '')
        : urlObj.pathname.replace(new RegExp(`^/${bucket}/`), '');

      if (key) {
        const presigned = await s3PresignedUrl(key, expiresInSeconds, disposition);
        return { url: presigned, expiresAt, disposition };
      }
    }

    // LOCAL / fallback: HMAC-signed URL
    const signature = signDownloadUrl({ fileUrl: params.fileUrl, disposition, expiresAt });
    const separator = params.fileUrl.includes('?') ? '&' : '?';
    const url =
      `${params.fileUrl}${separator}` +
      `disposition=${encodeURIComponent(disposition)}` +
      `&expiresAt=${encodeURIComponent(expiresAt.toISOString())}` +
      `&signature=${encodeURIComponent(signature)}`;

    return { url, expiresAt, disposition };
  }
}
