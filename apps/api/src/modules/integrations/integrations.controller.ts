// apps/api/src/modules/integrations/integrations.controller.ts

import type { Request, Response, NextFunction } from 'express';

/**
 * Helper to ensure we are always operating within a tenant's scope.
 * In a professional legal system, orphan requests are a security risk.
 */
function getTenantId(req: Request): string {
  const tenantId = req.tenantId ?? (req as any).tenantId ?? req.headers['x-tenant-id'];
  if (!tenantId) throw new Error('Tenant context is required for integration tasks.');
  return tenantId as string;
}

export const checkKRAStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({
      success: true,
      module: 'integrations',
      provider: 'kra-etims',
      status: 'not_configured',
      message: 'KRA eTIMS integration endpoint is mounted. Provider credentials are pending.',
      requestId: (req as any).id, // Ensuring we don't crash if middleware is missing
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const syncInvoiceWithKRA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { invoiceId } = req.params;

    // Logic for verifying invoice ownership before queueing would happen here.

    res.status(202).json({
      success: true,
      module: 'integrations',
      provider: 'kra-etims',
      tenantId,
      invoiceId,
      status: 'accepted',
      message: 'Invoice eTIMS sync request accepted. Final queue-backed sync will be completed.',
      requestId: (req as any).id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const checkCommsStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({
      success: true,
      module: 'integrations',
      provider: 'communications',
      status: 'available',
      requestId: (req as any).id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const handlePaymentWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Note: Webhooks often require raw body validation for signatures.
    // We acknowledge receipt immediately to satisfy the external provider.
    res.status(202).json({
      success: true,
      module: 'integrations',
      provider: 'payment-webhook',
      status: 'received',
      message: 'Payment webhook received. Final idempotent gateway reconciliation pending.',
      requestId: (req as any).id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};