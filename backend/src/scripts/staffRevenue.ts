import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function getFirmWideRevenue() {
  console.log(`\n💼 GLOBAL WAKILI: FIRM-WIDE REVENUE & PERFORMANCE REPORT`);
  console.log(`─`.repeat(85));

  // Fetch all users with their billed time entries
  const staffMembers = await prisma.user.findMany({
    include: {
      timeEntries: {
        where: { isBilled: true } 
      }
    }
  });

  const report = staffMembers
    .map(staff => {
      const totalHours = staff.timeEntries.reduce((sum, e) => sum + e.duration, 0);
      const totalRevenue = staff.timeEntries.reduce((sum, e) => sum + e.totalValue, 0);

      return {
        'Staff Name': staff.name,
        'Role': (staff as any).role || 'ASSOCIATE',
        'Total Hours': totalHours.toFixed(1),
        'Avg Rate': `KES ${staff.defaultRate.toLocaleString()}`,
        'Revenue Generated': totalRevenue, // Number for sorting
        'Status': staff.timeEntries.length > 0 ? '🔥 ACTIVE' : '💤 INACTIVE'
      };
    })
    // Rank staff by revenue (Highest first)
    .sort((a, b) => b['Revenue Generated'] - a['Revenue Generated'])
    // Format revenue for display
    .map(item => ({
      ...item,
      'Revenue Generated': `KES ${item['Revenue Generated'].toLocaleString()}`
    }));

  if (report.length === 0) {
    console.log("⚠️ No staff activity found in the database.");
  } else {
    console.table(report);
  }
}

getFirmWideRevenue()
  .catch(e => {
    console.error("❌ Report Generation Failed:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });