// apps/api/src/types/express.d.ts

import type { getTenantClient } from '@global-wakili/database';
import type { AuthTokenPayload } from '../lib/jwt';
import type {
  PlatformAccessPolicy,
  PlatformBroadcastContext,
  PlatformFeatureContext,
  PlatformImpersonationContext,
  PlatformMaintenancePolicy,
} from './platform-enforcement';

type TenantScopedDbClient = ReturnType<typeof getTenantClient>;

type RequestTenantContext = {
  id: string;
  slug?: string | null;
  name?: string | null;
} | null;

declare global {
  namespace Express {
    interface User {
      sub: string;
      id: string;
      userId: string;

      email?: string | null;
      name?: string | null;

      tenantId?: string | null;
      tenant?: RequestTenantContext;

      role?: string | null;
      roleName?: string | null;
      primaryRole?: string | null;
      roles: string[];
      roleNames: string[];
      roleIds?: string[];
      permissions?: string[];

      branchId?: string | null;

      isSuperAdmin: boolean;
      isSystemAdmin?: boolean;
      systemRole?: string | null;
      tenantRole?: string | null;

      status?: string | null;
      tokenClaims?: AuthTokenPayload;
    }
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    /**
     * Authenticated identity attached by auth middleware.
     */
    user?: Express.User;

    /**
     * Canonical request id from request-context middleware.
     */
    id: string;

    /**
     * Millisecond timestamp set by request-context middleware.
     */
    startedAt: number;

    /**
     * Tenant-scoped Prisma client attached by unified tenancy middleware.
     */
    db: TenantScopedDbClient;

    /**
     * Current tenant context.
     */
    tenantId?: string;
    tenantSlug?: string;
    tenant?: RequestTenantContext;

    /**
     * RBAC middleware state.
     */
    requiredPermissions?: string[];
    grantedPermissionsCache?: Set<string>;

    /**
     * Per-request tenant/auth context.
     */
    context?: {
      tenantId: string;
      userId: string;
      user: Express.User;
      requestId?: string | null;
    };

    /**
     * Platform-control-plane access decision attached by platform-access
     * and reused by write guards. This is tenant/module/feature scoped.
     */
    platformAccessPolicy?: PlatformAccessPolicy | null;

    /**
     * Platform maintenance policy aggregate attached by maintenance/access
     * middleware. This may include active policies and read-only/deny posture.
     */
    platformMaintenancePolicy?: PlatformMaintenancePolicy | null;

    /**
     * Platform broadcast/banner context. Current service output is an aggregate
     * object, not a list, so this must remain object-shaped.
     */
    platformBroadcasts?: PlatformBroadcastContext | null;

    /**
     * Platform feature evaluation context attached by feature-flag middleware
     * or returned as part of access-policy evaluation.
     */
    platformFeatureContext?: PlatformFeatureContext | null;

    /**
     * Platform impersonation context for support/admin sessions.
     */
    platformImpersonation?: PlatformImpersonationContext | null;

    /**
     * Backward-compatible maintenance cache used by older routes/middleware.
     * New platform code should prefer platformMaintenancePolicy.
     */
    platformMaintenance?: Record<string, unknown> | null;

    /**
     * Backward-compatible feature flag cache used by older routes/middleware.
     * New platform code should prefer platformFeatureContext.
     */
    platformFeatureFlags?: Record<string, boolean>;
  }
}

export {};