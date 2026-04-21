// apps/api/src/modules/payroll/payroll-permission.map.ts

import type { NextFunction, Request, Response } from 'express';

export const PAYROLL_PERMISSIONS = {
  viewDashboard: 'payroll:dashboard:view',

  viewBatch: 'payroll:batch:view',
  createBatch: 'payroll:batch:create',
  submitBatch: 'payroll:batch:submit',
  approveBatch: 'payroll:batch:approve',
  rejectBatch: 'payroll:batch:reject',
  cancelBatch: 'payroll:batch:cancel',
  postBatch: 'payroll:batch:post',

  viewRecord: 'payroll:record:view',
  createRecord: 'payroll:record:create',
  recalculateRecord: 'payroll:record:recalculate',
  cancelRecord: 'payroll:record:cancel',

  viewPayslip: 'payroll:payslip:view',
  generatePayslip: 'payroll:payslip:generate',
  publishPayslip: 'payroll:payslip:publish',
  revokePayslip: 'payroll:payslip:revoke',

  viewStatutory: 'payroll:statutory:view',
  createStatutoryFiling: 'payroll:statutory:create',
  markStatutoryFiled: 'payroll:statutory:file',

  viewReports: 'payroll:reports:view',
  exportReports: 'payroll:reports:export',
} as const;

export type PayrollPermission =
  (typeof PAYROLL_PERMISSIONS)[keyof typeof PAYROLL_PERMISSIONS];

function getUserPermissions(req: Request): string[] {
  const user = req.user ?? (req as any).user;

  const permissions = [
    ...(Array.isArray(user?.permissions) ? user.permissions : []),
    ...(Array.isArray((req as any).permissions) ? (req as any).permissions : []),
  ];

  return permissions.map(String);
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

export function hasPayrollPermission(
  req: Request,
  permission: PayrollPermission,
): boolean {
  if (isSuperUser(req)) return true;

  const userPermissions = getUserPermissions(req);

  return (
    userPermissions.includes(permission) ||
    userPermissions.includes('payroll:*') ||
    userPermissions.includes('*')
  );
}

export function requirePayrollPermission(permission: PayrollPermission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (hasPayrollPermission(req, permission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      module: 'payroll',
      error: 'Insufficient payroll permission',
      code: 'PAYROLL_PERMISSION_DENIED',
      requiredPermission: permission,
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  };
}

export const PAYROLL_PERMISSION_GROUPS = {
  dashboard: [PAYROLL_PERMISSIONS.viewDashboard],
  batchLifecycle: [
    PAYROLL_PERMISSIONS.viewBatch,
    PAYROLL_PERMISSIONS.createBatch,
    PAYROLL_PERMISSIONS.submitBatch,
    PAYROLL_PERMISSIONS.approveBatch,
    PAYROLL_PERMISSIONS.rejectBatch,
    PAYROLL_PERMISSIONS.cancelBatch,
    PAYROLL_PERMISSIONS.postBatch,
  ],
  records: [
    PAYROLL_PERMISSIONS.viewRecord,
    PAYROLL_PERMISSIONS.createRecord,
    PAYROLL_PERMISSIONS.recalculateRecord,
    PAYROLL_PERMISSIONS.cancelRecord,
  ],
  payslips: [
    PAYROLL_PERMISSIONS.viewPayslip,
    PAYROLL_PERMISSIONS.generatePayslip,
    PAYROLL_PERMISSIONS.publishPayslip,
    PAYROLL_PERMISSIONS.revokePayslip,
  ],
  statutory: [
    PAYROLL_PERMISSIONS.viewStatutory,
    PAYROLL_PERMISSIONS.createStatutoryFiling,
    PAYROLL_PERMISSIONS.markStatutoryFiled,
  ],
  reports: [
    PAYROLL_PERMISSIONS.viewReports,
    PAYROLL_PERMISSIONS.exportReports,
  ],
} as const;