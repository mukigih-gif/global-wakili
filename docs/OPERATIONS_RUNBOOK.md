# Operations Runbook — Global Wakili Legal Enterprise

## Health & Uptime Endpoints

```
GET /ping    → 200 "pong"           (lightweight — use for external uptime monitors)
GET /health  → 200 { status, service, environment, timestamp }
GET /metrics → Prometheus text format (requires METRICS_TOKEN bearer if configured)
```

- `/ping` — monitored by external uptime probe (Better Uptime / Pingdom / UptimeRobot). Alert if not 200 within 5 seconds.
- `/health` — monitored internally. Alert if HTTP ≠ 200 or response > 2s.
- `/metrics` — scraped by Prometheus every 15s. Alert on error rate > 1% or p95 > 500ms.

---

## Incident Response

### Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| P0 — Critical | System down, data loss risk, trust fund breach | 15 min |
| P1 — High | Core feature unavailable, security incident | 1 hour |
| P2 — Medium | Degraded functionality, integration failure | 4 hours |
| P3 — Low | Minor bug, UI issue | Next business day |

### P0 Incident Steps

1. Page on-call engineer immediately
2. Assess: is data at risk? Is trust accounting affected?
3. If trust breach suspected → follow TENANT_ISOLATION_RUNBOOK.md
4. If auth compromise → rotate `JWT_SECRET` and invalidate all sessions
5. Post status update within 30 minutes
6. Create PlatformIncident record in DB
7. Post-mortem within 48 hours

---

## Common Operations

### Provision a new tenant
```bash
npm run provision:tenant -- <tenantId> <BASIC|PRO|ENTERPRISE> <admin@email.com>
```

### Reprovision all tenants (after schema change)
```bash
npm run provision:all -- --dry-run   # always dry-run first
npm run provision:all
```

### Seed permissions for a tenant
```bash
npm run seed:permissions -- <tenantId>
```

### Start workers
```bash
npm run worker:notifications    # real-time notifications
npm run worker:retention        # document retention (daily cron)
npm run worker:passive-capture  # passive time capture
```

### Run document retention enforcement
```bash
DOCUMENT_RETENTION_YEARS=7 npm run worker:retention
```

---

## Database Operations

### Check migration status
```bash
npm run db:status
```

### Deploy pending migrations
```bash
npm run db:deploy
```

### Emergency read-only mode
Set `DOCUMENT_STORAGE_PROVIDER=local` and restart to prevent new uploads
during a storage incident.

---

## Trust Accounting Operations

### Check for overdrawn accounts
```sql
SELECT id, accountName, balance, tenantId
FROM "TrustAccount"
WHERE balance < 0
ORDER BY balance ASC;
```

### Reconciliation status
```sql
SELECT t.id, t.accountName, t.balance, r.bankBalance, r.variance, r.status
FROM "TrustAccount" t
LEFT JOIN "TrustReconciliation" r ON r.trustAccountId = t.id
WHERE r.status = 'FLAGGED'
ORDER BY r.createdAt DESC;
```

---

## Monitoring Checklist (Daily)

- [ ] `/health` returns 200
- [ ] No overdrawn trust accounts
- [ ] No FLAGGED reconciliations
- [ ] eTIMS submission queue empty (no stuck SUBMITTED invoices)
- [ ] M-PESA callback failures < 1%
- [ ] Worker processes running (notifications, retention, passive-capture)
- [ ] Redis connected (check `QUEUE_REDIS_READY` in logs)

---

## Log Locations

- API logs: stdout (structured JSON via Pino) → CloudWatch / Datadog / Loki
- Audit trail: `AuditLog` table in DB (tamper-evident hash chain)
- Worker logs: worker process stdout
- Document audit: `AuditLog` with `entityType = 'DOCUMENT'`
- AI audit: `AIPromptAudit` table
- Traces: Jaeger / Grafana Tempo (when `OTEL_ENABLED=true`)

Log aggregation configuration:
- **Grafana Loki:** set `LOKI_URL=http://your-loki:3100` — pino-loki transport activates automatically
- **CloudWatch:** configure log driver to stream stdout to a log group
- **Datadog:** install Datadog Agent; no code change required — JSON stdout is auto-parsed

---

## Production Secrets Rotation Procedure

Run before go-live and quarterly thereafter:

1. **JWT_SECRET** — generate: `openssl rand -hex 64`
   Restart API after change. All existing sessions are invalidated immediately.

2. **DOCUMENT_SIGNING_SECRET** — generate: `openssl rand -hex 64`
   Existing signed URLs will be invalidated. Warn users before rotating.

3. **M-PESA credentials** — rotate on Safaricom Daraja portal.
   Update `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`.

4. **ANTHROPIC_API_KEY** — rotate on console.anthropic.com.
   No downtime required — swap env var and restart.

5. **S3 access keys** — rotate via AWS IAM. Update `DOCUMENT_S3_ACCESS_KEY_ID` and
   `DOCUMENT_S3_SECRET_ACCESS_KEY`. Zero downtime if IAM role used instead.

6. **Database password** — rotate via Neon console.
   Update `DATABASE_URL`. Restart all services (API, workers).

7. **All others** (SMTP, AT, FCM, QuickBooks, Zoho) — rotate on respective portals,
   update env vars, restart workers.

Store all production secrets in a secrets manager (AWS Secrets Manager, Doppler, or Vault).
Never commit real credentials to git.

---

## Uptime Monitoring Setup

Configure an external probe to check `/ping` every 60 seconds:

- **Better Uptime:** Add monitor → URL: `https://api.globalwakili.co.ke/ping` → Expected: `pong` (200)
- **Pingdom:** HTTP check → `https://api.globalwakili.co.ke/ping` → Every 1 min
- **UptimeRobot:** HTTP(s) monitor → same URL
- **Alert:** Notify on-call engineer if down for > 2 consecutive checks

---

## Disaster Recovery

See `docs/DISASTER_RECOVERY.md` for RTO/RPO targets and recovery procedures.

### Quarterly DR Drill Checklist

- [ ] Create Neon point-in-time restore branch from 24 hours ago
- [ ] Connect branch to staging API instance
- [ ] Run: `DATABASE_URL=<branch-url> npm run test:integration`
- [ ] Spot-check 3 random tenant records for integrity
- [ ] Verify AuditLog hash chain is unbroken for last 100 entries
- [ ] Confirm restored branch serves `/health` correctly
- [ ] Document results in `docs/governance/DR_DRILL_<YYYY-MM-DD>.md`
- [ ] Delete restore branch after verification
