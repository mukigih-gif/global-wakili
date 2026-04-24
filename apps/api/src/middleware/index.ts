import type { Express } from 'express';
import { requestContext } from './request-context';
import { requestLogger } from './request-logger';
import { rateLimiter } from './rate-limit';
import { rbac } from './rbac';

export function registerMiddlewares(app: Express): void {
  app.use(requestContext);
  app.use(requestLogger());
  app.use(rateLimiter());
  app.use(rbac());
}

export * from './request-context';
export * from './request-logger';
export * from './rate-limit';
export * from './rbac';
export * from './unified-tenancy';
export * from './global-error-handler';