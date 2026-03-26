import { PayrollEntry, EmployeeProfile } from '@prisma/client';

export class BankExportService {
  /**
   * Generates a Standard Bank Bulk Transfer CSV
   * Format: Account Number, Amount, Employee Name, Reference
   */
  static generateBankCSV(entries: (PayrollEntry & { employee: EmployeeProfile })[]): string {
    const header = "Beneficiary Account,Amount,Beneficiary Name,Payment Reference\n";
    
    const rows = entries
      .filter(e => e.employee.paymentMethod === 'BANK_TRANSFER')
      .map(e => {
        return `${e.employee.accountNumber},${e.netPay},${e.employee.firstName} ${e.employee.lastName},Salary-${e.month}-${e.year}`;
      })
      .join("\n");

    return header + rows;
  }

  /**
   * Generates M-Pesa B2C (Business to Customer) Upload File
   */
  static generateMpesaCSV(entries: (PayrollEntry & { employee: EmployeeProfile })[]): string {
    const header = "Phone Number,Amount,Reference\n";
    
    const rows = entries
      .filter(e => e.employee.paymentMethod === 'MPESA_B2C')
      .map(e => {
        return `${e.employee.mpesaNumber},${e.netPay},WAKILI-${e.id.substring(0,5)}`;
      })
      .join("\n");

    return header + rows;
  }
}