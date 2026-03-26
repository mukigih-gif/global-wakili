import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
// FIX: Updated path to find the generated client from the /prisma folder
import { PrismaClient } from '../generated/client/index.js'; 
import 'dotenv/config';

/**
 * 2025 KRA Progressive Tax Bands (Kenya PAYE)
 */
const KRA_TAX_BANDS_2025 = [
  { min: 0, max: 24000, rate: 0.10 },
  { min: 24001, max: 32333, rate: 0.25 },
  { min: 32334, max: 48000, rate: 0.30 },
  { min: 48001, max: 57333, rate: 0.325 },
  { min: 57334, max: Infinity, rate: 0.35 },
];

const PERSONAL_RELIEF = 2400;
const SHIF_RATE = 0.0275;
const NSSF_RATE = 0.06;
const NSSF_CEILING = 36000;

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function calculateNetPaye(grossSalary: number) {
  const nssf = Math.min(grossSalary * NSSF_RATE, NSSF_CEILING * NSSF_RATE);
  const taxableIncome = grossSalary - nssf;
  const shif = grossSalary * SHIF_RATE;

  let totalTax = 0;
  for (const band of KRA_TAX_BANDS_2025) {
    if (taxableIncome > band.min) {
      const taxableInBand = Math.min(taxableIncome, band.max) - band.min;
      totalTax += taxableInBand * band.rate;
    }
  }

  const netPaye = Math.max(0, totalTax - PERSONAL_RELIEF);
  return { nssf, netPaye, shif };
}

async function main() {
  console.log("🚀 Starting Global Wakili Enterprise v3.0 Smoke Test...");

  // 1. MANDATORY: Create Tenant (Firm)
 const tenant = await prisma.tenant.upsert({
  where: { slug: 'global-wakili-hq' },
  update: {},
  create: {
    name: 'Global Wakili HQ',
    slug: 'global-wakili-hq',
    kraPin: 'P051234567X',
    subscriptionStatus: 'ACTIVE',
    currency: 'KES',
    // MANDATORY FIELDS FOR V3.0
    billingCycleStart: new Date(),
    billingCycleEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
  },
});

  // 2. MANDATORY: Create Branch
  const branch = await prisma.branch.upsert({
    where: { 
      tenantId_kraPin: { 
        tenantId: tenant.id, 
        kraPin: 'P051234567X' 
      } 
    },
    update: {},
    create: {
      name: 'Nairobi Main Branch',
      kraPin: 'P051234567X',
      tenantId: tenant.id,
      // REMOVE THE LINE: isMainBranch: true
      
      // OPTIONAL: Add an email or location if you want to be thorough
      email: 'nairobi@globalwakili.com',
      location: 'Nairobi CBD',
    },
  });

  // 3. Create Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@globalwakili.com' },
    update: {},
    create: {
      email: 'admin@globalwakili.com',
      name: 'Stanley Mwangi',
      tenantId: tenant.id,
      branchId: branch.id,
      systemRole: 'SUPER_ADMIN',
      tenantRole: 'FIRM_ADMIN',
    },
  });

  console.log("✅ Core Infrastructure (Tenant/Branch/Admin) Synchronized.");

  // 4. Validate Model Renames and Relations
  const matters = await prisma.matter.findMany({ where: { branchId: branch.id } });
  console.log("📂 Matters Found:", matters.length);

  // 'kraSubmission' data is now inside 'invoice' in v3.0
  const invoices = await prisma.invoice.findMany({ where: { tenantId: tenant.id } });
  console.log(`💰 Invoices: ${invoices.length}`);

  // 'account' is now 'chartOfAccount'
  const chart = await prisma.chartOfAccount.findMany({ where: { tenantId: tenant.id } });
  console.log("📊 Chart of Accounts:", chart.length);

  // 5. Payroll Validation (Using User model)
  // We assume some users have a grossSalary field or linked PayrollRecord
  // For this smoke test, we'll use the Admin user created above
  console.log("\n📊 Validating Payroll Compliance (2025 Progressive Tax)...");
  const testGross = 150000;
  const { nssf, netPaye, shif } = calculateNetPaye(testGross);
  const netPay = testGross - (nssf + netPaye + shif);
  
  console.log(`   - ${admin.name}: Gross ${testGross.toLocaleString()} | Net PAYE: ${netPaye.toFixed(2)} | SHIF: ${shif.toFixed(2)} | Net: ${netPay.toLocaleString()}`);

  console.log("\n✨ Smoke Test Completed Successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Smoke Test Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });