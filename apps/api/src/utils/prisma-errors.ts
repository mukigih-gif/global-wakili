import { Prisma } from '@prisma/client';

type NormalizedPrismaError = {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
};

export function normalizePrismaError(error: unknown): NormalizedPrismaError | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return {
          statusCode: 409,
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
          message: 'A record with the same unique value already exists.',
          details: error.meta,
        };

      case 'P2003':
        return {
          statusCode: 409,
          code: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
          message: 'The requested change violates a related record constraint.',
          details: error.meta,
        };

      case 'P2025':
        return {
          statusCode: 404,
          code: 'RECORD_NOT_FOUND',
          message: 'The requested record was not found.',
          details: error.meta,
        };

      default:
        return {
          statusCode: 400,
          code: `PRISMA_${error.code}`,
          message: 'A database request error occurred.',
          details: error.meta,
        };
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      statusCode: 400,
      code: 'PRISMA_VALIDATION_ERROR',
      message: 'The database request failed validation.',
    };
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      statusCode: 500,
      code: 'PRISMA_INITIALIZATION_ERROR',
      message: 'The database client failed to initialize.',
    };
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return {
      statusCode: 500,
      code: 'PRISMA_ENGINE_PANIC',
      message: 'The database engine encountered a fatal error.',
    };
  }

  return null;
}