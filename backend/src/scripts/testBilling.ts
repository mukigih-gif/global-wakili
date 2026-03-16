import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function logTask() {
  const [staffName, matterKeyword, durationInput, ...descParts] = process.argv.slice(2);
  const description = descParts.join(" ") || "General legal consultancy";
  const duration = parseFloat(durationInput);

  if (!staffName || !matterKeyword || isNaN(duration)) {
    console.log("❌ Usage: npx ts-node testBilling.ts [StaffName] [MatterKeyword] [Duration] [Description]");
    return;
  }

  const [staff, matter] = await Promise.all([
    prisma.user.findFirst({ where: { name: { contains: staffName } } }),
    prisma.matter.findFirst({ where: { title: { contains: matterKeyword } } })
  ]);

  if (!staff || !matter) {
    console.log(`❌ Error: Could not find ${!staff ? 'Staff' : 'Matter'}.`);
    return;
  }

  const billableRate = staff.defaultRate;
  const calculatedCost = duration * billableRate;

  await prisma.timeEntry.create({
    data: {
      description,
      duration: duration,
      appliedRate: billableRate,
      totalValue: calculatedCost,
      entryType: 'BILLED', 
      isBilled: true,
      date: new Date(),
      advocate: {
        connect: { id: staff.id }
      },
      matter: {
        connect: { id: matter.id }
      }
    }
  });

  console.log(`✅ LOGGED: KES ${calculatedCost.toLocaleString()} added to ${matter.title} by ${staff.name}`);
}

logTask()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());