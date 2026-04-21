// apps/api/src/modules/payments/payment-permission.map.ts

import type { NextFunction, Request, Response } from 'express';

export const PAYMENT_PERMISSIONS = {
  viewReceipt: 'payments:view_receipt',
  createReceipt: 'payments:create_receipt',
  allocatePayment: 'payments:allocate_payment',
  reverseReceipt: 'payments:reverse_receipt',
  viewDashboard: 'payments:view_dashboard',
  exportPayments: 'payments:export_payments',
  manageOverpayment: 'payments:manage_overpayment',
} as const;

export type PaymentPermission =
  (typeof PAYMENT_PERMISSIONS)[keyof typeof PAYMENT_PERMISSIONS];

const privilegedRoles = new Set([
  'PLATFORM_ADMIN',
  'SUPER_ADMIN',
  'FIRM_ADMIN',
  'MANAGING_PARTNER',
  'FINANCE_MANAGER',
]);

function normalizePermission(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return value.trim();
}

function getUserPermissions(req: Request): Set<string> {
  const user = req.user ?? (req as any).user ?? {};
  const directPermissions = (req as any).permissions ?? user.permissions ?? [];

  const permissions = new Set<string>();

  if (Array.isArray(directPermissions)) {
    for (const permission of directPermissions) {
      if (typeof permission === 'string') {
        permissions.add(permission);
        continue;
      }

      const resource = normalizePermission((permission as any)?.resource);
      const action = normalizePermission((permission as any)?.action);
      const name = normalizePermission((permission as any)?.name);
      const key = normalizePermission((permission as any)?.key);

      if (resource && action) permissions.add(`${resource}:${action}`);
      if (name) permissions.add(name);
      if (key) permissions.add(key);
    }
  }

  return permissions;
}

function getUserRole(req: Request): string | null {
  const user = req.user ?? (req as any).user ?? {};
  const role =
    user.role ??
    user.roleName ??
    user.role?.name ??
    (req as any).role ??
    null;

  return typeof role === 'string' ? role.toUpperCase() : null;
}

export function hasPaymentPermission(req: Request, permission: PaymentPermission): boolean {
  const role = getUserRole(req);

  if (role && privilegedRoles.has(role)) {
    return true;
  }

  const permissions = getUserPermissions(req);

  return permissions.has(permission);
}

export function requirePaymentPermission(permission: PaymentPermission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (hasPaymentPermission(req, permission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'Insufficient payment permission',
      code: 'PAYMENT_PERMISSION_DENIED',
      requiredPermission: permission,
      requestId: req.id,
    });
  };
}

export default PAYMENT_PERMISSIONS;