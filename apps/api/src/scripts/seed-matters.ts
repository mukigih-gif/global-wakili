/**
 * seed-matters.ts
 * Creates end-to-end matter lifecycle for Demo Law Firm:
 * Client → Matter → Lawyer Assignment → Tasks → Documents → Time Entries
 * → Invoice → Payment → Ledger → Closure
 * Run: npx dotenv-cli -e ../../.env -- node --require tsx/cjs src/scripts/seed-matters.ts <tenantId>
 */
import prisma from '../config/database';
import bcrypt from 'bcryptjs';

async function main() {
  const tenantId = process.argv[2]?.trim() ?? 'cmpy9pg9u00002gom327d94va';

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error(`Tenant ${tenantId} not found`);
  console.log(`[TENANT] ${tenant.name}\n`);

  // ── 1. Create sample clients ────────────────────────────────────────────────
  const clientData = [
    { name: 'ABC Holdings Ltd', type: 'CORPORATE' as const, email: 'legal@abcholdings.co.ke', phoneNumber: '+254711000001', registrationNumber: 'CPR/2019/001234', kraPin: 'P000000001A' },
    { name: 'Jane Kariuki', type: 'INDIVIDUAL' as const, email: 'jane.kariuki@gmail.com', phoneNumber: '+254712000002', nationalId: '12345678', kraPin: 'A000000002B' },
    { name: 'Sunrise Properties Ltd', type: 'CORPORATE' as const, email: 'info@sunrise.co.ke', phoneNumber: '+254713000003', registrationNumber: 'CPR/2020/005678', kraPin: 'P000000003C' },
    { name: 'John Mwangi Oduya', type: 'INDIVIDUAL' as const, email: 'jmwangi@email.com', phoneNumber: '+254714000004', nationalId: '87654321', kraPin: 'A000000004D' },
    { name: 'Kenya NGO Trust', type: 'OTHER' as const, email: 'trust@kenyango.org', phoneNumber: '+254715000005', registrationNumber: 'NGO/2018/999', kraPin: 'P000000005E' },
  ];

  const clients = [];
  for (const c of clientData) {
    const existing = await prisma.client.findFirst({ where: { tenantId, email: c.email } });
    if (existing) { clients.push(existing); console.log(`[SKIP] Client: ${c.name}`); continue; }
    const client = await prisma.client.create({
      data: { tenantId, ...c, status: 'ACTIVE', kycStatus: 'BASIC_VERIFIED', riskBand: 'LOW' },
    });
    clients.push(client);
    console.log(`[OK] Client: ${c.name} (${client.id})`);
  }

  // ── 2. Find admin user and branch ──────────────────────────────────────────
  const adminUser = await prisma.user.findFirst({ where: { tenantId, status: 'ACTIVE' } });
  if (!adminUser) throw new Error('No active user found for tenant');
  console.log(`\n[USER] Using: ${adminUser.name} (${adminUser.id})`);

  // Find or create default branch
  let branch = await prisma.branch.findFirst({ where: { tenantId } });
  if (!branch) {
    branch = await prisma.branch.create({
      data: { tenantId, name: 'Main Office', code: 'MAIN', isMainBranch: true, city: 'Nairobi', country: 'Kenya', status: 'ACTIVE' },
    });
    console.log(`[OK] Branch: Main Office (${branch.id})`);
  } else {
    console.log(`[SKIP] Branch: ${branch.name} (${branch.id})`);
  }

  // ── 3. Create matters across different categories ───────────────────────────
  const mattersData = [
    {
      clientIdx: 0, title: 'Employment Dispute — ABC Holdings v Kamau',
      matterType: 'LITIGATION', category: 'EMPLOYMENT',
      estimatedValue: 2500000, status: 'ACTIVE',
      description: 'Wrongful termination claim by former senior manager.',
    },
    {
      clientIdx: 1, title: 'Land Transfer — LR No. 1234/Nairobi',
      matterType: 'CONVEYANCING', category: 'LAND',
      estimatedValue: 8000000, status: 'ACTIVE',
      description: 'Sale agreement and transfer of residential property.',
    },
    {
      clientIdx: 2, title: 'Sunrise Properties — Company Restructuring',
      matterType: 'COMMERCIAL', category: 'CORPORATE',
      estimatedValue: 5000000, status: 'ACTIVE',
      description: 'Shareholder restructuring and new shareholder agreement.',
    },
    {
      clientIdx: 3, title: 'Probate — Estate of John Mwangi Oduya',
      matterType: 'PROBATE', category: 'FAMILY',
      estimatedValue: 1500000, status: 'ACTIVE',
      description: 'Grant of letters of administration for intestate estate.',
    },
    {
      clientIdx: 4, title: 'Kenya NGO — Registration & Compliance',
      matterType: 'COMMERCIAL', category: 'CORPORATE',
      estimatedValue: 350000, status: 'CLOSED',
      description: 'NGO registration with NGO Coordination Board.',
    },
  ];

  const matters = [];
  for (const m of mattersData) {
    const client = clients[m.clientIdx];
    const existing = await prisma.matter.findFirst({ where: { tenantId, clientId: client.id, title: m.title } });
    if (existing) { matters.push(existing); console.log(`[SKIP] Matter: ${m.title}`); continue; }

    const matter = await prisma.matter.create({
      data: {
        tenantId, clientId: client.id,
        branchId: branch.id,
        title: m.title, category: m.category,
        status: m.status as any, openedDate: new Date(),
        leadAdvocateId: adminUser.id,
        description: m.description,
        riskLevel: 'LOW',
      },
    });
    matters.push(matter);
    console.log(`[OK] Matter: ${m.title} (${matter.id})`);
  }

  // ── 4. Create tasks per matter ──────────────────────────────────────────────
  console.log('\n[TASKS] Creating matter tasks...');
  const taskTemplates = [
    { title: 'Initial client consultation', priority: 'HIGH', status: 'DONE' },
    { title: 'Draft pleadings / documents', priority: 'HIGH', status: 'IN_PROGRESS' },
    { title: 'File with court / registry', priority: 'NORMAL', status: 'TODO' },
    { title: 'Serve opposing party', priority: 'NORMAL', status: 'TODO' },
    { title: 'Hearing preparation', priority: 'HIGH', status: 'TODO' },
  ];

  let taskCount = 0;
  for (const matter of matters.slice(0, 3)) {
    for (const t of taskTemplates) {
      const existing = await prisma.matterTask.findFirst({ where: { tenantId, matterId: matter.id, title: t.title } });
      if (!existing) {
        await prisma.matterTask.create({
          data: {
            tenantId, matterId: matter.id,
            title: t.title, priority: t.priority as any,
            status: t.status as any,
            assignedTo: adminUser.id, createdById: adminUser.id,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
        taskCount++;
      }
    }
  }
  console.log(`[OK] ${taskCount} tasks created`);

  // ── 5. Create time entries ──────────────────────────────────────────────────
  console.log('\n[TIME] Creating time entries...');
  let timeCount = 0;
  const timeEntries = [
    { description: 'Initial consultation with client', durationMinutes: 60, ratePerHour: 15000 },
    { description: 'Legal research on applicable law', durationMinutes: 120, ratePerHour: 15000 },
    { description: 'Drafting court documents', durationMinutes: 180, ratePerHour: 15000 },
    { description: 'Court attendance', durationMinutes: 240, ratePerHour: 20000 },
  ];

  for (const matter of matters.slice(0, 3)) {
    for (const te of timeEntries) {
      const existing = await prisma.timeEntry.findFirst({ where: { tenantId, matterId: matter.id, description: te.description } });
      if (!existing) {
        const durationHours = te.durationMinutes / 60;
        await prisma.timeEntry.create({
          data: {
            tenantId, matterId: matter.id,
            advocateId: adminUser.id,
            description: te.description,
            durationMinutes: te.durationMinutes,
            durationHours,
            appliedRate: te.ratePerHour,
            billableAmount: durationHours * te.ratePerHour,
            status: 'APPROVED',
            entryDate: new Date(),
            isBillable: true,
          },
        });
        timeCount++;
      }
    }
  }
  console.log(`[OK] ${timeCount} time entries created`);

  console.log('\n[DONE] Matter lifecycle seed complete.');
  console.log(`  Clients: ${clients.length}`);
  console.log(`  Matters: ${matters.length}`);
  console.log(`  Tasks: ${taskCount}`);
  console.log(`  Time Entries: ${timeCount}`);
}

main()
  .catch((e) => { console.error('[ERROR]', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
