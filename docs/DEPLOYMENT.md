# Deployment Guide — Global Wakili Legal Enterprise

## Prerequisites

- Node.js 20+
- PostgreSQL (Neon Serverless recommended for production)
- Redis (for BullMQ workers and rate limiter)
- Domain with SSL certificate

---

## Environment Variables

Copy `.env.example` to `.env` and configure all variables.

### Required for Go-Live

```bash
# Database
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require

# Auth
JWT_SECRET=<minimum 32 chars, strong random>
JWT_REFRESH_SECRET=<minimum 32 chars, strong random>

# Redis
REDIS_URL=redis://user:pass@host:6379

# CORS (production must be explicit domain)
CORS_ORIGIN=https://app.globalwakili.co.ke

# Document storage
DOCUMENT_STORAGE_PROVIDER=s3
DOCUMENT_S3_BUCKET=global-wakili-documents
DOCUMENT_S3_REGION=us-east-1
DOCUMENT_MALWARE_SCAN_REQUIRED=true
VIRUSTOTAL_API_KEY=<your-key>

# Email
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=<user>
SMTP_PASS=<pass>
NOTIFICATION_FROM_EMAIL=noreply@globalwakili.co.ke

# SMS (Africa's Talking — Kenya primary)
AT_API_KEY=<your-key>
AT_USERNAME=<your-username>

# Push
FCM_PROJECT_ID=<project>
FCM_CLIENT_EMAIL=<service-account@project.iam.gserviceaccount.com>
FCM_PRIVATE_KEY=<pem-key>

# AI
ANTHROPIC_API_KEY=<your-key>

# M-PESA
MPESA_ENV=production
MPESA_CONSUMER_KEY=<key>
MPESA_CONSUMER_SECRET=<secret>
MPESA_SHORTCODE=<shortcode>
MPESA_PASSKEY=<passkey>
MPESA_CALLBACK_URL=https://api.globalwakili.co.ke/api/mpesa/callback

# eTIMS
ETIMS_BASE_URL=https://etims-api.kra.go.ke/etims-api/1.0
# Per-tenant: set via tenant.settings.etims in DB

# Document signing
DOCUMENT_SIGNING_SECRET=<minimum 32 chars>

# App
NODE_ENV=production
APP_URL=https://app.globalwakili.co.ke
PORT=3000
```

---

## Database Migration

```bash
# Deploy all pending migrations
npm run db:deploy

# Verify migration status
npm run db:status
```

**Never** run `prisma db push` in production — always use `prisma migrate deploy`.

---

## First-Time Setup

```bash
# 1. Seed platform RBAC
npm run seed:permissions -- <first-tenant-id>

# 2. Provision the first tenant
npm run provision:tenant -- <tenant-id> ENTERPRISE admin@lawfirm.co.ke

# 3. Reprovision all existing tenants (if migrating)
npm run provision:all -- --dry-run   # preview first
npm run provision:all                # run

# 4. Seed platform admin roles
# (done via PlatformSeedService.seedAccessControl in server startup)
```

---

## Starting the Application

### API Server
```bash
cd apps/api
npm run build
npm run start
# Or with PM2:
pm2 start dist/server.js --name "gw-api"
```

### Frontend
```bash
cd apps/web
npm run build
npm run start
# Or:
pm2 start "npm run start" --name "gw-web" --cwd apps/web
```

### Workers (start separately)
```bash
# Notification delivery worker
npm run worker:notifications

# Document retention worker (run via cron daily)
npm run worker:retention

# Passive time capture worker
npm run worker:passive-capture
```

---

## Health Check

```
GET /health
```

Returns `{ status: 'ok', timestamp, version }` when the API is running.

---

## Production Checklist

- [ ] All required env vars set (no `dev_key_change_in_production` values)
- [ ] `JWT_SECRET` is 32+ characters and random
- [ ] `CORS_ORIGIN` is set to production domain only
- [ ] `DOCUMENT_STORAGE_PROVIDER=s3` (not local)
- [ ] `DOCUMENT_MALWARE_SCAN_REQUIRED=true`
- [ ] Redis connected (`REDIS_URL` set)
- [ ] Database migrations deployed (`npm run db:status` shows all applied)
- [ ] First tenant provisioned
- [ ] Platform RBAC seeded
- [ ] Workers started (notifications, retention, passive-capture)
- [ ] SSL certificate active on API and frontend domains
- [ ] M-PESA callback URL publicly accessible
