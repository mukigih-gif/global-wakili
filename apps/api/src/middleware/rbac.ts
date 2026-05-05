import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { PermissionDefinition } from '../config/permissions';
import { toPermissionString } from '../config/permissions';

type PermissionSource =
  | string
  | string[]
  | PermissionDefinition
  | PermissionDefinition[]
  | undefined
  | null;

type TenantScopedDb = Request['db'];

type PermissionRecord = {
  resource?: string | null;
  action?: string | null;
};

type RequestUserLike = {
  id?: string;
  sub?: string;
  userId?: string;
  roles?: string[];
  roleNames?: string[];
  role?: string | null;
  primaryRole?: string | null;
  isSuperAdmin?: boolean;
  systemRole?: string | null;
  tenantRole?: string | null;
};

function getRequestUser(req: Request): RequestUserLike | null {
  return (req as unknown as { user?: RequestUserLike }).user ?? null;
}

function getRequestUserId(req: Request): string | null {
  const user = getRequestUser(req);

  return user?.sub ?? user?.id ?? user?.userId ?? null;
}

function isSuperAdmin(req: Request): boolean {
  const user = getRequestUser(req);

  if (!user) {
    return false;
  }

  const roles = [
    ...(Array.isArray(user.roles) ? user.roles : []),
    ...(Array.isArray(user.roleNames) ? user.roleNames : []),
    user.role,
    user.primaryRole,
    user.systemRole,
  ]
    .filter((role): role is string => typeof role === 'string')
    .map((role) => role.toLowerCase());

  return (
    user.isSuperAdmin === true ||
    user.systemRole === 'SUPER_ADMIN' ||
    user.systemRole === 'SYSTEM_ADMIN' ||
    roles.includes('super_admin') ||
    roles.includes('system_admin') ||
    roles.includes('super_admin'.toLowerCase()) ||
    roles.includes('system_admin'.toLowerCase())
  );
}

function isPermissionDefinition(value: unknown): value is PermissionDefinition {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'resource' in value &&
      'action' in value &&
      typeof (value as PermissionDefinition).resource === 'string' &&
      typeof (value as PermissionDefinition).action === 'string',
  );
}

function normalizeSegment(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePermissions(input: PermissionSource): string[] {
  if (!input) {
    return [];
  }

  let values: string[] = [];

  if (typeof input === 'string') {
    values = input.split(',');
  } else if (Array.isArray(input)) {
    values = input.flatMap((value) => {
      if (typeof value === 'string') {
        return value.split(',');
      }

      if (isPermissionDefinition(value)) {
        return [toPermissionString(value)];
      }

      return [];
    });
  } else if (isPermissionDefinition(input)) {
    values = [toPermissionString(input)];
  }

  return [
    ...new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => value.toLowerCase()),
    ),
  ];
}

function buildPermissionKey(resource: string, action: string): string {
  return `${normalizeSegment(resource)}.${normalizeSegment(action)}`;
}

function isValidPermissionRecord(
  permission: PermissionRecord,
): permission is Required<PermissionRecord> {
  return Boolean(
    permission &&
      typeof permission.resource === 'string' &&
      permission.resource.trim() &&
      typeof permission.action === 'string' &&
      permission.action.trim(),
  );
}

function expandPermissionCandidates(permission: string): string[] {
  const normalized = permission.trim().toLowerCase();
  const [resource, action] = normalized.split('.');

  if (!resource || !action) {
    return [normalized];
  }

  return [normalized, `${resource}.*`, `*.${action}`, '*.*'];
}

function hasPermission(granted: Set<string>, required: string): boolean {
  return expandPermissionCandidates(required).some((candidate) =>
    granted.has(candidate),
  );
}

async function getGrantedPermissions(
  db: TenantScopedDb,
  tenantId: string,
  userId: string,
): Promise<Set<string>> {
  const userWithRoles = await db.user.findFirst({
    where: {
      id: userId,
      tenantId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      roles: {
        select: {
          id: true,
          permissions: {
            select: {
              resource: true,
              action: true,
            },
          },
        },
      },
      permissions: {
        select: {
          resource: true,
          action: true,
        },
      },
    },
  });

  if (!userWithRoles) {
    return new Set<string>();
  }

  const granted = new Set<string>();

  for (const permission of userWithRoles.permissions ?? []) {
    if (isValidPermissionRecord(permission)) {
      granted.add(buildPermissionKey(permission.resource, permission.action));
    }
  }

  for (const role of userWithRoles.roles ?? []) {
    for (const permission of role.permissions ?? []) {
      if (isValidPermissionRecord(permission)) {
        granted.add(buildPermissionKey(permission.resource, permission.action));
      }
    }
  }

  return granted;
}

function unauthorized(res: Response, req: Request): void {
  res.status(401).json({
    error: 'Unauthorized',
    code: 'UNAUTHORIZED',
    requestId: req.id,
  });
}

function forbidden(
  res: Response,
  req: Request,
  code: string,
  extra?: Record<string, unknown>,
): void {
  res.status(403).json({
    error: 'Forbidden',
    code,
    requestId: req.id,
    ...(extra ?? {}),
  });
}

async function enforcePermissions(
  req: Request,
  res: Response,
  next: NextFunction,
  requiredPermissions: string[],
): Promise<void> {
  try {
    if (requiredPermissions.length === 0) {
      next();
      return;
    }

    const userId = getRequestUserId(req);

    if (!userId) {
      unauthorized(res, req);
      return;
    }

    if (isSuperAdmin(req)) {
      next();
      return;
    }

    if (!req.tenantId || !req.db) {
      forbidden(res, req, 'TENANT_CONTEXT_REQUIRED');
      return;
    }

    const grantedPermissions =
      req.grantedPermissionsCache ??
      (await getGrantedPermissions(req.db, req.tenantId, userId));

    req.grantedPermissionsCache = grantedPermissions;

    if (grantedPermissions.size === 0) {
      forbidden(res, req, 'RBAC_ROLE_NOT_FOUND');
      return;
    }

    const missingPermissions = requiredPermissions.filter(
      (permission) => !hasPermission(grantedPermissions, permission),
    );

    if (missingPermissions.length > 0) {
      forbidden(res, req, 'RBAC_PERMISSION_DENIED', {
        missingPermissions,
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Route-level permission guard.
 *
 * This enforces immediately, instead of only marking req.requiredPermissions.
 * That is safer because module routes already use:
 *
 * router.get('/x', requirePermissions(...), controller)
 */
export function requirePermissions(required: PermissionSource): RequestHandler {
  const permissions = normalizePermissions(required);

  return (req: Request, res: Response, next: NextFunction): void => {
    req.requiredPermissions = permissions;
    void enforcePermissions(req, res, next, permissions);
  };
}

export function checkPermission(permission: PermissionSource): RequestHandler {
  return requirePermissions(permission);
}

/**
 * Compatibility middleware for routes that set req.requiredPermissions earlier.
 */
export function rbac(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requiredPermissions = normalizePermissions(
      req.requiredPermissions ??
        (res.locals?.requiredPermissions as PermissionSource) ??
        (res.locals?.requiredPermission as PermissionSource),
    );

    void enforcePermissions(req, res, next, requiredPermissions);
  };
}

export function userHasPermission(req: Request, permission: string): boolean {
  if (isSuperAdmin(req)) {
    return true;
  }

  if (!req.grantedPermissionsCache) {
    return false;
  }

  return hasPermission(req.grantedPermissionsCache, permission);
}

export default rbac;