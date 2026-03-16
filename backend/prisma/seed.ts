import { PrismaClient } from '@prisma/client';

// Initialize inside the script to avoid scoping issues in ESM
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Rigorous Stress Test Seed...');

  // 1. Create/Update Client
  const client = await prisma.client.upsert({
    where: { email: 'ops@rotorjet.co.ke' },
    update: {},
    create: {
      name: 'Rotorjet Aviation Ltd',
      email: 'ops@rotorjet.co.ke',
      phone: '+254 700 000000',
      kycStatus: 'VERIFIED',
    },
  });

  // 2. Create/Update Advocate
  const advocate = await prisma.user.upsert({
    where: { email: 'koki@globalsitesltd.com' },
    update: {},
    create: {
      name: 'Koki',
      email: 'koki@globalsitesltd.com',
      role: 'ASSOCIATE',
      defaultRate: 5000,
    },
  });

  // 3. Create/Update Matter (The Stress Test Case)
  // We use upsert here to prevent the "caseNumber" unique constraint error
  const matter = await prisma.matter.upsert({
    where: { caseNumber: 'MIL-CIV-2026-001' },
    update: {},
    create: {
      title: "Rotorjet vs. Civil Aviation Authority",
      clientId: client.id,
      status: "ACTIVE",
      customRate: 12000,
      category: "LITIGATION",
      caseNumber: "MIL-CIV-2026-001",
      // We create these only on initial creation to avoid duplicates
      transactions: {
        create: [
          {
            description: "Initial Deposit (Trust Account)",
            amount: 500000,
            type: "CREDIT",
            accountType: "TRUST",
          },
          {
            description: "DRN: Urgent Filing Fees - Milimani",
            amount: 5000,
            type: "DEBIT",
            accountType: "OFFICE",
            status: "PENDING_APPROVAL",
          }
        ]
      },
      timeEntries: {
        create: [
          {
            description: "Drafting Grounds of Opposition",
            duration: 1.5,
            appliedRate: 12000,
            totalValue: 18000,
            entryType: "AUTO",
            advocateId: advocate.id
          }
        ]
      }
    },
  });

  console.log('✅ Seed Successful: Rotorjet Stress Test Data Loaded');
}

main()
  .catch((e) => {
    console.error('❌ Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });