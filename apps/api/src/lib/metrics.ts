/**
 * lib/metrics.ts
 *
 * Prometheus metrics via prom-client.
 *
 * Exposed at: GET /metrics
 * Access: restricted to internal networks or a bearer token (METRICS_TOKEN env var)
 *
 * Default metrics: Node.js process metrics (heap, CPU, GC, event loop lag)
 * Custom metrics:
 *   http_requests_total         — request count by method, path, status
 *   http_request_duration_ms    — p50/p90/p95/p99 latency histogram
 *   active_tenants_count        — gauge (updated periodically)
 *   trust_overdraw_events_total — counter
 *   ai_executions_total         — counter by provider and scope
 *
 * Gap 019 — Production Infrastructure.
 */

import {
  Registry,
  collectDefaultMetrics,
  Counter,
  Histogram,
  Gauge,
} from 'prom-client';

export const registry = new Registry();
registry.setDefaultLabels({ app: 'global-wakili-api', env: process.env.NODE_ENV ?? 'development' });

// Collect Node.js default metrics (heap, CPU, GC, event loop)
collectDefaultMetrics({ register: registry });

// ── HTTP request metrics ──────────────────────────────────────────────────────

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests by method, route, and status code',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [registry],
});

export const httpRequestDurationMs = new Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
  registers: [registry],
});

// ── Business metrics ──────────────────────────────────────────────────────────

export const activeTenantsGauge = new Gauge({
  name: 'active_tenants_count',
  help: 'Number of active tenant subscriptions',
  registers: [registry],
});

export const trustOverdrawCounter = new Counter({
  name: 'trust_overdraw_events_total',
  help: 'Number of trust overdraw prevention events triggered',
  labelNames: ['tenantId'] as const,
  registers: [registry],
});

export const aiExecutionsTotal = new Counter({
  name: 'ai_executions_total',
  help: 'Total AI executions by provider and scope',
  labelNames: ['provider', 'scope', 'status'] as const,
  registers: [registry],
});

export const rateLimitEventsTotal = new Counter({
  name: 'rate_limit_events_total',
  help: 'Total rate limit exceeded events',
  registers: [registry],
});

export const notificationsDeliveredTotal = new Counter({
  name: 'notifications_delivered_total',
  help: 'Total notifications delivered by channel',
  labelNames: ['channel', 'status'] as const,
  registers: [registry],
});

// ── Request instrumentation middleware ────────────────────────────────────────

import type { Request, Response, NextFunction } from 'express';

export function metricsMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      // Normalize route — avoid cardinality explosion from IDs in paths
      const route = req.route?.path ?? req.path.replace(/\/[a-f0-9-]{20,}/gi, '/:id') ?? 'unknown';
      const labels = {
        method: req.method,
        route,
        status_code: String(res.statusCode),
      };

      httpRequestsTotal.inc(labels);
      httpRequestDurationMs.observe(labels, duration);
    });

    next();
  };
}
