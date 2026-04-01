import { Express } from 'express';
import correlationId from './correlationId';
import requestLogger from './requestLogger';
import { authMiddleware } from './auth';
import rbacMiddleware from './rbac';
import rateLimiter from './rateLimiter';
import { validationMiddleware } from './validation';
import { errorHandler, notFoundHandler } from './errorHandler';

export function registerMiddlewares(app: Express) {
  app.use(correlationId());
  app.use(requestLogger());
  app.use(rateLimiter());
  app.use(validationMiddleware());
  app.use(authMiddleware);
  app.use(rbacMiddleware);
}

export { errorHandler, notFoundHandler };