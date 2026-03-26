import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Validated Security Audit Logger
 */
async function logReportAccess(adminId: string, type: string) {
  await prisma.auditLog.create({
    data: {
      action: `GENERATE_PDF_${type}`,
      adminId: adminId,
      timestamp: new Date()
    }
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const month = Number(searchParams.get('month'));
  const year = Number(searchParams.get('year'));
  const reportType = searchParams.get('type') || 'GENERAL'; 
  const adminId = "SYSTEM_USER"; // In production, get this from your Auth Session (e.g., req.auth.user.id)

  if (!month || !year) {
    return NextResponse.json({ error: "Month and Year are required" }, { status: 400 });
  }

  try {
    const entries = await prisma.payrollEntry.findMany({
      where: { month, year },
      include: { employee: true }
    });

    if (entries.length === 0) {
      return NextResponse.json({ message: "No records found for this period" }, { status: 404 });
    }

    // 1. Log the access immediately (Compliance Requirement)
    await logReportAccess(adminId, reportType);

    // 2. Calculate Merged Metrics
    const summary = entries.reduce((acc, curr) => {
      const getNum = (val: any) => (val instanceof Decimal ? val.toNumber() : Number(val || 0));
      
      return {
        totalNetPay: acc.totalNetPay + getNum(curr.netPay),
        totalPAYE: acc.totalPAYE + getNum(curr.paye),
        totalSHIF: acc.totalSHIF + getNum(curr.shif),
        // Consolidated Employer + Employee Statutory obligations
        totalNSSF_Combined: acc.totalNSSF_Combined + getNum(curr.nssfEmployee) + getNum(curr.nssfEmployer),
        totalHousing_Combined: acc.totalHousing_Combined + (getNum(curr.housingLevy) * 2),
        // The Partner's "Bottom Line"
        firmTotalLiability: acc.firmTotalLiability + getNum(curr.grossPay) + getNum(curr.nssfEmployer) + getNum(curr.levyEmployer)
      };
    }, { 
      totalNetPay: 0, totalPAYE: 0, totalSHIF: 0, 
      totalNSSF_Combined: 0, totalHousing_Combined: 0, firmTotalLiability: 0 
    });

    // 3. Return specialized data structures for the Frontend
    return NextResponse.json({
      summary,
      reportMetadata: {
        generatedAt: new Date(),
        period: `${month}/${year}`,
        authorizedBy: adminId
      },
      // Breakdown for the Partner's "Lawyer Performance" table
      lawyerMetrics: entries.map(e => ({
        name: `${e.employee.firstName} ${e.employee.lastName}`,
        findersFee: e.commissions,
        netPay: e.netPay,
        tcoe: Number(e.grossPay) + Number(e.nssfEmployer) + Number(e.levyEmployer)
      })),
      detail: entries
    });

  } catch (error) {
    console.error("Report Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}