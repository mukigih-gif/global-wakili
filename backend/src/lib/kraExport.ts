import { PayrollEntry, EmployeeProfile } from '@prisma/client';

export class KraExportService {
  /**
   * Generates the CSV for iTax "Sheet B_Employee_Details"
   * Column Order (Standard 2026 iTax Format):
   * PIN, Name, Type of Employee, Basic Salary, House Allowance, Transport, 
   * Other Cashes, Value of Car, Other Non-Cashes, Global Income, Type of Housing, 
   * Rent Recovered, Fixed/Calculated, NSSF, Pension, etc.
   */
  static generateP10CSV(entries: (PayrollEntry & { employee: EmployeeProfile })[]): string {
    // Note: KRA requires specific headers or no headers depending on the macro version. 
    // Usually, a raw CSV with these columns works for the 'Import CSV' button.
    const rows = entries.map(e => {
      const pin = e.employee.kraPin;
      const name = `${e.employee.firstName} ${e.employee.lastName}`;
      const resident = "Resident"; // Standard for Global Wakili staff
      
      return [
        pin,                             // Column A: PIN of Employee
        name,                            // Column B: Name of Employee
        resident,                        // Column C: Residential Status
        e.basePay.toString(),            // Column D: Basic Salary
        "0.00",                          // Column E: Benefits (Non-Cash)
        "0.00",                          // Column F: Value of Quarters
        e.commissions.toString(),        // Column G: Other Cash (Finders Fees)
        e.grossPay.toString(),           // Column H: Actual Gross
        e.nssfEmployee.toString(),       // Column I: NSSF Contribution
        "0.00",                          // Column J: Other Pension
        e.housingLevy.toString(),        // Column K: Affordable Housing Levy
        e.shif.toString(),               // Column L: SHIF Contribution
        "2400.00",                       // Column M: Personal Relief (Monthly)
        e.paye.toString()                // Column N: Self-Assessed PAYE
      ].join(",");
    });

    return rows.join("\n");
  }
}