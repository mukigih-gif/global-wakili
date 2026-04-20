import { z } from 'zod';

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'text/plain',
] as const;

export const documentCategorySchema = z.enum([
  'PLEADING',
  'CORRESPONDENCE',
  'EVIDENCE',
  'CONTRACT',
  'BILLING',
  'INTERNAL',
  'KRA_COMPLIANCE',
  'OTHER',
]);

export const documentUploadSchema = z.object({
  matterId: z.string().cuid().optional().nullable(),
  title: z.string().trim().min(1).max(255).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  expiryDate: z.coerce.date().optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  category: documentCategorySchema.default('OTHER'),
  isConfidential: z.boolean().default(false),
  isRestricted: z.boolean().default(false),
});

export function assertAllowedMimeType(mimeType: string): void {
  if (!ALLOWED_MIME_TYPES.includes(mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
    throw Object.assign(new Error(`Unsupported MIME type: ${mimeType}`), {
      statusCode: 415,
      code: 'UNSUPPORTED_DOCUMENT_MIME_TYPE',
    });
  }
}

export function assertAllowedFileSize(fileSize: number): void {
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    throw Object.assign(new Error('Invalid file size'), {
      statusCode: 422,
      code: 'INVALID_DOCUMENT_FILE_SIZE',
    });
  }

  if (fileSize > MAX_FILE_SIZE) {
    throw Object.assign(new Error(`File exceeds max allowed size of ${MAX_FILE_SIZE} bytes`), {
      statusCode: 413,
      code: 'DOCUMENT_FILE_TOO_LARGE',
    });
  }
}

export function sanitizeDocumentTags(tags?: string[] | null): string[] {
  if (!tags?.length) return [];
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 20);
}