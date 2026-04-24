import type { DocumentStatus } from '@global-wakili/database';

export type DocumentCategory =
  | 'PLEADING'
  | 'CORRESPONDENCE'
  | 'EVIDENCE'
  | 'CONTRACT'
  | 'BILLING'
  | 'INTERNAL'
  | 'KRA_COMPLIANCE'
  | 'OTHER';

export type DocumentSourceEditor =
  | 'UPLOAD'
  | 'SYSTEM_TEMPLATE'
  | 'WORD_ONLINE'
  | 'GOOGLE_DOCS'
  | 'INTERNAL_EDITOR';

export type DownloadDisposition =
  | 'inline'
  | 'attachment';

export type StorageProvider =
  | 'LOCAL'
  | 'S3'
  | 'AZURE'
  | 'GCS';

export interface DocumentMetadata extends Record<string, unknown> {
  category?: DocumentCategory;
  tags?: string[];
  isConfidential?: boolean;
  isRestricted?: boolean;
  originalName?: string;
  sourceEditor?: DocumentSourceEditor;
  language?: string;
  pageCount?: number;
}

export interface FileUploadPayload {
  tenantId: string;
  matterId?: string | null;
  uploadedBy: string;
  fileName: string;
  title?: string | null;
  description?: string | null;
  expiryDate?: Date | string | null;
  mimeType: string;
  fileSize: number;
  buffer: Buffer;
  status?: DocumentStatus | string;
  metadata?: DocumentMetadata | null;
}

export interface VersionChainCreationPayload {
  tenantId: string;
  matterId?: string | null;
  uploadedBy: string;
  fileName: string;
  title?: string | null;
  description?: string | null;
  expiryDate?: Date | string | null;
  mimeType: string;
  fileSize: number;
  buffer: Buffer;
  status?: DocumentStatus | string;
  metadata?: DocumentMetadata | null;
  changeSummary?: string | null;
}

export interface StorageUploadResult {
  provider: StorageProvider;
  storageKey: string;
  fileUrl: string;
  fileHash: string;
  fileSize: number;
  mimeType: string;
}

export interface SignedUrlParams {
  fileUrl: string;
  fileName?: string | null;
  disposition?: DownloadDisposition;
  expiresInSeconds?: number;
  mimeType?: string | null;
}

export interface SignedUrlResult {
  url: string;
  expiresAt: Date;
  disposition: DownloadDisposition;
}

export type TenantDocumentDbClient = {
  $transaction: <T>(fn: (tx: any) => Promise<T>) => Promise<T>;
  document: {
    create: Function;
    update: Function;
    findFirst: Function;
    findMany?: Function;
  };
  matter: {
    findFirst: Function;
  };
  user: {
    findFirst: Function;
  };
};