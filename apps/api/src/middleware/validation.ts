import { RequestHandler } from 'express';

/**
 * Global validation middleware stub.
 * - Real implementation should integrate zod/ajv and per-route schemas.
 * - This stub simply ensures JSON body parsing already occurred.
 */
export function validationMiddleware(): RequestHandler {
  return (req, res, next) => {
    // Example: if content-type is application/json but body is missing, reject
    if (req.is('application/json') && req.body == null) {
      return res.status(400).json({ error: 'Invalid JSON body', code: 'INVALID_BODY' });
    }
    next();
  };
}