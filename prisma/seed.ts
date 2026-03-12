import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Seed: Global Wakili Finance Module ---');

  // 1. Create Firm Bank Accounts
  const trustAccount = await prisma.account.create({
    data: {
      name: "Stanbic - Trust Account",
      bankName: "Stanbic Bank",
      accountName: "Global Sites Ltd - Trust",
      accountNo: "0100001234567",
      type: "TRUST",
      balance: 0.0,
    },
  });

  const officeAccount = await prisma.account.create({
    data: {
      name: "Co-op - Office Account",
      bankName: "Co-operative Bank",
      accountName: "Global Sites Ltd - Office",
      accountNo: "0112900987654",
      paybillNo: "400222",
      type: "OFFICE",
      balance: 50000.0, // Starting office float
    },
  });

  // 2. Create a Test Client
  const client = await prisma.client.create({
    data: {
      name: "John Doe",
      email: "j.doe@example.com",
      phone: "+254700111222",
      kraPin: "A001234567Z",
    },
  });

  // 3. Create a Matter (The Container for Finance)
  const matter = await prisma.matter.create({
    data: {
      reference: "GSL/LIT/2026/001",
      title: "John Doe vs. State Corporation - Land Dispute",
      matterType: "Civil Litigation",
      stage: "Mention",
      clientId: client.id,
    },
  });

  // 4. Simulate a Deposit (Client pays 100k Retainer)
  await prisma.receipt.create({
    data: {
      receiptNo: "RCP-2026-001",
      amount: 100000.0,
      paymentMode: "M-PESA",
      reference: "RGC1234567", // Simulated M-Pesa Ref
      matterId: matter.id,
    },
  });

  // 5. Create Unbilled Time Entries (Work done by the firm)
  await prisma.timeEntry.createMany({
    data: [
      {
        description: "Reviewing title deed and survey maps",
        duration: 2.5,
        rate: 5000.0,
        matterId: matter.id,
        status: "UNBILLED",
      },
      {
        description: "Drafting Plaint and Affidavit",
        duration: 4.0,
        rate: 5000.0,
        matterId: matter.id,
        status: "UNBILLED",
      },
    ],
  });

  // 6. Record a Disbursement (Firm pays court filing fees)
  await prisma.expense.create({
    data: {
      category: "Court Filing Fees",
      type: "DISBURSEMENT",
      amount: 4500.0,
      matterId: matter.id,
      accountId: trustAccount.id,
    },
  });

  console.log('--- Seed Complete: Ready for 360 Testing ---');
  console.log(`Created Trust Account: ${trustAccount.name}`);
  console.log(`Created Matter: ${matter.reference}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });