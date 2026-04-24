// apps/api/src/modules/document/document.routes.ts

import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { requirePermissions } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { PERMISSIONS } from '../../config/permissions';
import {
  uploadDocument,
  getDocumentDetails,
  getDocumentDownloadLink,
  searchDocuments,
  getDocumentDashboard,
  getDocumentCapabilities,
  archiveDocument,
  restoreDocument,
} from './document.controller';
import {
  archiveDocumentSchema,
  documentUploadSchema,
  restoreDocumentSchema,
} from './document.validators';

import { bindPlatformModuleEnforcement } from '../../middleware/platform';
import { platformFeatureFlag } from '../../middleware/platform-feature-flag.middleware';
import { PLATFORM_FEATURE_KEYS } from '../platform/PlatformFeatureKeys';
const router = Router();

bindPlatformModuleEnforcement(router, {
  moduleKey: 'document',
  metricType: 'FILE_STORAGE',
});

const documentSecureFileOpsFeature = platformFeatureFlag(
  PLATFORM_FEATURE_KEYS.DOCUMENT_SECURE_FILE_OPERATIONS,
  'document',
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 1,
  },
});

const searchQuerySchema = z.object({
  query: z.string().trim().max(500).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  matterId: z.string().trim().optional(),
  uploadedBy: z.string().trim().optional(),
  mimeType: z.string().trim().optional(),
  status: z.string().trim().optional(),
  version: z.coerce.number().int().min(1).optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  expiryFrom: z.string().datetime().optional(),
  expiryTo: z.string().datetime().optional(),
  category: z.string().trim().optional(),
  isRestricted: z.enum(['true', 'false']).optional(),
  isConfidential: z.enum(['true', 'false']).optional(),
  tags: z.string().trim().optional(),
});

const downloadQuerySchema = z.object({
  disposition: z.enum(['inline', 'attachment']).optional(),
});

const dashboardQuerySchema = z.object({
  matterId: z.string().trim().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  expiryWindowDays: z.coerce.number().int().min(1).max(365).optional(),
  disposalRetentionYears: z.coerce.number().int().min(1).max(50).optional(),
});

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'document',
    status: 'mounted',
    service: 'global-wakili-api',
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

router.post(
  '/',
  requirePermissions(PERMISSIONS.document.uploadDocument),
  upload.single('file'),
  validate({ body: documentUploadSchema }),
  uploadDocument,
);

router.get(
  '/search',
  requirePermissions(PERMISSIONS.document.searchDocument),
  validate({ query: searchQuerySchema }),
  searchDocuments,
);

router.get(
  '/dashboard',
  requirePermissions(PERMISSIONS.document.viewDashboard),
  validate({ query: dashboardQuerySchema }),
  getDocumentDashboard,
);

router.get(
  '/capabilities',
  requirePermissions(PERMISSIONS.document.viewDashboard),
  getDocumentCapabilities,
);

router.get(
  '/:documentId',
  requirePermissions(PERMISSIONS.document.viewDocument),
  getDocumentDetails,
);

router.get(
  '/:documentId/download',
  documentSecureFileOpsFeature,
  requirePermissions(PERMISSIONS.document.downloadDocument),
  validate({ query: downloadQuerySchema }),
  getDocumentDownloadLink,
);

router.delete(
  '/:documentId',
  requirePermissions(PERMISSIONS.document.archiveDocument),
  validate({ body: archiveDocumentSchema }),
  archiveDocument,
);

router.post(
  '/:documentId/restore',
  requirePermissions(PERMISSIONS.document.restoreDocument),
  validate({ body: restoreDocumentSchema }),
  restoreDocument,
);

export default router;