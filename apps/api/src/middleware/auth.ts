import { RequestHandler } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; roles?: string[]; [key: string]: unknown };
    }
  }
}

/**
 * Minimal authentication middleware.
 * - If Authorization: Bearer <token> is present, it sets req.user with an id derived from the token.
 * - This is a stub for real auth (JWT verification, session lookup).
 */
export const authMiddleware: RequestHandler = (req, res, next) => {
  try {
    const auth = req.header('authorization') ?? '';
    if (auth.startsWith('Bearer ')) {
      const token = auth.slice(7).trim();
      // Minimal deterministic stub: use token as user id for local/dev
      req.user = { id: token, roles: [] };
    }
    next();
  } catch (err) {
    next(err);
  }
};