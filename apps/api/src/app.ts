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
import { metricsMiddleware, registry } from './lib/metrics';

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
    // In production: require CORS_ORIGIN to be explicitly configured.
    // origin: true with credentials: true allows ANY website to make
    // authenticated cross-origin requests — a credentialed CORS bypass.
    // In development: allow all origins for localhost convenience.
    origin: (() => {
      if (env.CORS_ORIGIN && env.CORS_ORIGIN.length > 0) return env.CORS_ORIGIN;
      return env.NODE_ENV === 'production' ? false : true;
    })(),
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
app.use(metricsMiddleware());

// /ping — lightweight uptime probe (no DB, no auth, minimal latency)
// Used by external uptime monitors (Better Uptime, Pingdom, UptimeRobot)
app.get('/ping', (_req: Request, res: Response) => {
  res.status(200).send('pong');
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    service: 'global-wakili-api',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Prometheus metrics endpoint — restrict to internal access in production
app.get('/metrics', async (req: Request, res: Response) => {
  const token = process.env.METRICS_TOKEN?.trim();
  if (token) {
    const auth = req.headers.authorization ?? '';
    if (auth !== `Bearer ${token}`) {
      res.status(403).json({ error: 'Metrics access denied' });
      return;
    }
  }
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});

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

app.use('/api/v1/auth', authRouter);
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

  // Preserve a coded error's own `code`/`details` on <500 (client) responses so
  // callers learn WHY a request failed (e.g. POSTING_POLICY_VIOLATION + the
  // PostingPolicyService issues, PERIOD_CLOSED) instead of an opaque
  // REQUEST_FAILED — FINDING-FIN-C-002. 5xx still hide all internals.
  const errCode =
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code?: unknown }).code === 'string'
      ? (err as { code: string }).code
      : undefined;
  const errDetails =
    typeof err === 'object' && err !== null && 'details' in err
      ? (err as { details?: unknown }).details
      : undefined;

  if (statusCode >= 500) {
    console.error('UNHANDLED_ERROR', { requestId: req.id, path: req.originalUrl, method: req.method, err });
  }

  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal Server Error' : message,
    code: statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : (errCode ?? 'REQUEST_FAILED'),
    ...(statusCode < 500 && errDetails !== undefined ? { details: errDetails } : {}),
    requestId: req.id,
  });
});

export default app;