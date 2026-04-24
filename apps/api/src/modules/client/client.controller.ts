import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { ClientService } from './ClientService';

export const createClient = asyncHandler(async (req: Request, res: Response) => {
  const created = await ClientService.create(req.db, req.tenantId!, req.body);
  res.status(201).json(created);
});

export const updateClient = asyncHandler(async (req: Request, res: Response) => {
  const updated = await ClientService.update(
    req.db,
    req.tenantId!,
    req.params.clientId,
    req.body,
  );
  res.status(200).json(updated);
});

export const listActiveClients = asyncHandler(async (req: Request, res: Response) => {
  const page = req.query.page ? Number(req.query.page) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const search = req.query.search ? String(req.query.search) : undefined;

  const result = await ClientService.listActive(req.db, req.tenantId!, {
    page,
    limit,
    search,
  });

  res.status(200).json(result);
});

export const getClientById = asyncHandler(async (req: Request, res: Response) => {
  const client = await ClientService.getById(req.db, req.tenantId!, req.params.clientId);

  if (!client) {
    throw Object.assign(new Error('Client not found'), {
      statusCode: 404,
      code: 'MISSING_CLIENT',
    });
  }

  res.status(200).json(client);
});

export const getClientOverview = asyncHandler(async (req: Request, res: Response) => {
  const client = await ClientService.getOverview(req.db, req.tenantId!, req.params.clientId);

  if (!client) {
    throw Object.assign(new Error('Client not found'), {
      statusCode: 404,
      code: 'MISSING_CLIENT',
    });
  }

  res.status(200).json({
    id: client.id,
    clientCode: client.clientCode ?? null,
    name: client.name,
    status: client.status,
    matterCount: client._count.matters,
    invoiceCount: client._count.invoices,
    recentMatters: client.matters ?? [],
    recentInvoices: client.invoices ?? [],
  });
});