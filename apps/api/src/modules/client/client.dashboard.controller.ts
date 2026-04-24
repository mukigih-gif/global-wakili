import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { ClientDashboardService } from './ClientDashboardService';
import { ClientPortalService } from './ClientPortalService';

export const getClientInternalDashboard = asyncHandler(async (req: Request, res: Response) => {
  const dashboard = await ClientDashboardService.getInternalDashboard(req.db, {
    tenantId: req.tenantId!,
    clientId: req.params.clientId,
  });

  res.status(200).json(dashboard);
});

export const getClientPortalDashboard = asyncHandler(async (req: Request, res: Response) => {
  const portalUserId = req.user?.sub ?? req.query.portalUserId ?? null;

  if (!portalUserId) {
    throw Object.assign(new Error('Portal user identity is required'), {
      statusCode: 401,
      code: 'CLIENT_PORTAL_UNAUTHORIZED',
    });
  }

  const dashboard = await ClientPortalService.getPortalDashboard(req.db, {
    tenantId: req.tenantId!,
    clientId: req.params.clientId,
    portalUserId: String(portalUserId),
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });

  res.status(200).json(dashboard);
});

export const listClientPortalMatters = asyncHandler(async (req: Request, res: Response) => {
  const portalUserId = req.user?.sub ?? req.query.portalUserId ?? null;

  if (!portalUserId) {
    throw Object.assign(new Error('Portal user identity is required'), {
      statusCode: 401,
      code: 'CLIENT_PORTAL_UNAUTHORIZED',
    });
  }

  const result = await ClientPortalService.listPortalMatters(req.db, {
    tenantId: req.tenantId!,
    clientId: req.params.clientId,
    portalUserId: String(portalUserId),
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    search: req.query.search ? String(req.query.search) : undefined,
  });

  res.status(200).json(result);
});