import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkStaffOnboarding() {
  const staff = await prisma.user.findMany({
    include: {
      _count: { select: { timeEntries: true } } // Checks if they've actually started work
    }
  });

  const report = staff.map(member => ({
    name: member.name,
    status: {
      hasPassword: !!member.password, // Security check
      hasBillingRate: member.defaultRate > 0,
      activeTasks: member._count.timeEntries,
      onboardingComplete: (!!member.password && member.defaultRate > 0)
    },
    actionNeeded: !member.password ? "Set up Login Credentials" : 
                  member._count.timeEntries === 0 ? "Assign first task (Rotorjet)" : "Ready"
  }));

  console.table(report);
}

checkStaffOnboarding();