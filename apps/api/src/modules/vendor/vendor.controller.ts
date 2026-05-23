import type { Request, Response } from 'express';

import { asyncHandler } from '../../utils/async-handler';
import { VendorService } from './VendorService';
import type { VendorDbClient, VendorListQuery } from './vendor.types';

function getTenantId(req: Request): string {
  const tenantId = req.tenantId;

  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for vendor operations'), {
      statusCode: 400,
      code: 'MISSING_TENANT',
    });
  }

  return tenantId;
}

function getVendorDb(req: Request): VendorDbClient {
  return req.db as unknown as VendorDbClient;
}

function sendSuccess(res: Response, data: unknown, statusCode = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
  });
}

export const createVendor = asyncHandler(async (req: Request, res: Response) => {
  const created = await VendorService.create(
    getVendorDb(req),
    getTenantId(req),
    req.body,
  );

  sendSuccess(res, created, 201);
});

export const updateVendor = asyncHandler(async (req: Request, res: Response) => {
  const updated = await VendorService.update(
    getVendorDb(req),
    getTenantId(req),
    req.params.vendorId,
    req.body,
  );

  sendSuccess(res, updated);
});

export const getVendorById = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await VendorService.getById(
    getVendorDb(req),
    getTenantId(req),
    req.params.vendorId,
  );

  sendSuccess(res, vendor);
});

export const listVendors = asyncHandler(async (req: Request, res: Response) => {
  const result = await VendorService.list(
    getVendorDb(req),
    getTenantId(req),
    req.query as VendorListQuery,
  );

  res.status(200).json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

export const listActiveVendors = asyncHandler(async (req: Request, res: Response) => {
  const vendors = await VendorService.listActive(
    getVendorDb(req),
    getTenantId(req),
  );

  sendSuccess(res, vendors);
});

export const changeVendorStatus = asyncHandler(async (req: Request, res: Response) => {
  const updated = await VendorService.changeStatus(
    getVendorDb(req),
    getTenantId(req),
    req.params.vendorId,
    req.body.status,
  );

  sendSuccess(res, updated);
});
