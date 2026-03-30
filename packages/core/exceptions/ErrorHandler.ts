// packages/core/exceptions/ErrorHandle.ts
import { Request, Response, NextFunction } from "express";

/**
 * Minimal structured HTTP error for domain/service layers.
 * Use `throw new HttpError(400, "Bad request")` inside services/controllers.
 */
export class HttpError extends Error {
  public status: number;
  public code?: string;
  public details?: unknown;

  constructor(status = 500, message = "Internal Server Error", code?: string, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Map unknown errors to a safe HTTP response shape.
 * Extend this mapping as you add domain-specific error types.
 */
function mapErrorToPayload(err: unknown) {
  if (err instanceof HttpError) {
    return {
      status: err.status,
      body: {
        error: {
          message: err.message,
          code: err.code ?? null,
          details: err.details ?? null,
        },
      },
    };
  }

  // Prisma / DB common shape detection (non-exhaustive)
  // Keep this generic to avoid leaking sensitive info.
  const anyErr = err as any;
  if (anyErr?.code && typeof anyErr?.code === "string") {
    return {
      status: 400,
      body: {
        error: {
          message: "Database error",
          code: anyErr.code,
        },
      },
    };
  }

  // Fallback: internal server error
  return {
    status: 500,
    body: {
      error: {
        message: "Internal Server Error",
      },
    },
  };
}

/**
 * Express error-handling middleware to be mounted last.
 * Logs the error and returns a safe JSON payload.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  // Basic structured logging; replace with your logger (pino/winston) as needed.
  const now = new Date().toISOString();
  // Avoid logging sensitive request bodies in production.
  // eslint-disable-next-line no-console
  console.error(`[${now}] [ERROR] ${req.method} ${req.originalUrl} -`, {
    message: (err as any)?.message ?? String(err),
    stack: (err as any)?.stack,
    path: req.originalUrl,
    tenantId: (req as any)?.tenantId ?? null,
  });

  const { status, body } = mapErrorToPayload(err);
  res.status(status).json(body);
}

/**
 * Helper to wrap async route handlers to forward errors to the errorHandler.
 * Usage:
 *   router.get("/x", wrapAsync(async (req, res) => { ... }));
 */
export const wrapAsync =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);

/**
 * Convenience factory for validation errors (e.g., Zod/Joi).
 */
export function validationError(message = "Validation failed", details?: unknown) {
  return new HttpError(422, message, "VALIDATION_ERROR", details);
}

/**
 * Convenience factory for unauthorized errors.
 */
export function unauthorized(message = "Unauthorized") {
  return new HttpError(401, message, "UNAUTHORIZED");
}

/**
 * Convenience factory for forbidden errors.
 */
export function forbidden(message = "Forbidden") {
  return new HttpError(403, message, "FORBIDDEN");
}

export default {
  HttpError,
  errorHandler,
  wrapAsync,
  validationError,
  unauthorized,
  forbidden,
};