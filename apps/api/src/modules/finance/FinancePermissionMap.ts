// apps/api/src/modules/finance/FinancePermissionMap.ts
//
// Permission CONSTANTS only. The broken guard (requireFinancePermission/
// hasFinancePermission — read the never-populated req.user.permissions + a
// role-name allowlist) was retired in FINDING-007-011 step (c); finance routes
// now enforce via requirePermissions (rbac.ts, DB-backed).

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
};

export default FinancePermissionMap;