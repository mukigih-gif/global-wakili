import { PrismaClient } from '@prisma/client';

/*
 * 04_contacts.seed.ts — Per-tenant client-contact layer (CLAUDE.md §12).
 *
 * Seeds 2-3 contacts per seeded client (primary / billing / legal), linked to
 * the clients created in 03_clients.seed.ts via their deterministic clientCode.
 *
 * DEMO/FIXTURE data — run only under the master demo-data gate.
 *
 * Policy:
 * - The schema model is `ClientContact`; there is NO contact-role enum, so the
 *   role (Primary / Billing / Legal) is expressed via `title` + the `isPrimary`
 *   flag — no enum guessing.
 * - `ClientContact` has NO @@unique key, so idempotency is achieved with a
 *   findFirst on (tenantId, clientId, email) → update/create. `email` is
 *   deterministic per contact, so reruns converge and never duplicate.
 * - Tenant-scoped: every contact is written with the seeded tenantId and a
 *   clientId resolved within that same tenant (no cross-tenant linkage).
 * - Clients are resolved by clientCode within the tenant; a missing client is
 *   skipped (defensive — 03_clients must run first).
 * - No schema changes, no destructive operations.
 */

type SeedPrisma = PrismaClient;

type ContactSeed = {
  name: string;
  title: string; // role expressed via title (no contact-role enum in schema)
  email: string; // deterministic — the per-client idempotency key
  phoneNumber: string;
  alternatePhone?: string;
  isPrimary?: boolean;
  notes?: string;
};

export type SeededContact = {
  id: string;
  clientCode: string;
  name: string;
  title: string | null;
  isPrimary: boolean;
};

export type ContactsSeedResult = {
  status: 'contacts_seed_complete';
  tenantId: string;
  contacts: SeededContact[];
};

/* Deterministic contacts keyed by the clientCode they attach to (see
 * 03_clients.seed.ts: CLI-0001 corporate, CLI-0002 individual, CLI-0003
 * state agency). Realistic Kenyan names; phones in +254 format. */
const CONTACTS_BY_CLIENT: Record<string, ContactSeed[]> = {
  'CLI-0001': [
    {
      name: 'James Otieno Odhiambo',
      title: 'Managing Director (Primary Contact)',
      email: 'james.otieno@acmeholdings.co.ke',
      phoneNumber: '+254711000101',
      alternatePhone: '+254720000101',
      isPrimary: true,
      notes: 'Primary relationship owner.',
    },
    {
      name: 'Susan Achieng Were',
      title: 'Finance Manager (Billing Contact)',
      email: 'billing@acmeholdings.co.ke',
      phoneNumber: '+254711000102',
      notes: 'Receives invoices and statements.',
    },
    {
      name: 'Peter Kamau Njoroge',
      title: 'Head of Legal (Legal Contact)',
      email: 'legal@acmeholdings.co.ke',
      phoneNumber: '+254711000103',
      notes: 'Instructing contact for matters.',
    },
  ],
  'CLI-0002': [
    {
      name: 'Grace Wanjiru Mwangi',
      title: 'Self (Primary Contact)',
      email: 'grace.wanjiru@example.co.ke',
      phoneNumber: '+254712000201',
      isPrimary: true,
      notes: 'Individual client; self is primary contact.',
    },
    {
      name: 'Daniel Mwangi Kariuki',
      title: 'Spouse (Billing Contact)',
      email: 'daniel.mwangi@example.co.ke',
      phoneNumber: '+254712000202',
      notes: 'Alternate billing contact.',
    },
  ],
  'CLI-0003': [
    {
      name: 'Wycliffe Mutua Musyoka',
      title: 'County Legal Officer (Primary Contact)',
      email: 'legal@nairobi.go.ke',
      phoneNumber: '+254713000301',
      alternatePhone: '+254733000301',
      isPrimary: true,
      notes: 'Primary instructing officer.',
    },
    {
      name: 'Fatuma Hassan Noor',
      title: 'Head of Accounts (Billing Contact)',
      email: 'accounts@nairobi.go.ke',
      phoneNumber: '+254713000302',
      notes: 'Processes county payments.',
    },
    {
      name: 'Esther Njeri Kimani',
      title: 'Senior Counsel (Legal Contact)',
      email: 'counsel@nairobi.go.ke',
      phoneNumber: '+254713000303',
      notes: 'Day-to-day legal liaison.',
    },
  ],
};

async function resolveClientId(
  prisma: SeedPrisma,
  tenantId: string,
  clientCode: string,
): Promise<string | null> {
  const client = await prisma.client.findFirst({
    where: { tenantId, clientCode },
    select: { id: true },
  });

  return client?.id ?? null;
}

async function upsertContact(
  prisma: SeedPrisma,
  tenantId: string,
  clientId: string,
  clientCode: string,
  def: ContactSeed,
): Promise<SeededContact> {
  const data = {
    name: def.name,
    title: def.title,
    email: def.email,
    phoneNumber: def.phoneNumber,
    alternatePhone: def.alternatePhone ?? null,
    isPrimary: def.isPrimary ?? false,
    notes: def.notes ?? null,
  };

  // No @@unique on ClientContact → findFirst on the deterministic
  // (tenantId, clientId, email) tuple, then update or create.
  const existing = await prisma.clientContact.findFirst({
    where: { tenantId, clientId, email: def.email },
    select: { id: true },
  });

  const record = existing
    ? await prisma.clientContact.update({
        where: { id: existing.id },
        data,
        select: { id: true, name: true, title: true, isPrimary: true },
      })
    : await prisma.clientContact.create({
        data: { tenantId, clientId, ...data },
        select: { id: true, name: true, title: true, isPrimary: true },
      });

  return {
    id: record.id,
    clientCode,
    name: record.name,
    title: record.title,
    isPrimary: record.isPrimary,
  };
}

export async function seedContacts(
  prisma: PrismaClient,
  tenantId: string,
): Promise<ContactsSeedResult> {
  if (!tenantId || tenantId.trim().length === 0) {
    throw new Error('seedContacts requires a tenantId.');
  }

  const contacts: SeededContact[] = [];

  for (const [clientCode, defs] of Object.entries(CONTACTS_BY_CLIENT)) {
    const clientId = await resolveClientId(prisma, tenantId, clientCode);

    // Defensive: 03_clients must have run first. Skip rather than throw so a
    // partial tenant set never aborts the whole seed.
    if (!clientId) {
      continue;
    }

    for (const def of defs) {
      contacts.push(
        await upsertContact(prisma, tenantId, clientId, clientCode, def),
      );
    }
  }

  return { status: 'contacts_seed_complete', tenantId, contacts };
}
