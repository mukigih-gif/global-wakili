// apps/api/src/modules/platform/PlatformSeedService.ts

import { PERMISSIONS } from '../../config/permissions';
import type { PlatformDbClient, PlatformAdminRole } from './platform.types';

type PermissionLike = {
  module?: string;
  action?: string;
  description?: string;
};

function flattenPlatformPermissions(): PermissionLike[] {
  const raw = (PERMISSIONS as any)?.platform ?? {};
  return Object.values(raw).filter(Boolean) as PermissionLike[];
}

function rolePermissionMatrix(): Record<PlatformAdminRole, string[]> {
  return {
    PLATFORM_OWNER: [
      'view_overview',
      'manage_users',
      'view_users',
      'manage_tenant_lifecycle',
      'view_tenant_lifecycle',
      'manage_billing',
      'view_billing',
      'manage_quotas',
      'view_quotas',
      'manage_flags',
      'view_flags',
      'manage_settings',
      'view_settings',
      'manage_impersonation',
      'view_impersonation',
      'manage_incidents',
      'view_incidents',
      'manage_backups',
      'view_backups',
      'view_webhooks',
      'manage_health',
      'view_health',
      'manage_tickets',
      'view_tickets',
      'manage_messaging',
      'view_messaging',
      'manage_patches',
      'view_patches',
      'manage_queue_ops',
      'view_queue_ops',
    ],
    DEVOPS_ADMIN: [
      'view_overview',
      'view_users',
      'view_tenant_lifecycle',
      'manage_tenant_lifecycle',
      'view_flags',
      'view_settings',
      'manage_incidents',
      'view_incidents',
      'manage_backups',
      'view_backups',
      'view_webhooks',
      'manage_health',
      'view_health',
      'manage_patches',
      'view_patches',
      'manage_queue_ops',
      'view_queue_ops',
    ],
    FINANCIAL_ADMIN: [
      'view_overview',
      'view_billing',
      'manage_billing',
      'view_quotas',
      'view_tickets',
      'manage_tickets',
      'view_messaging',
      'view_patches',
    ],
    SUPPORT_AGENT: [
      'view_overview',
      'view_users',
      'view_tenant_lifecycle',
      'view_billing',
      'view_impersonation',
      'manage_impersonation',
      'view_health',
      'view_tickets',
      'manage_tickets',
      'view_messaging',
    ],
    SECURITY_ADMIN: [
      'view_overview',
      'view_users',
      'view_impersonation',
      'manage_impersonation',
      'view_settings',
      'manage_settings',
      'view_incidents',
      'manage_incidents',
      'view_backups',
      'view_webhooks',
      'view_health',
      'view_patches',
    ],
  };
}

export class PlatformSeedService {
  static async seedAccessControl(db: PlatformDbClient) {
    const permissionInputs = flattenPlatformPermissions();
    const matrix = rolePermissionMatrix();

    let createdPermissions = 0;
    let createdRoles = 0;
    let createdRoleLinks = 0;

    const permissionMap = new Map<string, any>();

    for (const permission of permissionInputs) {
      const module = String(permission.module ?? 'platform').trim();
      const action = String(permission.action ?? '').trim();
      const description = permission.description ? String(permission.description).trim() : null;

      if (!action) continue;

      let existing = await db.platformPermission.findFirst({
        where: { module, action },
      });

      if (!existing) {
        existing = await db.platformPermission.create({
          data: {
            module,
            action,
            description,
          },
        });
        createdPermissions += 1;
      } else if (description && existing.description !== description) {
        existing = await db.platformPermission.update({
          where: { id: existing.id },
          data: { description },
        });
      }

      permissionMap.set(`${module}:${action}`, existing);
    }

    for (const roleKey of Object.keys(matrix) as PlatformAdminRole[]) {
      let role = await db.platformRole.findFirst({
        where: { key: roleKey },
      });

      if (!role) {
        role = await db.platformRole.create({
          data: {
            key: roleKey,
            name: roleKey,
            isSystem: true,
            description: `System platform role for ${roleKey}.`,
          },
        });
        createdRoles += 1;
      }

      for (const action of matrix[roleKey]) {
        const permission = permissionMap.get(`platform:${action}`);
        if (!permission) continue;

        const existingLink = await db.platformRolePermission.findFirst({
          where: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });

        if (!existingLink) {
          await db.platformRolePermission.create({
            data: {
              roleId: role.id,
              permissionId: permission.id,
            },
          });
          createdRoleLinks += 1;
        }
      }
    }

    return {
      createdPermissions,
      createdRoles,
      createdRoleLinks,
      permissionCount: await db.platformPermission.count({}),
      roleCount: await db.platformRole.count({}),
      rolePermissionCount: await db.platformRolePermission.count({}),
    };
  }
}

export default PlatformSeedService;