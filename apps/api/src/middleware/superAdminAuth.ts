import { RequestHandler } from 'express';

export const requireSuperAdmin: RequestHandler = (req, res, next) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if ((user.roles || []).includes('super_admin') || user.isSuperAdmin === true) return next();
  return res.status(403).json({ error: 'Forbidden' });
};