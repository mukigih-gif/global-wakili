import { ClientStatus, ClientType, PrismaClient } from '@prisma/client';

/*
 * 03_clients.seed.ts — Per-tenant client layer (CLAUDE.md §12).
 *
 * Seeds a representative client mix (corporate / individual / state agency)
 * per tenant — the prerequisite for matters, billing, and trust fixtures.
 *
 * DEMO/FIXTURE data — run only under the master demo-data gate.
 *
 * Policy:
 * - Idempotent: upsert on the @@unique([tenantId, clientCode]) key.
 * - ClientType uses the real enum (INDIVIDUAL | CORPORATE | STATE_AGENCY |
 *   OTHER) — NOT "COMPANY" (the historical contract bug).
 * - Per-tenant deterministic clientCode; reruns converge.
 * - KYC/screening/risk left at schema defaults (no enum guessing).
 * - No schema changes, no destructive operations.
 */

type SeedPrisma = PrismaClient;

type ClientSeed = {
  code: string;
  name: string;
  type: ClientType;
  email: string;
  phoneNumber: string;
  kraPin?: string;
  nationalId?: string;
  registrationNumber?: string;
  city?: string;
};

export type SeededClient = {
  id: string;
  clientCode: string | null;
  name: string;
  type: ClientType;
};

export type ClientsSeedResult = {
  status: 'clients_seed_complete';
  tenantId: string;
  clients: SeededClient[];
};

const CLIENT_SEEDS: ClientSeed[] = [
  {
    code: 'CLI-0001',
    name: 'Acme Holdings Limited',
    type: ClientType.CORPORATE,
    email: 'accounts@acmeholdings.co.ke',
    phoneNumber: '+254700000001',
    kraPin: 'P051000001A',
    registrationNumber: 'CPR/2012/000001',
    city: 'Nairobi',
  },
  {
    code: 'CLI-0002',
    name: 'Grace Wanjiru Mwangi',
    type: ClientType.INDIVIDUAL,
    email: 'grace.wanjiru@example.co.ke',
    phoneNumber: '+254700000002',
    nationalId: '23456789',
    kraPin: 'A004567890W',
    city: 'Nairobi',
  },
  {
    code: 'CLI-0003',
    name: 'County Government of Nairobi',
    type: ClientType.STATE_AGENCY,
    email: 'legal@nairobi.go.ke',
    phoneNumber: '+254700000003',
    kraPin: 'P051234567X',
    city: 'Nairobi',
  },
];

async function upsertClient(
  prisma: SeedPrisma,
  tenantId: string,
  def: ClientSeed,
): Promise<SeededClient> {
  const data = {
    name: def.name,
    type: def.type,
    email: def.email,
    phoneNumber: def.phoneNumber,
    kraPin: def.kraPin ?? null,
    nationalId: def.nationalId ?? null,
    registrationNumber: def.registrationNumber ?? null,
    city: def.city ?? null,
    status: ClientStatus.ACTIVE,
  };

  return prisma.client.upsert({
    where: { tenantId_clientCode: { tenantId, clientCode: def.code } },
    update: data,
    create: { tenantId, clientCode: def.code, ...data },
    select: { id: true, clientCode: true, name: true, type: true },
  });
}

export async function seedClients(
  prisma: PrismaClient,
  tenantId: string,
): Promise<ClientsSeedResult> {
  if (!tenantId || tenantId.trim().length === 0) {
    throw new Error('seedClients requires a tenantId.');
  }

  const clients: SeededClient[] = [];

  for (const def of CLIENT_SEEDS) {
    clients.push(await upsertClient(prisma, tenantId, def));
  }

  return { status: 'clients_seed_complete', tenantId, clients };
}
