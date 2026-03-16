import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('--- Starting Rigorous Stress Test Seed ---')

  // 1. Create a Client (Onboarding)
  const client = await prisma.client.upsert({
    where: { email: 'ops@rotorjet.co.ke' },
    update: {},
    create: {
      name: 'Rotorjet Aviation Ltd',
      email: 'ops@rotorjet.co.ke',
      phone: '+254 700 000000',
      kycStatus: 'VERIFIED',
    },
  })

  // 2. Create the Advocate (User)
  const advocate = await prisma.user.upsert({
    where: { email: 'koki@globalsitesltd.com' },
    update: {},
    create: {
      name: 'Koki',
      email: 'koki@globalsitesltd.com',
      role: 'ASSOCIATE',
      defaultRate: 5000, // Standard rate
    },
  })

  // 3. Create the Matter with a CUSTOM RATE (The Stress Test)
  const matter = await prisma.matter.create({
    data: {
      title: 'Rotorjet vs. Civil Aviation Authority',
      clientId: client.id,
      customRate: 12000, // Custom rate overrides standard 5,000
      status: 'ACTIVE',
      category: 'LITIGATION',
      caseNumber: 'MIL-CIV-2026-001',
    },
  })

  // 4. Create a Pending DRN (Expense Request)
  await prisma.transaction.create({
    data: {
      description: 'DRN: Urgent Filing Fees - Milimani',
      amount: 5000,
      type: 'DEBIT',
      accountType: 'OFFICE',
      status: 'PENDING_APPROVAL',
      matterId: matter.id,
    },
  })

  // 5. Create a Time Entry (Smart Timer simulation)
  // 1.5 hours at the custom rate of 12,000
  await prisma.timeEntry.create({
    data: {
      description: 'Drafting Grounds of Opposition',
      duration: 1.5,
      appliedRate: 12000, 
      totalValue: 18000, // 1.5 * 12,000
      entryType: 'AUTO',
      advocateId: advocate.id,
      matterId: matter.id,
      date: new Date(),
    },
  })

  console.log('--- Seed Successful: Stress Test Data Loaded ---')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })