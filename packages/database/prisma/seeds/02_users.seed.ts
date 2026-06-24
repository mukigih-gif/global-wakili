import { PrismaClient, SystemRole, TenantRole, UserStatus } from '@prisma/client';

/*
 * 02_users.seed.ts — Per-tenant user layer (CLAUDE.md §12).
 *
 * Bootstrap creates each tenant's FIRM_ADMIN. This layer adds the non-admin
 * role spread (CFO / branch manager / accountant / advocate / associate /
 * clerk) for a tenant, so RBAC, finance authorization, approval routing, and
 * login E2E have a realistic set of actors.
 *
 * NOTE: this layer creates login-able accounts sharing SEED_DEFAULT_PASSWORD_HASH
 * and is therefore DEMO/FIXTURE data — the master orchestrator only runs it under
 * the demo-data gate (never in production by default).
 *
 * Policy:
 * - Idempotent: email is NOT globally unique, so resolve by {tenantId,email}
 *   then update/create (mirrors bootstrap seedFirmAdmin).
 * - Reuses SEED_DEFAULT_PASSWORD_HASH (set for bootstrap) so seeded users
 *   share the known seed password and can authenticate.
 * - Connects the matching per-tenant Role AND sets the authoritative
 *   TenantRole enum (the two parallel systems, per FINDING-007-011).
 * - The CFO actor elevates via Role.name 'CFO' ONLY (tenantRole stays
 *   ACCOUNTANT), exercising the finance "CFO via role name, not FIRM_ADMIN"
 *   authorization path (FinancePermissionMap.ts:84).
 * - No schema changes, no destructive operations.
 */

type SeedPrisma = PrismaClient;

type TenantUserSeed = {
  roleName: string; // bootstrap Role.name
  tenantRole: TenantRole; // authoritative enum
  localPart: string; // email local part
  name: string;
};

export type SeededUser = {
  id: string;
  email: string;
  tenantRole: TenantRole;
  roleName: string;
};

export type UsersSeedResult = {
  status: 'users_seed_complete';
  tenantId: string;
  users: SeededUser[];
};

const TENANT_USER_SEEDS: TenantUserSeed[] = [
  { roleName: 'CFO', tenantRole: TenantRole.ACCOUNTANT, localPart: 'cfo', name: 'Halima Abdalla' },
  { roleName: 'branch_manager', tenantRole: TenantRole.BRANCH_MANAGER, localPart: 'branch.manager', name: 'Wanjiku Kamau' },
  { roleName: 'accountant', tenantRole: TenantRole.ACCOUNTANT, localPart: 'accountant', name: 'Otieno Odhiambo' },
  { roleName: 'advocate', tenantRole: TenantRole.ADVOCATE, localPart: 'advocate', name: 'Achieng Were' },
  { roleName: 'associate', tenantRole: TenantRole.ASSOCIATE, localPart: 'associate', name: 'Kiprop Cherono' },
  { roleName: 'clerk', tenantRole: TenantRole.CLERK, localPart: 'clerk', name: 'Njeri Mwangi' },
];

function requirePasswordHash(): string {
  const value = process.env.SEED_DEFAULT_PASSWORD_HASH?.trim();

  if (!value) {
    throw new Error('SEED_DEFAULT_PASSWORD_HASH is required to seed users.');
  }

  return value;
}

async function upsertTenantUser(
  prisma: SeedPrisma,
  input: { tenantId: string; email: string; passwordHash: string; seed: TenantUserSeed },
): Promise<SeededUser> {
  const { tenantId, email, passwordHash, seed } = input;

  const role = await prisma.role.findUnique({
    where: { tenantId_name: { tenantId, name: seed.roleName } },
    select: { id: true },
  });

  if (!role) {
    throw new Error(
      `Role ${seed.roleName} not found for tenant ${tenantId}. Run bootstrap / 01_tenants first.`,
    );
  }

  const existing = await prisma.user.findFirst({
    where: { tenantId, email },
    select: { id: true },
  });

  const data = {
    name: seed.name,
    systemRole: SystemRole.NONE,
    tenantRole: seed.tenantRole,
    status: UserStatus.ACTIVE,
  };

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { ...data, roles: { set: [{ id: role.id }] } },
      select: { id: true, email: true, tenantRole: true },
    });

    return { ...updated, roleName: seed.roleName };
  }

  const created = await prisma.user.create({
    data: {
      tenantId,
      email,
      passwordHash,
      ...data,
      roles: { connect: [{ id: role.id }] },
    },
    select: { id: true, email: true, tenantRole: true },
  });

  return { ...created, roleName: seed.roleName };
}

export async function seedUsers(
  prisma: PrismaClient,
  tenantId: string,
): Promise<UsersSeedResult> {
  if (!tenantId || tenantId.trim().length === 0) {
    throw new Error('seedUsers requires a tenantId.');
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { slug: true },
  });

  if (!tenant) {
    throw new Error(`seedUsers: tenant ${tenantId} not found.`);
  }

  const passwordHash = requirePasswordHash();
  const users: SeededUser[] = [];

  for (const seed of TENANT_USER_SEEDS) {
    const email = `${seed.localPart}@${tenant.slug}.test`;
    users.push(await upsertTenantUser(prisma, { tenantId, email, passwordHash, seed }));
  }

  return { status: 'users_seed_complete', tenantId, users };
}
