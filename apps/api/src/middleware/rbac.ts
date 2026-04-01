import { RequestHandler } from 'express';

/**
 * RBAC middleware stub.
 * - Reads optional `requiredPermission` set on route handler via `res.locals.requiredPermission` or `req.route?.meta`.
 * - In this minimal stub it allows requests when no permission is required.
 * - Replace with real permission checks against roles/permissions store.
 */
const rbacMiddleware: RequestHandler = (req, res, next) => {
  try {
    // Example: route handlers may set res.locals.requiredPermission = 'savings.create'
    const required = (res.locals && res.locals.requiredPermission) || null;
    if (!required) {
      return next();
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    }

    // Minimal allow-all for now; implement real checks here
    return next();
  } catch (err) {
    next(err);
  }
};

export default rbacMiddleware;