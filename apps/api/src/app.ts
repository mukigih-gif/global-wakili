import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';

import { env } from './config/env';
import apiV1Router from './routes/index';
import { authRouter } from './controllers/auth.controller';

import { unifiedTenancy } from './middleware/unified-tenancy';
import { requestContext } from './middleware/request-context';
import { requestLogger } from './middleware/request-logger';
import { rateLimiter } from './middleware/rate-limit';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
  }),
);

app.use(compression());

app.use(
  cors({
    origin: env.CORS_ORIGIN && env.CORS_ORIGIN.length > 0 ? env.CORS_ORIGIN : true,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-request-id'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));

app.use(requestContext);
app.use(requestLogger());
app.use(rateLimiter());

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    service: 'global-wakili-api',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Public API health endpoint.
 *
 * This must be mounted before unifiedTenancy so infrastructure probes,
 * load balancers, and local smoke tests can verify the API without auth.
 */
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    scope: 'api-v1',
    status: 'available',
    service: 'global-wakili-api',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Public module health probe.
 *
 * This does not expose business data. It only confirms that the API can
 * acknowledge a module namespace while deeper module implementation continues.
 */
app.get('/api/v1/:module/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: req.params.module,
    status: 'mounted',
    service: 'global-wakili-api',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Public auth routes.
 *
 * These must remain outside unifiedTenancy because registration creates
 * the tenant and login may resolve tenant context from credentials.
 */
app.use('/api/v1/auth', authRouter);

/**
 * Protected tenant-scoped business routes.
 */
app.use('/api/v1', unifiedTenancy, apiV1Router);

/**
 * Protected tenant-scoped business routes.
 */
app.use('/api/v1', unifiedTenancy, apiV1Router);

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    code: 'NOT_FOUND',
  });
});

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const statusCode =
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    typeof (err as { statusCode?: unknown }).statusCode === 'number'
      ? (err as { statusCode: number }).statusCode
      : typeof err === 'object' &&
          err !== null &&
          'status' in err &&
          typeof (err as { status?: unknown }).status === 'number'
        ? (err as { status: number }).status
        : 500;

  const message =
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as { message?: unknown }).message === 'string'
      ? (err as { message: string }).message
      : 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    code: statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_FAILED',
    requestId: req.id,
  });
});

export default app;