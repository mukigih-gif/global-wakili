// apps/api/src/middleware/unified-tenancy.ts
import { Request, Response, NextFunction } from 'express';
import { getTenantClient } from '@global-wakili/database';
// ...
req.db = getTenantClient(tenant.id);

export const unifiedTenancy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. RESOLUTION: Discover identity (JWT > Header > Subdomain)
    const headerTid = req.header('x-tenant-id')?.trim();
    const token = req.headers.authorization?.split(' ')[1];
    const host = req.headers.host;
    
    let resolvedId: string | undefined = headerTid;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        resolvedId = decoded.tenantId;
        req.user = { 
          id: decoded.sub, 
          tenantId: decoded.tenantId, 
          role: decoded.role,
          isSuperAdmin: !!decoded.isSuperAdmin 
        };
      } catch (e) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }
    }

    // Subdomain support (e.g. firm-xyz.globalwakili.com)
    if (!resolvedId && host?.includes('.') && !host.startsWith('localhost')) {
      resolvedId = host.split('.')[0];
    }

    if (!resolvedId) return res.status(401).json({ error: 'Tenant context required' });

    // 2. VALIDATION: Verify organization status
    const tenant = await prisma.tenant.findFirst({
      where: { OR: [{ id: resolvedId }, { slug: resolvedId }] },
      select: { id: true, isActive: true, slug: true }
    });

    if (!tenant || !tenant.isActive) {
      return res.status(403).json({ error: 'Firm is inactive or does not exist' });
    }

    // 3. MEMBERSHIP: Authorization check
    if (!req.user?.isSuperAdmin) {
      const isMember = await prisma.tenantMembership.findFirst({
        where: { 
          tenantId: tenant.id, 
          userId: req.user?.id, 
          status: 'ACTIVE' 
        }
      });

      if (!isMember) {
        return res.status(403).json({ error: 'Access Denied: You are not a member of this firm.' });
      }
    }

    // 4. ENFORCEMENT: Swap standard DB for the Scoped/Locked Client
    req.db = getTenantClient(tenant.id);
    
    next();
  } catch (error) {
    console.error('[Tenancy Error]:', error);
    return res.status(500).json({ error: 'Security Handshake Failure' });
  }
};