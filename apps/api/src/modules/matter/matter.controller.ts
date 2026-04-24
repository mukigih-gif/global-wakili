import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { MatterService } from './MatterService';

export const createMatter = asyncHandler(async (req: Request, res: Response) => {
  const created = await MatterService.create(req.db, req.tenantId!, req.body);
  res.status(201).json(created);
});

export const updateMatter = asyncHandler(async (req: Request, res: Response) => {
  const updated = await MatterService.update(
    req.db,
    req.tenantId!,
    req.params.matterId,
    req.body,
  );
  res.status(200).json(updated);
});

export const listOpenMatters = asyncHandler(async (req: Request, res: Response) => {
  const page = req.query.page ? Number(req.query.page) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const search = req.query.search ? String(req.query.search) : undefined;

  const result = await MatterService.listOpen(req.db, req.tenantId!, {
    page,
    limit,
    search,
  });

  res.status(200).json(result);
});

export const getMatterById = asyncHandler(async (req: Request, res: Response) => {
  const matter = await MatterService.getById(req.db, req.tenantId!, req.params.matterId);

  if (!matter) {
    throw Object.assign(new Error('Matter not found'), {
      statusCode: 404,
      code: 'MISSING_MATTER',
    });
  }

  res.status(200).json(matter);
});

export const getMatterOverview = asyncHandler(async (req: Request, res: Response) => {
  const matter = await MatterService.getOverview(req.db, req.tenantId!, req.params.matterId);

  if (!matter) {
    throw Object.assign(new Error('Matter not found'), {
      statusCode: 404,
      code: 'MISSING_MATTER',
    });
  }

  res.status(200).json({
    id: matter.id,
    matterCode: matter.matterCode ?? null,
    title: matter.title,
    status: matter.status,
    billingModel: matter.billingModel,
    client: matter.client,
    invoiceCount: matter._count.invoices,
    trustTransactionCount: matter._count.trustTransactions,
    expenseCount: matter._count.expenseEntries,
    recentInvoices: matter.invoices ?? [],
    recentTrustTransactions: matter.trustTransactions ?? [],
    metadata: matter.metadata ?? null,
  });
});