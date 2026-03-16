import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function runExecutiveAudit() {
  console.log("📊 GLOBAL WAKILI: EXECUTIVE STAFF & COMPLIANCE AUDIT\n");

  const allStaff = await prisma.user.findMany({
    include: { 
      _count: { select: { timeEntries: true } } 
    }
  });

  const report = allStaff.map(member => {
    const isActive = member.status === "ACTIVE";
    const hasRate = member.defaultRate > 0;
    const hasAuth = !!member.password;
    const canBill = isActive && hasRate && hasAuth;

    // Determine the single most important next step
    let actionNeeded = "Ready";
    if (!hasAuth) actionNeeded = "Set up Login Credentials";
    else if (!hasRate) actionNeeded = "Define Billing Rate";
    else if (member._count.timeEntries === 0) actionNeeded = "Assign first task (Rotorjet)";

    return {
      Name: member.name,
      Role: member.role,
      Status: member.status,
      Rate: hasRate ? `KES ${member.defaultRate}` : "⚠️ MISSING",
      Auth: hasAuth ? "✅" : "❌",
      Tasks: member._count.timeEntries,
      CanBill: canBill ? "YES" : "NO",
      Action: actionNeeded
    };
  });

  console.table(report);

  const nonBillable = report.filter(s => s.CanBill === "NO").length;
  if (nonBillable > 0) {
    console.log(`\n🚨 REVENUE ALERT: ${nonBillable} staff members are not currently billable.`);
  } else {
    console.log("\n✅ OPERATIONALLY READY: All staff are verified and billable.");
  }
}

runExecutiveAudit()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());