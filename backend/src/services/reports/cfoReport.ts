// src/services/reports/cfoReport.ts
export const generateCFOReport = (summary: any) => {
  return {
    reportTitle: "Monthly Total Labor Cost (TCOE)",
    generatedAt: new Date().toISOString(),
    metrics: [
      { label: "Net Salary Disbursement", value: summary.totalNetPay, type: "cash_out" },
      { label: "KRA Tax Liability (PAYE + Levy)", value: summary.totalPAYE + summary.totalHousingLevy_Combined, type: "statutory" },
      { label: "Social Security (NSSF + SHIF)", value: summary.totalNSSF_Combined + summary.totalSHIF, type: "statutory" },
      { label: "Firm Total Liability", value: summary.firmTotalLiability, type: "total_cost" }
    ],
    alert: summary.firmTotalLiability > 5000000 ? "HIGH OVERHEAD ALERT" : "Normal"
  };
};