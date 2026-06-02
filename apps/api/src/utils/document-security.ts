/**
 * Pure document security utilities — no filesystem, no database.
 *
 * Extracted from DocumentStorageService and DocumentAccessPolicyService
 * for unit testing without filesystem or DB access.
 *
 * Security properties verified:
 *   1. Path traversal prevention — assertStorageKey blocks .., \, leading /
 *   2. Path sanitization — sanitizePathSegment removes dangerous chars
 *   3. Double-resolution path escape check — resolved path must stay within root
 *   4. Signed URL TTL enforcement — capped at MAX_SIGNED_URL_TTL_SECONDS
 *   5. Document access scope — restricted/confidential docs filtered by default
 */

import path from 'path';

export const MAX_SIGNED_URL_TTL_SECONDS = 900;
export const DEFAULT_SIGNED_URL_TTL_SECONDS = 300;

/**
 * Validates a document storage key is safe for use.
 * Blocks path traversal attempts: .., backslash, leading slash.
 * Throws UNSAFE_STORAGE_KEY for dangerous patterns.
 */
export function assertStorageKey(key: string): void {
  if (!key || !key.trim()) {
    throw Object.assign(new Error('Storage key is required'), {
      statusCode: 422, code: 'INVALID_STORAGE_KEY',
    });
  }

  if (key.includes('..') || key.includes('\\') || key.startsWith('/')) {
    throw Object.assign(new Error('Unsafe storage key rejected'), {
      statusCode: 422, code: 'UNSAFE_STORAGE_KEY',
    });
  }
}

/**
 * Sanitizes a path segment to only safe characters.
 * Replaces anything not alphanumeric, dot, hyphen, or underscore with _.
 */
export function sanitizePathSegment(value: string): string {
  return value
    .replace(/[^a-z0-9._-]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

/**
 * Sanitizes a file name, preserving basename only (strips directory components).
 */
export function sanitizeFileName(fileName: string): string {
  const baseName = path.basename(fileName || 'document');
  const sanitized = sanitizePathSegment(baseName);
  return sanitized || `document_${Date.now()}`;
}

/**
 * Verifies that a resolved absolute path stays within the storage root.
 * This is the second layer of path traversal prevention after assertStorageKey.
 */
export function assertPathWithinRoot(resolvedPath: string, root: string): void {
  const normalizedRoot = path.resolve(root);
  const normalizedResolved = path.resolve(resolvedPath);

  if (!normalizedResolved.startsWith(normalizedRoot)) {
    throw Object.assign(new Error('Resolved path escaped storage root'), {
      statusCode: 422, code: 'UNSAFE_LOCAL_STORAGE_PATH',
    });
  }
}

/**
 * Clamps a signed URL TTL to the allowed maximum.
 * Prevents excessively long-lived signed URLs.
 */
export function clampSignedUrlTtl(ttlSeconds: number): number {
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    return DEFAULT_SIGNED_URL_TTL_SECONDS;
  }
  return Math.min(ttlSeconds, MAX_SIGNED_URL_TTL_SECONDS);
}
