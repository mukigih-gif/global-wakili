// apps/api/src/modules/hr/hr-permission.map.ts

import type { NextFunction, Request, Response } from 'express';

export const HR_PERMISSIONS = {
  viewDashboard: 'hr:dashboard:view',

  viewEmployee: 'hr:employee:view',
  createEmployee: 'hr:employee:create',
  updateEmployee: 'hr:employee:update',
  changeEmployeeStatus: 'hr:employee:status',
  terminateEmployee: 'hr:employee:terminate',

  viewDepartment: 'hr:department:view',
  createDepartment: 'hr:department:create',
  updateDepartment: 'hr:department:update',
  archiveDepartment: 'hr:department:archive',

  viewContract: 'hr:contract:view',
  createContract: 'hr:contract:create',
  updateContract: 'hr:contract:update',
  activateContract: 'hr:contract:activate',
  terminateContract: 'hr:contract:terminate',

  viewLeavePolicy: 'hr:leave-policy:view',
  manageLeavePolicy: 'hr:leave-policy:manage',
  accrueLeave: 'hr:leave:accrue',

  viewAttendance: 'hr:attendance:view',
  clockAttendance: 'hr:attendance:clock',
  manageAttendance: 'hr:attendance:manage',
  manageGeoFence: 'hr:geofence:manage',

  viewPerformance: 'hr:performance:view',
  managePerformance: 'hr:performance:manage',
  submitPerformance: 'hr:performance:submit',

  viewDisciplinary: 'hr:disciplinary:view',
  manageDisciplinary: 'hr:disciplinary:manage',

  viewDocument: 'hr:document:view',
  createDocument: 'hr:document:create',
  requestSignature: 'hr:document:signature-request',
  signDocument: 'hr:document:sign',
  revokeDocument: 'hr:document:revoke',
} as const;

export type HrPermission = (typeof HR_PERMISSIONS)[keyof typeof HR_PERMISSIONS];

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

export function hasHrPermission(req: Request, permission: HrPermission): boolean {
  if (isSuperUser(req)) return true;

  const permissions = getUserPermissions(req);

  return (
    permissions.includes(permission) ||
    permissions.includes('hr:*') ||
    permissions.includes('*')
  );
}

export function requireHrPermission(permission: HrPermission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (hasHrPermission(req, permission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      module: 'hr',
      error: 'Insufficient HR permission',
      code: 'HR_PERMISSION_DENIED',
      requiredPermission: permission,
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  };
}

export const HR_PERMISSION_GROUPS = {
  dashboard: [HR_PERMISSIONS.viewDashboard],
  employees: [
    HR_PERMISSIONS.viewEmployee,
    HR_PERMISSIONS.createEmployee,
    HR_PERMISSIONS.updateEmployee,
    HR_PERMISSIONS.changeEmployeeStatus,
    HR_PERMISSIONS.terminateEmployee,
  ],
  departments: [
    HR_PERMISSIONS.viewDepartment,
    HR_PERMISSIONS.createDepartment,
    HR_PERMISSIONS.updateDepartment,
    HR_PERMISSIONS.archiveDepartment,
  ],
  contracts: [
    HR_PERMISSIONS.viewContract,
    HR_PERMISSIONS.createContract,
    HR_PERMISSIONS.updateContract,
    HR_PERMISSIONS.activateContract,
    HR_PERMISSIONS.terminateContract,
  ],
  leave: [
    HR_PERMISSIONS.viewLeavePolicy,
    HR_PERMISSIONS.manageLeavePolicy,
    HR_PERMISSIONS.accrueLeave,
  ],
  attendance: [
    HR_PERMISSIONS.viewAttendance,
    HR_PERMISSIONS.clockAttendance,
    HR_PERMISSIONS.manageAttendance,
    HR_PERMISSIONS.manageGeoFence,
  ],
  performance: [
    HR_PERMISSIONS.viewPerformance,
    HR_PERMISSIONS.managePerformance,
    HR_PERMISSIONS.submitPerformance,
  ],
  disciplinary: [
    HR_PERMISSIONS.viewDisciplinary,
    HR_PERMISSIONS.manageDisciplinary,
  ],
  documents: [
    HR_PERMISSIONS.viewDocument,
    HR_PERMISSIONS.createDocument,
    HR_PERMISSIONS.requestSignature,
    HR_PERMISSIONS.signDocument,
    HR_PERMISSIONS.revokeDocument,
  ],
} as const;