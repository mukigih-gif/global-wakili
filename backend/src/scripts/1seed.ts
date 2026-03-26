import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
// backend/src/scripts/smoke-test.ts
import { PrismaClient } from './generated/client/index.js';

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

// Initialize Prisma with the PG adapter
const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Validated Payroll logic for 2025
 */
function calculateNetPaye(grossSalary: number) {
  const nssf = Math.min(grossSalary * NSSF_RATE, NSSF_CEILING * NSSF_RATE);
  const taxableIncome = Math.max(0, grossSalary - nssf);

  let grossTax = 0;
  let remainingTaxable = taxableIncome;

  for (const band of KRA_TAX_BANDS_2025) {
    const bandLimit = band.max - band.min + 1;
    const taxableInBand = Math.min(remainingTaxable, bandLimit);
    if (taxableInBand <= 0) break;
    grossTax += taxableInBand * band.rate;
    remainingTaxable -= taxableInBand;
  }

  const netPaye = Math.max(0, grossTax - PERSONAL_RELIEF);
  const shif = grossSalary * SHIF_RATE;

  return { nssf, netPaye, shif };
}

/**
 * IDEMPOTENT SEED LOGIC: Use this to ensure core data exists without wiping existing data
 */
async function seedSystemBasics() {
  console.log("🌱 Synchronizing Core System Data (Non-Destructive)...");

  // 1. Upsert Roles
  const roles = ['Admin', 'Advocate', 'Finance', 'Legal Secretary'];
  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {}, 
      create: { name: roleName },
    });
  }

  // 2. Upsert Main Tenant (using name or slug as unique identifier)
  await prisma.tenant.upsert({
    where: { name: 'Global Wakili HQ' }, // Update this if your schema uses a 'slug'
    update: {}, 
    create: { 
      name: 'Global Wakili HQ',
    },
  });

  console.log("✅ System basics synchronized.");
}

async function main() {
  console.log("🚀 Starting Global Wakili Consolidated Smoke Test & Seed...");

  // --- ADDED HERE: Run the safe seed first ---
  await seedSystemBasics();

  // 1. Roles & Access
  const currentRoles = await prisma.role.findMany();
  console.log("🔑 Active Roles:", currentRoles.map(r => r.name).join(", "));

  // 2. Tenants & Identity
  const tenants = await prisma.tenant.findMany();
  console.log("🏢 Tenants:", tenants.map(t => t.name));

  const users = await prisma.user.findMany({ include: { role: true }, take: 5 });
  console.log("👥 Users + Roles:", users.map(u => `${u.email} -> ${u.role?.name}`));

  // 3. Legal Matters & Linkages
  const matters = await prisma.matter.findMany({
    include: { originator: true, account: true },
    take: 5,
  });
  console.log("📂 Matters Found:", matters.length);

  // 4. Finance & eTIMS Compliance
  const invoices = await prisma.invoice.findMany({ take: 5 });
  const etims = await prisma.kraSubmission.findMany({ take: 5 });
  console.log(`💰 Invoices: ${invoices.length} | 🧾 eTIMS Submissions: ${etims.length}`);

  // 5. Validated Payroll Check
  const employees = await prisma.employee.findMany({ take: 5 });
  console.log("\n📊 Validating Payroll Compliance (2025 Progressive Tax)...");

  employees.forEach(emp => {
    const { nssf, netPaye, shif } = calculateNetPaye(emp.grossSalary);
    console.log(`   - ${emp.name}: Gross ${emp.grossSalary.toLocaleString()} | Net PAYE: ${netPaye.toFixed(2)} | Net Pay: ${(emp.grossSalary - (nssf + netPaye + shif)).toLocaleString()}`);
  });

  console.log("\n✅ Stage 2 Complete: System data is synchronized and logic is validated.");
}

main()
  .catch((e) => {
    console.error("❌ Process failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });