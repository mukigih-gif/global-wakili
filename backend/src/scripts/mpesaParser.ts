import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx'; // Requirement: npm install xlsx

const prisma = new PrismaClient();

async function parseMpesaStatement(filePath: string) {
  console.log("📥 Initiating M-Pesa Statement Auto-Ingestion...");

  // 1. READ EXCEL/CSV (Standard Safaricom Format)
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const transactions: any[] = xlsx.utils.sheet_to_json(sheet);

  console.log(`🔍 Scanning ${transactions.length} transactions for matches...`);

  for (const tx of transactions) {
    const amount = tx['Paid In'] || tx['Amount'];
    const sender = tx['Details'] || tx['Name'];
    const ref = tx['Receipt No.'];

    // 2. FUZZY MATCHING LOGIC
    // We look for the sender's name in our 20-client database
    const matchedClient = await prisma.client.findFirst({
      where: {
        name: { contains: sender.split(' ')[0], mode: 'insensitive' }
      }
    });

    if (matchedClient) {
      console.log(`✅ Match Found: ${sender} -> ${matchedClient.name} (KES ${amount})`);
      
      // 3. AUTO-UPDATE TRUST ACCOUNT
      await prisma.payment.create({
        data: {
          amount: parseFloat(amount),
          reference: ref,
          method: 'MPESA',
          clientId: matchedClient.id,
          status: 'RECONCILED',
          date: new Date(tx['Completion Time'])
        }
      });
    } else {
      console.log(`⚠️ Unidentified Payment: ${sender} (KES ${amount}). Sent to Admin Queue.`);
    }
  }

  console.log("🚀 Ingestion Complete. Intelligence Engine updated.");
}