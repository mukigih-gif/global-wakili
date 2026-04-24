import { prisma } from '../../config/database';

export const seedChartOfAccounts = async (tenantId: string) => {
  const accounts = [
    // 🏦 TRUST
    {
      code: '1001',
      name: 'Trust Bank Account',
      type: 'ASSET',
      subtype: 'TRUST',
    },
    {
      code: '2001',
      name: 'Client Trust Liability',
      type: 'LIABILITY',
      subtype: 'TRUST',
    },

    // 🏢 OFFICE
    {
      code: '1002',
      name: 'Office Bank Account',
      type: 'ASSET',
      subtype: 'OFFICE',
    },

    // 💰 REVENUE
    {
      code: '4001',
      name: 'Legal Fees Income',
      type: 'INCOME',
    },

    // 📄 EXPENSE
    {
      code: '5001',
      name: 'Disbursements',
      type: 'EXPENSE',
    },

    // 🧾 VAT
    {
      code: '2101',
      name: 'VAT Payable',
      type: 'LIABILITY',
      subtype: 'VAT',
    },
  ];

  for (const acc of accounts) {
    await prisma.account.create({
      data: { ...acc, tenantId },
    });
  }
};