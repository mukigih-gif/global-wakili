import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import v1Router from './routes/v1';
import superAdminRouter from './routes/superAdmin';
import { registerMiddlewares } from './middleware';
import { tenancyMiddleware } from './middleware/tenancy';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();

// Security and performance
app.use(helmet());
app.use(compression());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*' }));

// Body parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Register core middlewares (correlation id, request logger, rate limiter, validation, auth, rbac)
registerMiddlewares(app);

// Tenancy middleware must run after auth so req.user is available
app.use(tenancyMiddleware());

// Mount super-admin router on a separate path with its own guard
app.use('/api/v1/super', superAdminRouter);

// Mount tenant-scoped API
app.use('/api/v1', v1Router);

// Health endpoint (lightweight)
app.get('/health', (_req, res) => res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() }));

// 404 and error handlers (last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;