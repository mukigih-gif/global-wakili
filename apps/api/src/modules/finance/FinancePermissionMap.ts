// apps/api/src/modules/finance/FinancePermissionMap.ts

import type { NextFunction, Request, Response } from 'express';
import { PERMISSIONS, toPermissionString } from '../../config/permissions';

export const FINANCE_PERMISSIONS = {
  viewDashboard: toPermissionString(PERMISSIONS.finance.viewDashboard),

  viewAccount: toPermissionString(PERMISSIONS.finance.viewAccount),
  createAccount: toPermissionString(PERMISSIONS.finance.createAccount),
  updateAccount: toPermissionString(PERMISSIONS.finance.updateAccount),

  viewJournal: toPermissionString(PERMISSIONS.finance.viewJournal),
  postJournal: toPermissionString(PERMISSIONS.finance.postJournal),
  approveJournal: toPermissionString(PERMISSIONS.finance.approveJournal),
  reverseJournal: toPermissionString(PERMISSIONS.finance.reverseJournal),

  viewReports: toPermissionString(PERMISSIONS.finance.viewReports),
  exportReports: toPermissionString(PERMISSIONS.finance.exportReport),

  viewTrialBalance: toPermissionString(PERMISSIONS.finance.viewTrialBalance),
  viewBalanceSheet: toPermissionString(PERMISSIONS.finance.viewBalanceSheet),
  viewCashflow: toPermissionString(PERMISSIONS.finance.viewCashflow),
  viewStatement: toPermissionString(PERMISSIONS.finance.viewStatement),

  closePeriod: toPermissionString(PERMISSIONS.finance.closePeriod),
  viewPeriod: toPermissionString(PERMISSIONS.finance.viewPeriod),

  runReconciliation: toPermissionString(PERMISSIONS.finance.runReconciliation),
  viewReconciliation: toPermissionString(PERMISSIONS.finance.viewReconciliation),

  fiscalizeEtims: toPermissionString(PERMISSIONS.finance.fiscalizeEtims),
  viewTax: toPermissionString(PERMISSIONS.finance.viewTax),
  manageTax: toPermissionString(PERMISSIONS.finance.manageTax),

  manageFinance: 'finance:*',
} as const;

export type FinancePermission =
  (typeof FINANCE_PERMISSIONS)[keyof typeof FINANCE_PERMISSIONS];

type FinanceRequestUser = {
  permissions?: unknown;
  roles?: unknown;
  role?: unknown;
  isSuperAdmin?: unknown;
  isSystemAdmin?: unknown;
};

type FinancePermissionRequest = Request & {
  user?: FinanceRequestUser;
  permissions?: unknown;
};

function financeRequest(req: Request): FinancePermissionRequest {
  return req as FinancePermissionRequest;
}

function getUserPermissions(req: Request): string[] {
  const financeReq = financeRequest(req);
  const user = financeReq.user;

  return [
    ...(Array.isArray(user?.permissions) ? user.permissions : []),
    ...(Array.isArray(financeReq.permissions) ? financeReq.permissions : []),
  ].map(String);
}

function isSuperUser(req: Request): boolean {
  const user = financeRequest(req).user;
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
const FinancePermissionMap = {
  FINANCE_PERMISSIONS,
  FINANCE_PERMISSION_GROUPS,
  hasFinancePermission,
  requireFinancePermission,
};

export default FinancePermissionMap;