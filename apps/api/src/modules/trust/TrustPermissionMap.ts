// apps/api/src/modules/trust/TrustPermissionMap.ts

import type { NextFunction, Request, Response } from 'express';

export const TRUST_PERMISSIONS = {
  viewDashboard: 'trust.view_dashboard',
  viewOverview: 'trust.view_overview',

  viewAccount: 'trust.view_account',
  manageAccount: 'trust.manage_account',

  viewLedger: 'trust.view_ledger',
  viewStatement: 'trust.view_statement',

  createTransaction: 'trust.create_transaction',
  approveTransaction: 'trust.approve_transaction',
  reverseTransaction: 'trust.reverse_transaction',

  transferToOffice: 'trust.transfer_to_office',
  approveTransfer: 'trust.approve_transfer',

  postInterest: 'trust.post_interest',

  viewReconciliation: 'trust.view_reconciliation',
  recordReconciliation: 'trust.record_reconciliation',
  runThreeWayReconciliation: 'trust.run_three_way_reconciliation',

  viewAlerts: 'trust.view_alerts',
  emitAlerts: 'trust.emit_alerts',
  viewViolations: 'trust.view_violations',

  viewReports: 'trust.view_reports',
  exportReports: 'trust.export_reports',

  manageTrust: 'trust.manage',
} as const;

export type TrustPermission =
  (typeof TRUST_PERMISSIONS)[keyof typeof TRUST_PERMISSIONS];

function userPermissions(req: Request): string[] {
  const user = req.user ?? (req as any).user;

  return [
    ...(Array.isArray(user?.permissions) ? user.permissions : []),
    ...(Array.isArray((req as any).permissions) ? (req as any).permissions : []),
  ].map(String);
}

function isPrivilegedTrustUser(req: Request): boolean {
  const user = req.user ?? (req as any).user;
  const roles = Array.isArray(user?.roles) ? user.roles.map(String) : [];
  const role = user?.role ? String(user.role) : '';

  return (
    user?.isSuperAdmin === true ||
    user?.isSystemAdmin === true ||
    roles.includes('SUPER_ADMIN') ||
    roles.includes('MANAGING_PARTNER') ||
    roles.includes('FINANCE_PARTNER') ||
    roles.includes('TRUST_ACCOUNT_ADMIN') ||
    role === 'SUPER_ADMIN' ||
    role === 'MANAGING_PARTNER' ||
    role === 'FINANCE_PARTNER' ||
    role === 'TRUST_ACCOUNT_ADMIN'
  );
}

export function hasTrustPermission(req: Request, permission: TrustPermission): boolean {
  if (isPrivilegedTrustUser(req)) return true;

  const permissions = userPermissions(req);

  return (
    permissions.includes(permission) ||
    permissions.includes(TRUST_PERMISSIONS.manageTrust) ||
    permissions.includes('trust.*') ||
    permissions.includes('*')
  );
}

export function requireTrustPermission(permission: TrustPermission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (hasTrustPermission(req, permission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      module: 'trust',
      error: 'Insufficient trust-accounting permission',
      code: 'TRUST_PERMISSION_DENIED',
      requiredPermission: permission,
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  };
}

export const TRUST_PERMISSION_GROUPS = {
  dashboard: [TRUST_PERMISSIONS.viewDashboard, TRUST_PERMISSIONS.viewOverview],
  accounts: [TRUST_PERMISSIONS.viewAccount, TRUST_PERMISSIONS.manageAccount],
  ledger: [TRUST_PERMISSIONS.viewLedger, TRUST_PERMISSIONS.viewStatement],
  transactions: [
    TRUST_PERMISSIONS.createTransaction,
    TRUST_PERMISSIONS.approveTransaction,
    TRUST_PERMISSIONS.reverseTransaction,
  ],
  transfers: [
    TRUST_PERMISSIONS.transferToOffice,
    TRUST_PERMISSIONS.approveTransfer,
  ],
  reconciliation: [
    TRUST_PERMISSIONS.viewReconciliation,
    TRUST_PERMISSIONS.recordReconciliation,
    TRUST_PERMISSIONS.runThreeWayReconciliation,
  ],
  alerts: [
    TRUST_PERMISSIONS.viewAlerts,
    TRUST_PERMISSIONS.emitAlerts,
    TRUST_PERMISSIONS.viewViolations,
  ],
  reports: [TRUST_PERMISSIONS.viewReports, TRUST_PERMISSIONS.exportReports],
} as const;

export default TRUST_PERMISSIONS;