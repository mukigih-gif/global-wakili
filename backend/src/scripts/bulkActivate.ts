import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function globalActivation() {
  console.log("🚀 GLOBAL WAKILI: STARTING FIRM-WIDE ACTIVATION...");

  // Target all staff currently in 'ONBOARDING'
  const result = await prisma.user.updateMany({
    where: { 
      status: 'ONBOARDING' 
    },
    data: {
      status: 'ACTIVE',
      password: 'GlobalWakiliChangeMe2026!', // Temporary secure password
    }
  });

  if (result.count > 0) {
    console.log(`✅ SUCCESS: ${result.count} staff members have been moved to ACTIVE.`);
    console.log("💡 Note: All activated staff can now log into the portal.");
  } else {
    console.log("ℹ️ No staff members currently require activation.");
  }
}

globalActivation()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());