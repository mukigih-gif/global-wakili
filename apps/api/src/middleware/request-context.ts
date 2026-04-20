import type { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      id: string;
      startedAt: number;
    }
  }
}

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const incomingRequestId =
    typeof req.headers['x-request-id'] === 'string' && req.headers['x-request-id'].trim().length > 0
      ? req.headers['x-request-id'].trim()
      : null;

  const requestId = incomingRequestId ?? crypto.randomUUID();

  req.id = requestId;
  req.startedAt = Date.now();

  res.setHeader('X-Request-Id', requestId);

  next();
}