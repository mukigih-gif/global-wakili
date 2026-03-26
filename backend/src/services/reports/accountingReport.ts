// src/services/reports/accountingReport.ts
export const generateRemittanceSchedule = (entries: any[]) => {
  const totals = entries.reduce((acc, curr) => ({
    kra: acc.kra + Number(curr.paye) + (Number(curr.housingLevy) * 2), // Employee + Employer
    nssf: acc.nssf + Number(curr.nssfEmployee) + Number(curr.nssfEmployer),
    shif: acc.shif + Number(curr.shif)
  }), { kra: 0, nssf: 0, shif: 0 });

  return [
    { payee: "KRA (iTax)", amount: totals.kra, deadline: "9th of Month", account: "PAYE/Housing Levy" },
    { payee: "NSSF (e-Slip)", amount: totals.nssf, deadline: "9th of Month", account: "Pension Tier I & II" },
    { payee: "Social Health Authority", amount: totals.shif, deadline: "9th of Month", account: "SHIF Medical" }
  ];
};