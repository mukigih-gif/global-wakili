// apps/api/src/modules/finance/FinancePermissionMap.ts

import type { NextFunction, Request, Response } from 'express';

export const FINANCE_PERMISSIONS = {
  viewDashboard: 'finance:dashboard:view',

  viewAccount: 'finance:account:view',
  createAccount: 'finance:account:create',
  updateAccount: 'finance:account:update',

  viewJournal: 'finance:journal:view',
  postJournal: 'finance:journal:post',
  approveJournal: 'finance:journal:approve',
  reverseJournal: 'finance:journal:reverse',

  viewReports: 'finance:reports:view',
  exportReports: 'finance:reports:export',

  viewTrialBalance: 'finance:trial-balance:view',
  viewBalanceSheet: 'finance:balance-sheet:view',
  viewCashflow: 'finance:cashflow:view',
  viewStatement: 'finance:statement:view',

  closePeriod: 'finance:period:close',
  viewPeriod: 'finance:period:view',

  runReconciliation: 'finance:reconciliation:run',
  viewReconciliation: 'finance:reconciliation:view',

  fiscalizeEtims: 'finance:etims:fiscalize',
  viewTax: 'finance:tax:view',
  manageTax: 'finance:tax:manage',

  manageFinance: 'finance:*',
} as const;

export type FinancePermission =
  (typeof FINANCE_PERMISSIONS)[keyof typeof FINANCE_PERMISSIONS];

function getUserPermissions(req: Request): string[] {
  const user = req.user ?? (req as any).user;

  return [
    ...(Array.isArray(user?.permissions) ? user.permissions : []),
    ...(Array.isArray((req as any).permissions) ? (req as any).permissions : []),
  ].map(String);
}

function isSuperUser(req: Request): boolean {
  const user = req.user ?? (req as any).user;
  const roles = Array.isArray(user?.roles) ? user.roles.map(String) : [];
  const role = user?.role ? String(user.role) : '';

  return (
    user?.isSuperAdmin === true ||
    user?.isSystemAdmin === true ||
    roles.includes('SUPER_ADMIN') ||
    roles.includes('SYSTEM_ADMIN') ||
    roles.includes('MANAGING_PARTNER') ||
    role === 'SUPER_ADMIN' ||
    role === 'SYSTEM_ADMIN' ||
    role === 'MANAGING_PARTNER'
  );
}

export function hasFinancePermission(
  req: Request,
  permission: FinancePermission,
): boolean {
  if (isSuperUser(req)) return true;

  const permissions = getUserPermissions(req);

  return (
    permissions.includes(permission) ||
    permissions.includes(FINANCE_PERMISSIONS.manageFinance) ||
    permissions.includes('finance:*') ||
    permissions.includes('*')
  );
}

export function requireFinancePermission(permission: FinancePermission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (hasFinancePermission(req, permission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      module: 'finance',
      error: 'Insufficient finance permission',
      code: 'FINANCE_PERMISSION_DENIED',
      requiredPermission: permission,
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  };
}

export const FINANCE_PERMISSION_GROUPS = {
  dashboard: [FINANCE_PERMISSIONS.viewDashboard],
  accounts: [
    FINANCE_PERMISSIONS.viewAccount,
    FINANCE_PERMISSIONS.createAccount,
    FINANCE_PERMISSIONS.updateAccount,
  ],
  journals: [
    FINANCE_PERMISSIONS.viewJournal,
    FINANCE_PERMISSIONS.postJournal,
    FINANCE_PERMISSIONS.approveJournal,
    FINANCE_PERMISSIONS.reverseJournal,
  ],
  reports: [
    FINANCE_PERMISSIONS.viewReports,
    FINANCE_PERMISSIONS.exportReports,
    FINANCE_PERMISSIONS.viewTrialBalance,
    FINANCE_PERMISSIONS.viewBalanceSheet,
    FINANCE_PERMISSIONS.viewCashflow,
    FINANCE_PERMISSIONS.viewStatement,
  ],
  periodClose: [
    FINANCE_PERMISSIONS.viewPeriod,
    FINANCE_PERMISSIONS.closePeriod,
  ],
  reconciliation: [
    FINANCE_PERMISSIONS.runReconciliation,
    FINANCE_PERMISSIONS.viewReconciliation,
  ],
  tax: [
    FINANCE_PERMISSIONS.viewTax,
    FINANCE_PERMISSIONS.manageTax,
    FINANCE_PERMISSIONS.fiscalizeEtims,
  ],
} as const;