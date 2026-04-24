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

declare global {
  namespace Express {
    interface Request {
      requiredPermissions?: string[];
      grantedPermissionsCache?: Set<string>;
    }
  }
}

type PermissionRecord = {
  resource?: string | null;
  action?: string | null;
};

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
  if (!input) return [];

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

function isValidPermissionRecord(permission: PermissionRecord): permission is Required<PermissionRecord> {
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
  const candidates = expandPermissionCandidates(required);
  return candidates.some((candidate) => granted.has(candidate));
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

export function requirePermissions(required: PermissionSource): RequestHandler {
  const permissions = normalizePermissions(required);

  return (req: Request, _res: Response, next: NextFunction): void => {
    req.requiredPermissions = permissions;
    next();
  };
}

export function checkPermission(permission: PermissionSource): RequestHandler {
  return requirePermissions(permission);
}

export function rbac(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const requiredPermissions = normalizePermissions(
        req.requiredPermissions ??
          (res.locals?.requiredPermissions as PermissionSource) ??
          (res.locals?.requiredPermission as PermissionSource),
      );

      if (requiredPermissions.length === 0) {
        next();
        return;
      }

      if (!req.user?.sub || !req.tenantId || !req.db) {
        unauthorized(res, req);
        return;
      }

      if (req.user.isSuperAdmin) {
        next();
        return;
      }

      const grantedPermissions =
        req.grantedPermissionsCache ??
        (await getGrantedPermissions(req.db, req.tenantId, req.user.sub));

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
  };
}

export function userHasPermission(req: Request, permission: string): boolean {
  if (req.user?.isSuperAdmin) {
    return true;
  }

  if (!req.grantedPermissionsCache) {
    return false;
  }

  return hasPermission(req.grantedPermissionsCache, permission);
}

export default rbac;