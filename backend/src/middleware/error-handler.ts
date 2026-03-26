// ==========================================
// GLOBAL ERROR HANDLER MIDDLEWARE
// ==========================================

import { Request, Response, NextFunction } from 'express';
import { Logger } from 'winston';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  meta?: Record<string, any>;
}

export function errorHandler(logger: Logger) {
  return async (err: Error, req: Request, res: Response, next: NextFunction) => {
    const requestId = (req as any).requestId || 'unknown';
    const userId = (req as any).user?.id;
    const tenantId = (req as any).context?.tenantId;

    // Log error
    logger.error('[Error Handler]', {
      requestId,
      userId,
      tenantId,
      path: req.path,
      method: req.method,
      message: err.message,
      stack: err.stack,
    });

    // Handle Prisma errors
    if (err instanceof PrismaClientKnownRequestError) {
      return handlePrismaError(err, res, logger);
    }

    // Handle custom errors
    if ((err as CustomError).statusCode) {
      return res.status((err as CustomError).statusCode!).json({
        error: err.message,
        code: (err as CustomError).code,
        requestId,
      });
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        message: err.message,
        requestId,
      });
    }

    // Default error response
    res.status(500).json({
      error: 'Internal server error',
      requestId,
      ...(process.env.NODE_ENV === 'development' && {
        message: err.message,
        stack: err.stack,
      }),
    });
  };
}

function handlePrismaError(
  err: PrismaClientKnownRequestError,
  res: Response,
  logger: Logger
) {
  switch (err.code) {
    case 'P2002':
      // Unique constraint violation
      return res.status(409).json({
        error: 'Duplicate entry',
        field: (err.meta?.target as string[])?.[0],
      });

    case 'P2025':
      // Record not found
      return res.status(404).json({
        error: 'Record not found',
      });

    case 'P2003':
      // Foreign key constraint
      return res.status(400).json({
        error: 'Invalid reference',
        message: 'The referenced record does not exist',
      });

    case 'P2014':
      // Required relation violation
      return res.status(400).json({
        error: 'Operation not allowed',
        message: 'Required relations are missing',
      });

    default:
      logger.error('[Prisma Error]', {
        code: err.code,
        message: err.message,
        meta: err.meta,
      });

      return res.status(500).json({
        error: 'Database operation failed',
      });
  }
}