import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function getUniversalLedger() {
  const searchKeyword = process.argv[2]; // Optional: e.g., "Rotorjet" or "Conveyancing"

  // 1. Fetch matters with their associated time entries
  const matters = await prisma.matter.findMany({
    where: searchKeyword ? { title: { contains: searchKeyword } } : {},
    include: {
      timeEntries: true,
    }
  });

  if (matters.length === 0) {
    console.log(searchKeyword ? `❌ No matters found matching "${searchKeyword}"` : "❌ No matters found in the database.");
    return;
  }

  console.log(`\n📊 GLOBAL WAKILI: MATTERS FINANCIAL SUMMARY`);
  console.log(`─`.repeat(80));

  const summary = matters.map(matter => {
    const totalWorkValue = matter.timeEntries.reduce((sum, entry) => sum + entry.totalValue, 0);
    
    // Using a fallback budget if the field isn't in your schema yet
    // In production, this would be 'matter.budget' or 'matter.deposit'
    const budget = (matter as any).budget || 500000; 
    const balance = budget - totalWorkValue;

    return {
      Matter: matter.title.length > 30 ? matter.title.substring(0, 27) + "..." : matter.title,
      'Total Budget': `KES ${budget.toLocaleString()}`,
      'Work Logged': `KES ${totalWorkValue.toLocaleString()}`,
      'Remaining': `KES ${balance.toLocaleString()}`,
      Status: balance < 50000 ? '🔴 LOW FUNDS' : '🟢 HEALTHY'
    };
  });

  console.table(summary);

  // If a specific matter was searched, show the line-item details
  if (searchKeyword && matters.length === 1) {
    const m = matters[0];
    console.log(`\n📝 DETAILED LOGS FOR: ${m.title}`);
    console.table(m.timeEntries.map(e => ({
      Date: e.date.toLocaleDateString(),
      Description: e.description,
      Duration: e.duration,
      Value: `KES ${e.totalValue.toLocaleString()}`
    })));
  }
}

getUniversalLedger()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());