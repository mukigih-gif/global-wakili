// apps/api/src/modules/document/document.validators.ts

import { z } from 'zod';

const optionalDate = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value instanceof Date) return value;
  return new Date(String(value));
}, z.date());

export const documentVisibilitySchema = z.enum([
  'PRIVATE',
  'INTERNAL',
  'CLIENT_PORTAL',
  'PUBLIC',
]);

export const documentStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'ARCHIVED',
  'DELETED',
  'LOCKED',
]);

export const documentCategorySchema = z.enum([
  'PLEADING',
  'CONTRACT',
  'CORRESPONDENCE',
  'EVIDENCE',
  'COURT_FILING',
  'KYC',
  'BILLING',
  'TRUST',
  'GENERAL',
]);

export const documentUploadSchema = z.object({
  tenantId: z.string().min(1).optional(),
  matterId: z.string().min(1).nullable().optional(),
  clientId: z.string().min(1).nullable().optional(),
  folderId: z.string().min(1).nullable().optional(),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2000).nullable().optional(),
  category: documentCategorySchema.optional(),
  visibility: documentVisibilitySchema.optional(),
  status: documentStatusSchema.optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const uploadDocumentSchema = documentUploadSchema;

export const documentUpdateSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  category: documentCategorySchema.optional(),
  visibility: documentVisibilitySchema.optional(),
  status: documentStatusSchema.optional(),
  folderId: z.string().min(1).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateDocumentSchema = documentUpdateSchema;

export const documentSearchQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  search: z.string().trim().max(200).optional(),
  matterId: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
  folderId: z.string().min(1).optional(),
  category: documentCategorySchema.optional(),
  visibility: documentVisibilitySchema.optional(),
  status: documentStatusSchema.optional(),
  tag: z.string().trim().max(80).optional(),
  createdFrom: optionalDate.optional(),
  createdTo: optionalDate.optional(),
  uploadedFrom: optionalDate.optional(),
  uploadedTo: optionalDate.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

export const searchDocumentsSchema = documentSearchQuerySchema;

export const documentIdParamSchema = z.object({
  documentId: z.string().min(1),
});

export const documentVersionParamSchema = z.object({
  documentId: z.string().min(1),
  versionId: z.string().min(1).optional(),
});

export const archiveDocumentSchema = z.object({
  reason: z.string().trim().max(1000).nullable().optional(),
});

export const restoreDocumentSchema = z.object({
  reason: z.string().trim().max(1000).nullable().optional(),
});

export const documentShareSchema = z.object({
  recipientUserIds: z.array(z.string().min(1)).max(100).optional(),
  recipientEmails: z.array(z.string().email()).max(100).optional(),
  expiresAt: optionalDate.optional(),
  message: z.string().trim().max(1000).nullable().optional(),
  allowDownload: z.boolean().optional(),
});

export const contractInputSchema = z.object({
  matterId: z.string().min(1),
  clientId: z.string().min(1).nullable().optional(),
  title: z.string().trim().min(1).max(255),
  contractType: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  effectiveDate: optionalDate.optional(),
  expiryDate: optionalDate.optional(),
  counterpartyName: z.string().trim().max(255).nullable().optional(),
  value: z.union([z.string(), z.number()]).nullable().optional(),
  currency: z.string().trim().min(3).max(8).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const contractVersionInputSchema = z.object({
  documentId: z.string().min(1).optional(),
  versionLabel: z.string().trim().max(100).nullable().optional(),
  changeSummary: z.string().trim().max(2000).nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});


const MAX_DOCUMENT_FILE_SIZE_BYTES = 50 * 1024 * 1024;

const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export function sanitizeDocumentTags(value: unknown): string[] {
  const rawTags = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  const normalized = rawTags
    .map((tag) => String(tag).trim())
    .filter((tag) => tag.length > 0)
    .map((tag) => tag.slice(0, 80));

  return Array.from(new Set(normalized)).slice(0, 50);
}

export function assertAllowedMimeType(mimeType: string | null | undefined): void {
  const normalized = mimeType?.trim().toLowerCase();

  if (!normalized) {
    throw Object.assign(new Error('Document MIME type is required'), {
      statusCode: 422,
      code: 'DOCUMENT_MIME_TYPE_REQUIRED',
    });
  }

  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(normalized)) {
    throw Object.assign(new Error('Document MIME type is not allowed'), {
      statusCode: 415,
      code: 'DOCUMENT_MIME_TYPE_NOT_ALLOWED',
      details: {
        mimeType: normalized,
      },
    });
  }
}

export function assertAllowedFileSize(fileSize: number | null | undefined): void {
  const normalized = Number(fileSize ?? 0);

  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw Object.assign(new Error('Document file size is required'), {
      statusCode: 422,
      code: 'DOCUMENT_FILE_SIZE_REQUIRED',
    });
  }

  if (normalized > MAX_DOCUMENT_FILE_SIZE_BYTES) {
    throw Object.assign(new Error('Document file exceeds the allowed upload size'), {
      statusCode: 413,
      code: 'DOCUMENT_FILE_TOO_LARGE',
      details: {
        maxBytes: MAX_DOCUMENT_FILE_SIZE_BYTES,
        actualBytes: normalized,
      },
    });
  }
}

export type DocumentUploadDto = z.infer<typeof documentUploadSchema>;
export type DocumentUpdateDto = z.infer<typeof documentUpdateSchema>;
export type DocumentSearchQueryDto = z.infer<typeof documentSearchQuerySchema>;
export type DocumentShareDto = z.infer<typeof documentShareSchema>;
export type ContractInputDto = z.infer<typeof contractInputSchema>;
export type ContractVersionInputDto = z.infer<typeof contractVersionInputSchema>;
