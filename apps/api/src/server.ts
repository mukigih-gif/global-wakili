import http from 'http';

import app from './app';
import { env } from './config/env';
import { connectPrisma, disconnectPrisma } from '@global-wakili/database';
import { connectRedis, disconnectRedis } from './config/redis';

const SHUTDOWN_TIMEOUT_MS = 30_000;

async function bootstrap(): Promise<void> {
  await connectPrisma();
  await connectRedis();

  const server = http.createServer(app);

  server.listen(env.PORT, () => {
    console.info(`✔ Global Wakili API listening on port ${env.PORT}`);
  });

  const gracefulShutdown = async (signal: string): Promise<void> => {
    console.info(`${signal} received. Commencing graceful shutdown.`);

    server.close(async (serverError) => {
      if (serverError) {
        console.error('HTTP server close failed', serverError);
        process.exit(1);
      }

      try {
        await Promise.allSettled([disconnectRedis(), disconnectPrisma()]);
        console.info('✔ Infrastructure disconnected. Shutdown complete.');
        process.exit(0);
      } catch (disconnectError) {
        console.error('Shutdown disconnect failed', disconnectError);
        process.exit(1);
      }
    });

    setTimeout(() => {
      console.error('Graceful shutdown timeout exceeded. Forcing exit.');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();
  };

  process.on('SIGTERM', () => {
    void gracefulShutdown('SIGTERM');
  });

  process.on('SIGINT', () => {
    void gracefulShutdown('SIGINT');
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception', error);
    void gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection', reason);
    void gracefulShutdown('unhandledRejection');
  });
}

bootstrap().catch((error) => {
  console.error('✘ Failed to bootstrap application', error);
  process.exit(1);
});