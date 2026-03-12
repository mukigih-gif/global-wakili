// prisma/seed.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Global Wakili (Elite Standard)...");

  const client = await prisma.client.upsert({
    where: { email: 'stanley@globalsitesltd.com' },
    update: {},
    create: {
      name: 'Stanley Mwangi',
      email: 'stanley@globalsitesltd.com',
      phone: '+254700000000',
      kraPin: 'A001234567Z',
    },
  });

  const matter = await prisma.matter.upsert({
    where: { reference: 'GW-2026-001' },
    update: {},
    create: {
      reference: 'GW-2026-001',
      title: 'Global Sites vs. Tech Corp',
      matterType: 'Civil Litigation',
      stage: 'INTAKE',
      courtStation: 'Milimani Commercial Court',
      clientId: client.id,
      // Create associated records at the same time!
      logs: {
        create: { entry: 'File opened and initial KYC completed.' }
      },
      bringUps: {
        create: { 
          date: new Date('2026-04-01'), 
          reason: 'Check for Respondent’s Appearance' 
        }
      }
    },
  });

  console.log("✅ Success! Professional Matter Environment Ready.");
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());