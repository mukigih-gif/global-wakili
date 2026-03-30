import pino from 'pino';
import pinoHttp from 'pino-http';
import { v4 as uuidv4 } from 'uuid';

const isProd = process.env.NODE_ENV === 'production';

const transport = !isProd
  ? pino.transport({
      target: 'pino-pretty',
      options: { colorize: true, singleLine: false, translateTime: 'SYS:standard' },
    })
  : undefined;

const baseLogger = transport ? pino({ level: process.env.LOG_LEVEL ?? 'debug' }, transport) : pino({
  level: process.env.LOG_LEVEL ?? 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
});

const pinoMiddleware = pinoHttp({
  logger: baseLogger,
  genReqId: (req: any) => req.headers['x-request-id'] || uuidv4(),
  customProps: (req: any) => ({ requestId: req.id, tenantId: (req as any).tenantId ?? null }),
});

export function loggerMiddleware(req: any, res: any, next: any) {
  if (!req.headers['x-request-id']) req.headers['x-request-id'] = uuidv4();
  pinoMiddleware(req, res, () => {
    req.log = req.log || baseLogger.child({ requestId: req.id, route: `${req.method} ${req.path}` });
    next();
  });
}

export const logger = baseLogger;
export default loggerMiddleware;