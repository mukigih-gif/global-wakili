# Operations Runbook — Global Wakili Legal Enterprise

## Health Check

```
GET /health
Response: { status: "ok", timestamp: "...", version: "..." }
```

Alert if HTTP status ≠ 200 or response time > 2s.

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

- API logs: stdout (structured JSON via Pino)
- Audit trail: `AuditLog` table in DB
- Worker logs: worker process stdout
- Document audit: `AuditLog` with `entityType = 'DOCUMENT'`
- AI audit: `AIPromptAudit` table

---

## Disaster Recovery

See `docs/DISASTER_RECOVERY.md` for RTO/RPO targets and recovery procedures.
