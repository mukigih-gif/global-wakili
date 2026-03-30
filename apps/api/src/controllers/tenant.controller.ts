import { Router, Request, Response } from "express";

export const tenantRouter = Router();

// GET /api/v1/tenant/ (Ensures the Tenant Identification Middleware is working)
tenantRouter.get("/", (req: Request, res: Response) => {
  // Casting to 'any' allows access to the tenantId injected by your middleware
  const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
  
  res.json({ 
    success: true,
    tenantId: tenantId 
  });
});