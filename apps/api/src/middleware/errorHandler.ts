import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: 'Not Found',
    code: 'NOT_FOUND',
    requestId: req.headers['x-request-id'] ?? null
  });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = req.headers['x-request-id'] ?? null;

  if (err instanceof AppError) {
    // Operational error we threw intentionally
    console.warn({ requestId, error: err.message, code: err.code, details: err.details });
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details ?? null,
      requestId
    });
  }

  // Unknown / programming error
  console.error({ requestId, err });
  return res.status(500).json({
    error: 'Internal Server Error',
    code: 'INTERNAL_ERROR',
    requestId
  });
}