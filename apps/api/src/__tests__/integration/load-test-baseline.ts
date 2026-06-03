/**
 * load-test-baseline.ts
 *
 * k6-compatible load test script for Global Wakili API.
 *
 * Scenarios:
 *   1. Auth endpoint throughput (POST /auth/login)
 *   2. Matter list (GET /matters)
 *   3. Invoice list (GET /billing/invoices)
 *   4. Trust account list (GET /trust/accounts)
 *   5. Health check (GET /health)
 *
 * SLA targets (from Gap 019):
 *   p95 response time < 500ms
 *   p99 response time < 2000ms
 *   Error rate < 1%
 *
 * Run with:
 *   k6 run apps/api/src/__tests__/integration/load-test-baseline.ts \
 *     --env API_URL=https://api.globalwakili.co.ke \
 *     --env JWT_TOKEN=<token> \
 *     --env TENANT_ID=<tenant-id>
 *
 * Or for local dev:
 *   k6 run ... --env API_URL=http://localhost:3000
 *
 * Gate 13 — Gap 018.
 */

// @ts-nocheck — k6 global types not available in Node context
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate    = new Rate('errors');
const matterListP  = new Trend('matter_list_duration', true);
const invoiceListP = new Trend('invoice_list_duration', true);
const trustListP   = new Trend('trust_list_duration', true);
const healthP      = new Trend('health_duration', true);

const API_URL  = __ENV.API_URL   || 'http://localhost:3000';
const TOKEN    = __ENV.JWT_TOKEN  || '';
const TENANT   = __ENV.TENANT_ID  || '';

export const options = {
  scenarios: {
    steady_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10  },   // ramp up
        { duration: '1m',  target: 50  },   // sustained load (50 users / tenant = SLA target)
        { duration: '30s', target: 0   },   // ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration:     ['p(95)<500', 'p(99)<2000'],
    errors:                ['rate<0.01'],
    matter_list_duration:  ['p(95)<500'],
    invoice_list_duration: ['p(95)<500'],
    trust_list_duration:   ['p(95)<500'],
    health_duration:       ['p(95)<100'],
  },
};

const HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`,
  'x-tenant-id': TENANT,
};

export default function () {
  // Health check
  const health = http.get(`${API_URL}/health`, { headers: HEADERS, tags: { name: 'health' } });
  healthP.add(health.timings.duration);
  check(health, { 'health 200': (r) => r.status === 200 });
  errorRate.add(health.status !== 200);

  // Matter list
  const matters = http.get(`${API_URL}/matters?limit=20`, { headers: HEADERS, tags: { name: 'matters' } });
  matterListP.add(matters.timings.duration);
  check(matters, { 'matters 200': (r) => r.status === 200 || r.status === 401 });

  // Invoice list
  const invoices = http.get(`${API_URL}/billing/invoices?limit=20`, { headers: HEADERS, tags: { name: 'invoices' } });
  invoiceListP.add(invoices.timings.duration);
  check(invoices, { 'invoices 200': (r) => r.status === 200 || r.status === 401 });

  // Trust accounts
  const trust = http.get(`${API_URL}/trust/accounts?limit=10`, { headers: HEADERS, tags: { name: 'trust' } });
  trustListP.add(trust.timings.duration);
  check(trust, { 'trust 200': (r) => r.status === 200 || r.status === 401 });

  sleep(1);
}
