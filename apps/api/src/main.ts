import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import * as dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// 1. Initialize Environment from ROOT .env
// This MUST happen before any other imports that use process.env
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Internal Workspace Imports
import loggerMiddleware from './middleware/logger.middleware';
import { authRouter } from './controllers/auth.controller';
import { registryRouter } from './controllers/registry.controller';
import { authMiddleware } from './middleware/auth.middleware';

// Note: Imported as 'errorHandler' to match your production-grade file naming
import { errorHandler } from '../../../packages/core/exceptions/ErrorHandler';
import { prisma } from '@wakili/database';

const app = express();

// Trust proxy if behind a Digital Ocean load balancer
app.set('trust proxy', 1);

// 2. Security & Standard Middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false 
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
  credentials: true,
}));

app.use(loggerMiddleware);
app.use(express.json({ limit: '2mb' }));

// 3. Rate Limiting (DDoS Protection)
const publicLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, 
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "Too many requests, please try again later.", code: "TOO_MANY_REQUESTS" } }
});
app.use(publicLimiter);

// 4. Routes
// Public Auth (Registration/Login)
app.use('/api/v1/auth', authRouter);

// Protected Registry (Requires valid JWT + Tenant ID)
app.use('/api/v1/registry', authMiddleware, registryRouter);

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: "Services Online",
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// 5. Final Error Interceptor (MUST be last)
// Using your high-grade error handler
app.use(errorHandler);

// 6. Server Lifecycle & Graceful Shutdown
const PORT = Number(process.env.PORT || 4000);
const server = app.listen(PORT, () => {
  console.log(`
  --------------------------------------------------
  🚀 GLOBAL WAKILI GATEWAY ACTIVE
  📍 Port: ${PORT}
  🌍 Mode: ${process.env.NODE_ENV || 'development'}
  --------------------------------------------------
  `);
});

async function shutdown(signal: string) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async (err?: Error) => {
    if (err) {
      console.error('Error closing server', err);
      process.exit(1);
    }
    try {
      await prisma.$disconnect();
      console.log('✅ Prisma disconnected.');
      process.exit(0);
    } catch (e) {
      console.error('❌ Error during database disconnection', e);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));