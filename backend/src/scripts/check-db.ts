import { PrismaClient } from '../prisma/generated/client';

async function verify() {
  const prisma = new PrismaClient();
  try {
    const tenants = await prisma.tenant.count();
    const roles = await prisma.role.findMany({
      select: { name: true, description: true }
    });

    console.log(`\n📊 Database Status:`);
    console.log(`- Total Tenants: ${tenants}`);
    console.log(`- Roles Found: ${roles.map(r => r.name).join(', ')}`);
    
    if (tenants > 0) console.log('✅ System Tenant Verified.');
  } catch (e) {
    console.error('❌ Verification failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}

verify();