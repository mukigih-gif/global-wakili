// src/utils/permissionGuard.ts
import permissions from '../config/permissions.json';

export const hasPermission = (role: string, domain: string, action: string): boolean => {
  const roleData = (permissions as any)[role];
  if (!roleData) return false;
  
  // Partners bypass all checks
  if (role === "PARTNER") return true;

  const domainPermissions = roleData[domain] || [];
  return domainPermissions.includes(action) || domainPermissions.includes("FULL_ACCESS");
};