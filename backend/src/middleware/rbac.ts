// src/middleware/rbac.ts
const permissions = {
  PARTNER: ["VIEW_FINANCE", "GENERATE_INVOICE", "DELETE_MATTER"],
  ADVOCATE: ["LOG_TIME", "VIEW_MATTERS"],
  CLERK: ["VIEW_MATTERS", "UPLOAD_DOCS"]
};

export const authorize = (requiredPermission: string) => {
  return (req: any, res: any, next: any) => {
    const userRole = req.user.role; // e.g., 'CLERK'
    const userPerms = permissions[userRole as keyof typeof permissions] || [];

    if (userPerms.includes(requiredPermission) || userRole === 'PARTNER') {
      next();
    } else {
      res.status(403).json({ error: "Access Denied: Insufficient Permissions" });
    }
  };
};