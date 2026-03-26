import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { BankAutomationService } from '@/lib/bankAutomation';

export async function POST(req: Request) {
  const { month, year, adminId } = await req.json();

  try {
    // 1. Fetch validated payroll records
    const entries = await prisma.payrollEntry.findMany({
      where: { month, year, status: 'PENDING' },
      include: { employee: true }
    });

    if (entries.length === 0) return NextResponse.json({ error: "No pending payroll found" });

    // 2. Trigger Bank H2H Automation
    const bankResult = await BankAutomationService.processDirectPayment(entries, process.env);

    // 3. Update Status to 'PROCESSING' and Log Audit
    await prisma.$transaction([
      prisma.payrollEntry.updateMany({
        where: { month, year },
        data: { status: 'PROCESSING' }
      }),
      prisma.auditLog.create({
        data: {
          action: `DISBURSE_PAYROLL_BANK_H2H`,
          adminId: adminId,
          targetId: `PERIOD_${month}_${year}`
        }
      })
    ]);

    return NextResponse.json({ message: "Payroll uploaded to bank successfully", file: bankResult.fileName });

  } catch (error) {
    return NextResponse.json({ error: "Disbursement failed" }, { status: 500 });
  }
}