import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const month = Number(searchParams.get('month'));
  const year = Number(searchParams.get('year'));

  // 1. Validation: Prevent server crashes on missing params
  if (!month || !year) {
    return NextResponse.json(
      { error: "Query parameters 'month' and 'year' are required." }, 
      { status: 400 }
    );
  }

  try {
    const entries = await prisma.payrollEntry.findMany({
      where: { month, year },
      include: { 
        employee: {
          select: { firstName: true, lastName: true, kraPin: true } 
        } 
      }
    });

    if (entries.length === 0) {
      return NextResponse.json({ message: "No payroll records found for this period.", summary: null });
    }

    // 2. The Merge: Comprehensive Financial Summary
    const summary = entries.reduce((acc, curr) => {
      // Helper to handle Decimal to Number conversion safely
      const getNum = (val: any) => (val instanceof Decimal ? val.toNumber() : Number(val || 0));

      return {
        totalGross: acc.totalGross + getNum(curr.grossPay),
        totalNetPay: acc.totalNetPay + getNum(curr.netPay),
        totalPAYE: acc.totalPAYE + getNum(curr.paye),
        totalSHIF: acc.totalSHIF + getNum(curr.shif),
        // Aggregating NSSF (Employee + Employer matching)
        totalNSSF_Combined: acc.totalNSSF_Combined + getNum(curr.nssfEmployee) + getNum(curr.nssfEmployer),
        // Aggregating Housing Levy (Employee + Employer 1.5% match)
        totalHousingLevy_Combined: acc.totalHousingLevy_Combined + getNum(curr.housingLevy) + getNum(curr.levyEmployer),
        // The "True Cost": Total amount the firm must budget for this month
        firmTotalLiability: acc.firmTotalLiability + getNum(curr.grossPay) + getNum(curr.nssfEmployer) + getNum(curr.levyEmployer)
      };
    }, { 
      totalGross: 0, totalNetPay: 0, totalPAYE: 0, totalSHIF: 0, 
      totalNSSF_Combined: 0, totalHousingLevy_Combined: 0, firmTotalLiability: 0 
    });

    return NextResponse.json({ summary, detail: entries });

  } catch (error) {
    console.error("Ledger Error:", error);
    return NextResponse.json(
      { error: "An internal error occurred while generating the payroll ledger." }, 
      { status: 500 }
    );
  }
}