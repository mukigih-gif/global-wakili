import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * FETCH CLIENT DASHBOARD
 * Returns all matters, documents, hearings, and trust transactions 
 */
export const getClientDashboard = async (req: any, res: any) => {
  const clientId = req.user?.id || 1; 

  try {
    const data = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        matters: {
          include: {
            documents: { orderBy: { createdAt: 'desc' } },
            hearings: { orderBy: { hearingDate: 'asc' } },
            transactions: { 
              where: { accountType: 'TRUST' },
              orderBy: { date: 'desc' } 
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 10 
            }
          }
        }
      }
    });

    if (!data) return res.status(404).json({ error: "Client profile not found" });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to load portal dashboard" });
  }
};

/**
 * PROCESS CLIENT DEPOSIT (Manual/Internal Trigger)
 */
export const processClientDeposit = async (req: any, res: any) => {
  const { matterId, amount, description } = req.body;
  const clientId = req.user?.id || 1;

  try {
    const matter = await prisma.matter.findFirst({
      where: { id: parseInt(matterId), clientId: clientId }
    });

    if (!matter) return res.status(403).json({ error: "Unauthorized" });

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          amount: parseFloat(amount),
          description: description || "Portal Deposit",
          type: 'CREDIT',
          accountType: 'TRUST',
          matterId: parseInt(matterId),
          status: 'COMPLETED'
        }
      });

      await tx.account.update({
        where: { type: 'TRUST' },
        data: { balance: { increment: parseFloat(amount) } }
      });

      return transaction;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: "Deposit processing failed" });
  }
};

/**
 * MPESA CALLBACK (Automated Reconciliation)
 * Handles the async confirmation from Safaricom Daraja API
 */
export const mpesaCallback = async (req: any, res: any) => {
  const { Body } = req.body;
  
  // ResultCode 0 means the transaction was successful
  if (Body.stkCallback.ResultCode === 0) {
    const metadata = Body.stkCallback.CallbackMetadata.Item;
    const amount = metadata.find((i: any) => i.Name === 'Amount').Value;
    const mpesaCode = metadata.find((i: any) => i.Name === 'MpesaReceiptNumber').Value;
    
    // This is the 'MAT-XXX' or 'DEP-XXX' we sent in the STK Push
    const reference = Body.stkCallback.ExternalReference || ""; 

    let matterId: number | null = null;
    
    // Logic to parse the reference and assign to the correct matter
    if (reference.startsWith('MAT-')) {
      matterId = parseInt(reference.split('-')[1]);
    }

    try {
      await prisma.$transaction([
        prisma.transaction.create({
          data: {
            amount: parseFloat(amount),
            description: `M-Pesa Ref: ${mpesaCode} | ${reference}`,
            type: 'CREDIT',
            accountType: 'TRUST',
            matterId: matterId, // Assigns to matter if MAT- ref was used
            status: 'COMPLETED'
          }
        }),
        prisma.account.update({
          where: { type: 'TRUST' },
          data: { balance: { increment: parseFloat(amount) } }
        })
      ]);
      console.log(`✅ Payment Reconciled: ${mpesaCode} for ${reference}`);
    } catch (dbError) {
      console.error("❌ Callback DB Error:", dbError);
    }
  } else {
    console.log(`❌ M-Pesa Transaction Cancelled/Failed: ${Body.stkCallback.ResultDesc}`);
  }

  // Safaricom expects a success response regardless of ResultCode to stop retrying
  res.json({ success: true });
};