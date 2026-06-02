import type { RequestHandler } from 'express';

type SuperAdminCandidate = {
  id: string;
  roles?: string[];
  roleNames?: string[];
  isSuperAdmin?: boolean;
  systemRole?: string | null;
  tenantRole?: string | null;
};

function normalizeRoles(user: SuperAdminCandidate): string[] {
  return [
    ...(Array.isArray(user.roles) ? user.roles : []),
    ...(Array.isArray(user.roleNames) ? user.roleNames : []),
  ].map((role) => role.toLowerCase());
}

export function isSuperAdminUser(user: SuperAdminCandidate): boolean {
  const roles = normalizeRoles(user);

  return (
    user.isSuperAdmin === true ||
    user.systemRole === 'SUPER_ADMIN' ||
    user.systemRole === 'SYSTEM_ADMIN' ||
    roles.includes('super_admin') ||
    roles.includes('system_admin')
  );
}

export const requireSuperAdmin: RequestHandler = (req, res, next) => {
  const user = req.user as SuperAdminCandidate | undefined;

  if (!user) {
    return res.status(401).json({
      error: 'Unauthorized',
      code: 'UNAUTHORIZED',
    });
  }

  if (isSuperAdminUser(user)) {
    return next();
  }

  return res.status(403).json({
    error: 'Forbidden',
    code: 'FORBIDDEN',
  });
};