/**
 * lib/tracing.ts
 *
 * OpenTelemetry distributed tracing setup.
 *
 * When OTEL_EXPORTER_OTLP_ENDPOINT is set, traces are exported to the
 * configured OTLP endpoint (Jaeger, Tempo, Datadog Agent, etc.).
 * When absent, tracing is initialised but traces are not exported (dev mode).
 *
 * Trace ID is propagated into every Pino log line via the logger middleware,
 * enabling correlation between traces and logs.
 *
 * Activation:
 *   OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318   (Jaeger / Tempo)
 *   OTEL_SERVICE_NAME=global-wakili-api                 (optional override)
 *   OTEL_ENABLED=true                                   (set to enable)
 *
 * IMPORTANT: This file must be imported BEFORE any other application code.
 * Import it as the very first line of server.ts.
 *
 * Gap 019 — Production Infrastructure.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

let sdk: NodeSDK | null = null;

export function initTracing(): void {
  if (process.env.OTEL_ENABLED !== 'true') {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[TRACING] OpenTelemetry disabled (set OTEL_ENABLED=true to enable)');
    }
    return;
  }

  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
  const serviceName = process.env.OTEL_SERVICE_NAME?.trim() || 'global-wakili-api';

  // Set service name via env var (NodeSDK reads OTEL_SERVICE_NAME automatically)
  process.env.OTEL_SERVICE_NAME = process.env.OTEL_SERVICE_NAME ?? serviceName;

  sdk = new NodeSDK({
    traceExporter: endpoint
      ? new OTLPTraceExporter({ url: `${endpoint}/v1/traces` })
      : undefined,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
      }),
    ],
  });

  sdk.start();

  console.info(`[TRACING] OpenTelemetry started — service: ${serviceName}${endpoint ? `, exporter: ${endpoint}` : ' (no exporter — dev mode)'}`);;

  process.on('SIGTERM', async () => {
    await sdk?.shutdown().catch((err) =>
      console.error('[TRACING] Shutdown error', err),
    );
  });
}

/**
 * Returns the current active trace ID for injection into log records.
 * Returns null when tracing is disabled or no active span exists.
 */
export function getCurrentTraceId(): string | null {
  try {
    const { trace, context } = require('@opentelemetry/api');
    const span = trace.getActiveSpan();
    if (!span) return null;
    const ctx = span.spanContext();
    return ctx.traceId ?? null;
  } catch {
    return null;
  }
}
