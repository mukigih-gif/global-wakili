import { RequestHandler } from 'express';

export default function requestLogger(): RequestHandler {
  return (req, res, next) => {
    const start = Date.now();
    const requestId = req.headers['x-request-id'] ?? null;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const meta = {
        requestId,
        method: req.method,
        path: req.originalUrl || req.url,
        status: res.statusCode,
        durationMs: duration,
        ip: req.ip
      };
      if (res.statusCode >= 500) {
        console.error('request', meta);
      } else if (res.statusCode >= 400) {
        console.warn('request', meta);
      } else {
        console.info('request', meta);
      }
    });

    next();
  };
}