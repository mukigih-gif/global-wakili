// src/services/reports/commissionReport.ts
export const generateFinderFeeReport = (entries: any[]) => {
  return entries
    .filter(e => Number(e.commissions) > 0)
    .map(e => ({
      lawyer: `${e.employee.firstName} ${e.employee.lastName}`,
      findersFee: Number(e.commissions),
      percentageOfGross: (Number(e.commissions) / Number(e.grossPay)) * 100
    }))
    .sort((a, b) => b.findersFee - a.findersFee);
};