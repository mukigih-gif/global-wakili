import { PrismaClient, SecureTokenType, TenantRole } from '@prisma/client';

/*
 * 19_security.seed.ts — Per-tenant security-domain layer (CLAUDE.md §12).
 *
 * Unblocked once FINDING-007-011 (role/permission unification) closed — this layer
 * deliberately sequences AFTER it so fixtures aren't baked against a permission
 * system that was being restructured.
 *
 * Seeds the security-domain models NOT owned by other layers:
 *   - Session        — active login sessions (session-enforcement fixtures)
 *   - MfaSecret      — MFA enrolment for the admin (F-17 fixtures)
 *   - SecureToken    — password-reset / invite / verify tokens (reset-flow fixtures)
 *   - ApiKey         — one tenant API key (API-auth fixtures)
 *   - ConsentRecord  — KDPA consent rows
 *   - RateLimitLog   — sample rate-limit windows (normal + exceeded)
 *
 * NOT touched here (owned elsewhere):
 *   - Role / Permission  → 00_bootstrap (CANONICAL_ROLES + catalog)
 *   - AuditLog           → 16_reporting (hash-chained per ADR-003; re-seeding would
 *                          break previousHash continuity)
 *
 * Honesty (ADR-011): all tokens/keys/secrets are NON-functional seed placeholders
 * (deterministic hashes, not real credentials).
 *
 * DEMO/FIXTURE data — run only under the master demo-data gate.
 *
 * Policy:
 * - Idempotent: unique-keyed rows skip-if-exists on their deterministic key
 *   (sessionToken / tokenHash / apiKey.prefix), MfaSecret upsert by userId,
 *   ConsentRecord/RateLimitLog skip on (tenantId + natural key).
 * - Tenant-scoped. No schema changes, no destructive operations.
 */

type SeedPrisma = PrismaClient;

export type SecuritySeedResult = {
  status: 'security_seed_complete';
  tenantId: string;
  sessions: number;
  mfaSecrets: number;
  secureTokens: number;
  apiKeys: number;
  consentRecords: number;
  rateLimitLogs: number;
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

async function resolveUsers(
  prisma: SeedPrisma,
  tenantId: string,
): Promise<{ admin: { id: string; email: string | null }; users: { id: string; email: string | null }[] }> {
  const users = await prisma.user.findMany({
    where: { tenantId, status: 'ACTIVE' },
    select: { id: true, email: true, tenantRole: true },
    orderBy: { createdAt: 'asc' },
    take: 5,
  });
  if (users.length === 0) {
    throw new Error(`seedSecurity: no active user for tenant ${tenantId}. Run 02_users first.`);
  }
  const admin = users.find((u) => u.tenantRole === TenantRole.FIRM_ADMIN) ?? users[0];
  return { admin, users };
}

export async function seedSecurity(prisma: PrismaClient, tenantId: string): Promise<SecuritySeedResult> {
  if (!tenantId || tenantId.trim().length === 0) {
    throw new Error('seedSecurity requires a tenantId.');
  }

  const { admin, users } = await resolveUsers(prisma, tenantId);
  const now = new Date();
  const tag = tenantId.slice(-6);
  const sessionUsers = users.slice(0, 2);

  // 1. Sessions — one active session per (up to) 2 users.
  for (const u of sessionUsers) {
    const ut = u.id.slice(-6);
    const sessionToken = `sess-seed-${tag}-${ut}`;
    const existing = await prisma.session.findFirst({ where: { sessionToken }, select: { id: true } });
    if (!existing) {
      await prisma.session.create({
        data: {
          userId: u.id,
          tenantId,
          sessionToken,
          refreshToken: `rtok-seed-${tag}-${ut}`,
          expiresAt: new Date(now.getTime() + 8 * HOUR),
          lastActivityAt: now,
          lastActivityType: 'SEED_FIXTURE',
          ipAddress: '127.0.0.1',
          userAgent: 'GlobalWakiliSeed/1.0',
          location: 'Nairobi, KE',
        },
      });
    }
  }

  // 2. MfaSecret — admin enrolled (non-functional placeholder secret + backup codes).
  await prisma.mfaSecret.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      totpSecret: `SEED-TOTP-${tag}`,
      totpVerified: true,
      backupCodes: `seed-backup-codes-hashed-${tag}`,
      recoveryEmail: admin.email,
    },
  });

  // 3. SecureToken — one active reset, one active invite, one consumed verify (all placeholder hashes).
  const tokenSeeds: { type: SecureTokenType; suffix: string; expiresAt: Date; usedAt: Date | null }[] = [
    { type: SecureTokenType.PASSWORD_RESET, suffix: 'reset', expiresAt: new Date(now.getTime() + HOUR), usedAt: null },
    { type: SecureTokenType.EMAIL_INVITE, suffix: 'invite', expiresAt: new Date(now.getTime() + DAY), usedAt: null },
    { type: SecureTokenType.EMAIL_VERIFY, suffix: 'verify', expiresAt: new Date(now.getTime() - HOUR), usedAt: new Date(now.getTime() - 2 * HOUR) },
  ];
  for (const t of tokenSeeds) {
    const tokenHash = `seed-tokenhash-${tag}-${t.suffix}`;
    const existing = await prisma.secureToken.findFirst({ where: { tokenHash }, select: { id: true } });
    if (!existing) {
      await prisma.secureToken.create({
        data: { userId: admin.id, tenantId, type: t.type, tokenHash, expiresAt: t.expiresAt, usedAt: t.usedAt },
      });
    }
  }

  // 4. ApiKey — one tenant key (non-functional placeholder hash/prefix).
  const prefix = `gwk_${tag}`;
  const existingKey = await prisma.apiKey.findFirst({ where: { prefix }, select: { id: true } });
  if (!existingKey) {
    await prisma.apiKey.create({
      data: {
        tenantId,
        name: 'Seed Integration Key',
        description: 'Non-functional seed fixture API key',
        keyHash: `seed-apikey-hash-${tag}`,
        prefix,
        scopes: ['read:matters', 'read:clients'],
        rateLimit: 1000,
        isActive: true,
      },
    });
  }

  // 5. ConsentRecord — KDPA data-processing consent per (up to) 2 users.
  for (const u of sessionUsers) {
    const consentType = 'DATA_PROCESSING';
    const existing = await prisma.consentRecord.findFirst({ where: { tenantId, userId: u.id, consentType }, select: { id: true } });
    if (!existing) {
      await prisma.consentRecord.create({
        data: {
          tenantId,
          userId: u.id,
          consentType,
          version: '1.0',
          isGranted: true,
          ipAddress: '127.0.0.1',
          userAgent: 'GlobalWakiliSeed/1.0',
        },
      });
    }
  }

  // 6. RateLimitLog — one normal window + one exceeded window (login endpoint).
  const rlSeeds = [
    { endpoint: '/api/v1/auth/login', method: 'POST', requestCount: 3, limitExceeded: false, userId: admin.id },
    { endpoint: '/api/v1/auth/login', method: 'POST', requestCount: 25, limitExceeded: true, userId: null as string | null },
  ];
  for (const rl of rlSeeds) {
    const existing = await prisma.rateLimitLog.findFirst({
      where: { tenantId, endpoint: rl.endpoint, limitExceeded: rl.limitExceeded },
      select: { id: true },
    });
    if (!existing) {
      await prisma.rateLimitLog.create({
        data: {
          tenantId,
          userId: rl.userId,
          ipAddress: '127.0.0.1',
          endpoint: rl.endpoint,
          method: rl.method,
          requestCount: rl.requestCount,
          windowStart: new Date(now.getTime() - 5 * 60 * 1000),
          windowEnd: now,
          limitExceeded: rl.limitExceeded,
        },
      });
    }
  }

  const [sessions, mfaSecrets, secureTokens, apiKeys, consentRecords, rateLimitLogs] = await Promise.all([
    prisma.session.count({ where: { tenantId, sessionToken: { startsWith: `sess-seed-${tag}` } } }),
    prisma.mfaSecret.count({ where: { userId: admin.id } }),
    prisma.secureToken.count({ where: { tenantId, tokenHash: { startsWith: `seed-tokenhash-${tag}` } } }),
    prisma.apiKey.count({ where: { tenantId, prefix } }),
    prisma.consentRecord.count({ where: { tenantId, consentType: 'DATA_PROCESSING' } }),
    prisma.rateLimitLog.count({ where: { tenantId, endpoint: '/api/v1/auth/login' } }),
  ]);

  return {
    status: 'security_seed_complete',
    tenantId,
    sessions,
    mfaSecrets,
    secureTokens,
    apiKeys,
    consentRecords,
    rateLimitLogs,
  };
}

async function main(): Promise<void> {
  const tenantId = process.argv[2]?.trim();
  if (!tenantId) {
    console.error('Usage: node --require tsx/cjs prisma/seeds/19_security.seed.ts <tenantId>');
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const result = await seedSecurity(prisma, tenantId);
    console.info('[19_security]', JSON.stringify(result, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error('[19_security] FAILED', e);
    process.exit(1);
  });
}
