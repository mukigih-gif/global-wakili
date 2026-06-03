/**
 * lib/logger.ts
 *
 * Structured application logger — Pino with optional Loki transport.
 *
 * When LOKI_URL is set: ships logs to Grafana Loki in real time.
 * Otherwise: writes structured JSON to stdout (CloudWatch/Datadog pick this up).
 *
 * Every log record includes:
 *   - level, timestamp, message
 *   - service, environment
 *   - traceId (from OpenTelemetry active span, when available)
 *
 * Activation:
 *   LOKI_URL=http://localhost:3100   — Grafana Loki endpoint
 *   LOKI_LABELS=app=global-wakili,env=production  — optional label overrides
 *
 * Gap 019 — Production Infrastructure.
 */

import pino from 'pino';
import { getCurrentTraceId } from './tracing';

const SERVICE  = 'global-wakili-api';
const ENV      = process.env.NODE_ENV ?? 'development';
const LOKI_URL = process.env.LOKI_URL?.trim();

function buildMixins() {
  return () => ({
    service: SERVICE,
    environment: ENV,
    traceId: getCurrentTraceId() ?? undefined,
  });
}

function buildTransport() {
  if (LOKI_URL) {
    const lokiLabels: Record<string, string> = { app: SERVICE, env: ENV };

    // Parse optional LOKI_LABELS=key=value,key2=value2
    const rawLabels = process.env.LOKI_LABELS?.trim();
    if (rawLabels) {
      rawLabels.split(',').forEach((pair) => {
        const [k, v] = pair.split('=');
        if (k && v) lokiLabels[k.trim()] = v.trim();
      });
    }

    console.info(`[LOGGER] Loki transport active → ${LOKI_URL}`);

    return {
      target: 'pino-loki',
      options: {
        host: LOKI_URL,
        labels: lokiLabels,
        replaceTimestamp: true,
        ignoredKeys: ['pid', 'hostname'],
        levelMap: {
          trace: 'debug',
          debug: 'debug',
          info: 'info',
          warn: 'warning',
          error: 'error',
          fatal: 'critical',
        },
      },
    };
  }

  // Stdout — pretty in dev, JSON in production (CloudWatch / Datadog compatible)
  if (ENV !== 'production') {
    return {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
    };
  }

  return undefined;
}

const transport = buildTransport();

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? (ENV === 'production' ? 'info' : 'debug'),
    base: { service: SERVICE, env: ENV },
    mixin: buildMixins(),
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.secret', '*.token'],
      censor: '[REDACTED]',
    },
  },
  transport ? pino.transport(transport as any) : undefined,
);

export default logger;
