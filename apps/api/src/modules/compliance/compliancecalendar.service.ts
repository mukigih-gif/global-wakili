export class ComplianceCalendarService {
  static async getDeadlines(tenantId: string) {
    const today = new Date();
    // Logic to generate recurrent dates:
    // 20th of every month: VAT / PAYE
    // 9th of every month: SHIF/NSSF
    return [
      { name: "VAT Return (KRA)", dueDate: new Date(today.getFullYear(), today.getMonth(), 20), priority: "CRITICAL" },
      { name: "LSK Practicing Certificate Renewal", dueDate: new Date(today.getFullYear(), 11, 31), priority: "HIGH" }
    ];
  }
}