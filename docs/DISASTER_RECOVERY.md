# Disaster Recovery Plan — Global Wakili Legal Enterprise

## Objectives

| Metric | Target |
|--------|--------|
| RTO (Recovery Time Objective) | < 4 hours for P0 incidents |
| RPO (Recovery Point Objective) | < 1 hour (continuous backup via Neon) |

---

## Backup Strategy

### Database (Neon Serverless)
- Neon provides continuous WAL-based backups with point-in-time recovery (PITR)
- PITR window: 7 days (configurable up to 30 days on paid plans)
- No additional backup configuration required for Neon

### Document Storage (S3)
- Enable S3 Versioning on `DOCUMENT_S3_BUCKET`
- Enable S3 Cross-Region Replication to a secondary region
- Lifecycle policy: retain all versions for 7 years (Kenya Advocates Act)

### Application Config
- All env vars stored in a secrets manager (AWS Secrets Manager / Doppler)
- Config backed up out-of-band weekly

---

## Recovery Procedures

### Scenario 1: Database Corruption / Accidental Deletion

1. Identify the last known good timestamp
2. In Neon console: Project → Branches → Restore to point in time
3. Connect restored branch to staging environment first
4. Verify data integrity:
   - Check AuditLog hash chain: `verifyHashChain(recentLogs)`
   - Spot-check trust account balances
   - Verify 5 random invoices against journal entries
5. If verified, promote restored branch to production
6. Restart API (updates connection string)
7. Notify affected tenants

### Scenario 2: API Server Failure

1. Check server logs for startup errors
2. Verify environment variables are correct (especially `DATABASE_URL`, `JWT_SECRET`)
3. Verify Redis is accessible: `redis-cli -u $REDIS_URL ping`
4. Restart: `pm2 restart gw-api`
5. If persistent: deploy to backup server and update DNS

### Scenario 3: S3 Document Storage Failure

1. Check AWS S3 service health
2. For reads: serve from S3 replica or enable local fallback temporarily:
   `DOCUMENT_STORAGE_PROVIDER=local` (read-only mode — no new uploads)
3. For writes: queue uploads to a local buffer, sync once S3 is restored
4. Update `DOCUMENT_S3_BUCKET` to replica bucket if primary is unavailable

### Scenario 4: Redis Failure

1. Workers will fail gracefully — BullMQ falls back to noop queue in dev;
   in production, jobs are lost until Redis is restored
2. Restart Redis: `sudo systemctl restart redis`
3. Restart workers: `pm2 restart gw-worker-notifications gw-worker-passive`
4. Note: pending notification jobs may need to be re-triggered manually

### Scenario 5: Trust Accounting Discrepancy

1. Immediately suspend new trust transactions:
   Set `TRUST_WRITE_LOCK=true` in env and restart API
2. Run reconciliation report:
   ```sql
   SELECT id, accountName, balance FROM "TrustAccount" WHERE balance < 0;
   ```
3. Contact affected law firm partners
4. Engage Law Society of Kenya if amounts exceed regulatory thresholds
5. Restore from Neon PITR to the last clean reconciliation timestamp
6. Document the incident in PlatformIncident table

---

## Backup Verification (Quarterly Drill)

1. Create a Neon branch from 24 hours ago
2. Connect the branch to a staging API instance
3. Run: `npm run test:integration` against staging DB
4. Verify 3 random tenant records are intact
5. Verify AuditLog hash chain is unbroken
6. Document results in `docs/governance/DR_DRILL_<date>.md`

---

## Key Contacts

| Role | Responsibility |
|------|---------------|
| Platform Engineer (on-call) | API, DB, workers |
| DevOps Engineer | Infrastructure, DNS, SSL |
| Finance Engineer | Trust accounting discrepancies |
| Legal Compliance Officer | Law Society notification |
