import { Request, Response, NextFunction } from 'express';

export const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const tenantId = req.headers['x-tenant-id'] as string;

  if (!tenantId) {
    return res.status(401).json({
      success: false,
      message: "Access Denied: Missing Tenant Identification"
    });
  }

  // Attach to request so the Controller can use it
  (req as any).tenantId = tenantId;
  next();
};