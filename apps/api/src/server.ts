import http from 'http';
import app from './app';
import { connectPrisma, disconnectPrisma } from '@wakili/database';

const PORT = Number(process.env.PORT || 4000);
const SHUTDOWN_TIMEOUT_MS = 30_000;

async function bootstrap() {
  try {
    await connectPrisma();
    console.info('✔ Database connection established');

    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.info(`✔ API Server running on http://localhost:${PORT}`);
    });

    const shutdown = async (signal?: string) => {
      console.info(`Received ${signal ?? 'shutdown'} - closing server`);
      server.close(async (err) => {
        if (err) {
          console.error('Error while closing server', err);
          process.exit(1);
        }
        try {
          await disconnectPrisma();
          console.info('✔ Database disconnected. Process terminated.');
          process.exit(0);
        } catch (e) {
          console.error('Error during disconnectPrisma', e);
          process.exit(1);
        }
      });

      setTimeout(() => {
        console.warn('Forcing shutdown after timeout');
        process.exit(1);
      }, SHUTDOWN_TIMEOUT_MS).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('uncaughtException', (err) => {
      console.error('Uncaught exception, shutting down', err);
      shutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled rejection, shutting down', reason);
      shutdown('unhandledRejection');
    });
  } catch (error) {
    console.error('✘ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();