export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(message: string, opts?: { statusCode?: number; code?: string; details?: unknown; isOperational?: boolean }) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = 'AppError';
    this.statusCode = opts?.statusCode ?? 500;
    this.code = opts?.code ?? 'INTERNAL_ERROR';
    this.details = opts?.details;
    this.isOperational = opts?.isOperational ?? true;

    Error.captureStackTrace(this);
  }
}