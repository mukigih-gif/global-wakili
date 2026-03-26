import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PayrollService } from '@/services/payrollService';

const payrollService = new PayrollService();

export async function POST(req: Request) {
  try {
    // 1. Extract and Validate Input
    const { employeeId, month, year } = await req.json();

    if (!employeeId || !month || !year) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 2. Fetch Employee Profile from Neon
    const employee = await prisma.employeeProfile.findUnique({
      where: { id: employeeId }
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // 3. Execute the March 2026 Calculation Engine
    const results = payrollService.calculateMonthlyPayroll(Number(employee.grossSalary));

    // 4. Save to Database (Explicit Mapping for Type Safety)
    const entry = await prisma.payrollEntry.create({
      data: {
        employeeId,
        month: Number(month),
        year: Number(year),
        grossPay: results.grossPay,
        nssf: results.nssf,
        shif: results.shif,
        housingLevy: results.housingLevy,
        paye: results.paye,
        netPay: results.netPay,
      }
    });

    // 5. Success Response
    return NextResponse.json({ 
      success: true, 
      message: `Payroll processed for ${employee.firstName} ${employee.lastName}`,
      data: entry 
    });

  } catch (error) {
    console.error("Critical Payroll Error:", error);
    return NextResponse.json({ 
      error: "Calculation failed", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}