import { Request, Response, NextFunction } from 'express';

/**
 * 1. THE SAAS SYSTEM GUARD
 * Secures your global SaaS operations (e.g., Billing, Tenant Creation)
 */
export const requireSystemRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user; // Injected by your JWT middleware

    if (!allowedRoles.includes(user.systemRole)) {
      return res.status(403).json({ 
        error: "SaaS Security Violation: Unauthorized System Access." 
      });
    }
    next();
  };
};

/**
 * 2. THE TENANT DATA ISOLATION GUARD (IDOR Prevention)
 * Secures law firm endpoints. CRITICAL: It doesn't just check the role, 
 * it mathematically guarantees the user belongs to the requested firm.
 */
export const requireTenantRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const requestedFirmId = req.params.firmId || req.body.firmId;

    // A. Check if they have a valid Tenant Role
    if (!allowedRoles.includes(user.tenantRole)) {
      return res.status(403).json({ error: "Access Denied: Insufficient Firm Permissions." });
    }

    // B. THE ISOLATION CHECK (Crucial for SaaS)
    // Even if they are a FIRM_ADMIN, they can only access THEIR firm.
    if (user.firmId !== requestedFirmId) {
      console.error(`[SECURITY ALERT] Cross-Tenant Access Attempt by User ${user.id}`);
      return res.status(403).json({ error: "Access Denied: Tenant Boundary Violation." });
    }

    next();
  };
};