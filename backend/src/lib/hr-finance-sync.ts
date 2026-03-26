// src/lib/hr-finance-sync.ts
export async function calculateUnpaidDeductions(employeeId: string, month: number, year: number) {
  const unpaidLeave = await prisma.leaveRequest.aggregate({
    _sum: { daysTaken: true },
    where: {
      employeeId,
      leaveType: 'UNPAID',
      status: 'APPROVED',
      startDate: { gte: new Date(year, month - 1, 1) },
      endDate: { lte: new Date(year, month, 0) }
    }
  });

  const daysOff = unpaidLeave._sum.daysTaken || 0;
  
  if (daysOff > 0) {
    // Assuming a standard 26-day work month for a law firm
    // Deduction = (Gross Salary / 26) * Days of Unpaid Leave
    return daysOff;
  }
  return 0;
}