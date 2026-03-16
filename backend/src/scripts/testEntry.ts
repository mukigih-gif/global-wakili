import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function logFirstTask() {
  const koki = await prisma.user.findFirst({ where: { name: "Koki" } });
  const matter = await prisma.matter.findFirst({ where: { title: { contains: "Rotorjet" } } });

  if (koki && matter) {
    await prisma.timeEntry.create({
      data: {
        description: "Drafting Aviation Management Agreement",
        duration: 2.5, // 2 hours 30 mins
        appliedRate: koki.defaultRate,
        totalValue: 2.5 * koki.defaultRate,
        advocateId: koki.id,
        matterId: matter.id,
        isBilled: false
      }
    });
    console.log("✅ Task logged. Koki's WIP has increased.");
  }
}

logFirstTask();