import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';

export const auditTrailMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  
  // Intercept the response to log success/failure
  res.json = function (data) {
    if (req.method !== 'GET' && res.statusCode < 400) {
      prisma.auditLog.create({
        data: {
          tenantId: (req as any).user.tenantId,
          userId: (req as any).user.id,
          action: `${req.method} ${req.path}`,
          payload: JSON.stringify(req.body),
          timestamp: new Date()
        }
      }).catch(console.error);
    }
    return originalJson.call(this, data);
  };
  next();
};