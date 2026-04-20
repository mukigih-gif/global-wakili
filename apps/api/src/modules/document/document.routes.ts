import { Router } from 'express';
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
  archiveDocument,
} from './document.controller';
import { documentUploadSchema } from './document.validators';

const router = Router();

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
  '/:documentId',
  requirePermissions(PERMISSIONS.document.viewDocument),
  getDocumentDetails,
);

router.get(
  '/:documentId/download',
  requirePermissions(PERMISSIONS.document.downloadDocument),
  validate({ query: downloadQuerySchema }),
  getDocumentDownloadLink,
);

router.delete(
  '/:documentId',
  requirePermissions(PERMISSIONS.document.archiveDocument),
  archiveDocument,
);

export default router;