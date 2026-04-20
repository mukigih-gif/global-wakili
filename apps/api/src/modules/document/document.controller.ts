import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { DocumentService } from './DocumentService';
import { DocumentAccessService } from './DocumentAccessService';
import { DocumentAuditService } from './DocumentAuditService';
import { DocumentSearchService } from './DocumentSearchService';
import { DocumentDashboardService } from './document.dashboard';

function getUploadedFile(req: Request): Express.Multer.File {
  const file = (req as any).file as Express.Multer.File | undefined;

  if (!file) {
    throw Object.assign(new Error('No file uploaded'), {
      statusCode: 422,
      code: 'DOCUMENT_FILE_REQUIRED',
    });
  }

  return file;
}

export const uploadDocument = asyncHandler(async (req: Request, res: Response) => {
  const file = getUploadedFile(req);

  const result = await DocumentService.createDocument(req.db, {
    tenantId: req.tenantId!,
    uploadedBy: req.user!.sub,
    fileName: file.originalname,
    title: req.body.title,
    description: req.body.description,
    expiryDate: req.body.expiryDate ?? null,
    mimeType: file.mimetype,
    fileSize: file.size,
    buffer: file.buffer,
    matterId: req.body.matterId ?? null,
    metadata: {
      category: req.body.category ?? 'OTHER',
      tags: req.body.tags ?? [],
      isConfidential: req.body.isConfidential ?? false,
      isRestricted: req.body.isRestricted ?? false,
      sourceEditor: 'UPLOAD',
    },
  });

  await DocumentAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    documentId: result.document.id,
    matterId: result.document.matterId ?? null,
    action: 'UPLOADED',
    requestId: req.id,
    metadata: {
      version: result.document.version,
      fileHash: result.document.fileHash,
    },
  });

  res.status(201).json(result);
});

export const getDocumentDetails = asyncHandler(async (req: Request, res: Response) => {
  const access = await DocumentAccessService.verifyAccess(req.db, {
    tenantId: req.tenantId!,
    userId: req.user!.sub,
    documentId: req.params.documentId,
    requiredAction: 'view',
  });

  const document = await DocumentService.getDocumentDetails(
    req.db,
    req.tenantId!,
    req.params.documentId,
  );

  await DocumentAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    documentId: req.params.documentId,
    matterId: access.document.matterId ?? null,
    action: 'VIEWED',
    requestId: req.id,
    fileHash: access.document.fileHash,
    version: access.document.version,
  });

  res.status(200).json(document);
});

export const getDocumentDownloadLink = asyncHandler(async (req: Request, res: Response) => {
  const access = await DocumentAccessService.verifyAccess(req.db, {
    tenantId: req.tenantId!,
    userId: req.user!.sub,
    documentId: req.params.documentId,
    requiredAction: 'download',
  });

  const link = await DocumentService.getDownloadLink(req.db, {
    tenantId: req.tenantId!,
    documentId: req.params.documentId,
    disposition: req.query.disposition === 'inline' ? 'inline' : 'attachment',
  });

  await DocumentAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    documentId: req.params.documentId,
    matterId: access.document.matterId ?? null,
    action: 'SIGNED_URL_ISSUED',
    requestId: req.id,
    fileHash: access.document.fileHash,
    version: access.document.version,
    metadata: {
      disposition: req.query.disposition === 'inline' ? 'inline' : 'attachment',
    },
  });

  res.status(200).json(link);
});

export const searchDocuments = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query.query ? String(req.query.query) : undefined;

  const result = await DocumentSearchService.search(req.db, {
    tenantId: req.tenantId!,
    query,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    filters: {
      matterId: req.query.matterId ? String(req.query.matterId) : null,
      uploadedBy: req.query.uploadedBy ? String(req.query.uploadedBy) : null,
      mimeType: req.query.mimeType ? String(req.query.mimeType) : null,
      status: req.query.status ? String(req.query.status) : null,
      version: req.query.version ? Number(req.query.version) : null,
      createdFrom: req.query.createdFrom ? String(req.query.createdFrom) : null,
      createdTo: req.query.createdTo ? String(req.query.createdTo) : null,
      expiryFrom: req.query.expiryFrom ? String(req.query.expiryFrom) : null,
      expiryTo: req.query.expiryTo ? String(req.query.expiryTo) : null,
      category: req.query.category ? String(req.query.category) : null,
      isRestricted:
        req.query.isRestricted !== undefined
          ? String(req.query.isRestricted) === 'true'
          : null,
      isConfidential:
        req.query.isConfidential !== undefined
          ? String(req.query.isConfidential) === 'true'
          : null,
      tags: req.query.tags
        ? String(req.query.tags).split(',').map((v) => v.trim())
        : null,
    },
  });

  await DocumentAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    action: 'SEARCHED',
    requestId: req.id,
    metadata: {
      query,
      resultCount: result.meta.total,
    },
  });

  res.status(200).json(result);
});

export const getDocumentDashboard = asyncHandler(async (req: Request, res: Response) => {
  const dashboard = await DocumentDashboardService.getDashboard(req.db, {
    tenantId: req.tenantId!,
    matterId: req.query.matterId ? String(req.query.matterId) : null,
    from: req.query.from ? String(req.query.from) : null,
    to: req.query.to ? String(req.query.to) : null,
    expiryWindowDays: req.query.expiryWindowDays
      ? Number(req.query.expiryWindowDays)
      : undefined,
    disposalRetentionYears: req.query.disposalRetentionYears
      ? Number(req.query.disposalRetentionYears)
      : undefined,
  });

  res.status(200).json(dashboard);
});

export const archiveDocument = asyncHandler(async (req: Request, res: Response) => {
  const access = await DocumentAccessService.verifyAccess(req.db, {
    tenantId: req.tenantId!,
    userId: req.user!.sub,
    documentId: req.params.documentId,
    requiredAction: 'delete',
  });

  const updated = await DocumentService.softDeleteDocument(req.db, {
    tenantId: req.tenantId!,
    documentId: req.params.documentId,
  });

  await DocumentAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    documentId: req.params.documentId,
    matterId: access.document.matterId ?? null,
    action: 'ARCHIVED',
    requestId: req.id,
    fileHash: access.document.fileHash,
    version: access.document.version,
  });

  res.status(200).json(updated);
});