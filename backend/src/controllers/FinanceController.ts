import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * 1. INITIATE DRN (Koki's Request)
 */
export const initiateDRN = async (req: any, res: any) => {
  const { matterId, amount, description, category } = req.body;
  
  // Logic: Court/Filing fees come from TRUST, others from OFFICE
  const trustCategories = ['COURT_FEES', 'FILING_FEES', 'STAMP_DUTY'];
  const accountType = trustCategories.includes(category) ? 'TRUST' : 'OFFICE';

  try {
    const drn = await prisma.transaction.create({
      data: {
        amount: parseFloat(amount),
        description: `DRN: ${description}`,
        type: 'DEBIT',
        accountType: accountType,
        matterId: parseInt(matterId),
        status: 'PENDING_APPROVAL',
        category: category 
      }
    });
    res.json({ success: true, data: drn });
  } catch (error) {
    res.status(500).json({ error: "Failed to initiate DRN" });
  }
};

/**
 * 2. GET ALL PENDING APPROVALS (Stanley's View)
 */
export const getPendingApprovals = async (req: any, res: any) => {
  try {
    const pending = await prisma.transaction.findMany({
      where: { status: 'PENDING_APPROVAL' },
      include: { matter: true },
      orderBy: { date: 'desc' }
    });
    res.json(pending);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch approvals" });
  }
};

/**
 * 3. PROCESS APPROVAL/REJECTION (Stanley's Action)
 */
export const processApproval = async (req: any, res: any) => {
  const { id } = req.params;
  const { action } = req.body; // 'APPROVE' or 'REJECT'

  try {
    if (action === 'APPROVE') {
      const transaction = await prisma.transaction.findUnique({ 
        where: { id: parseInt(id) } 
      });
      
      if (!transaction) return res.status(404).json({ error: "Transaction not found" });

      // THE FINANCIAL HANDSHAKE: Atomic update of status and balance
      await prisma.$transaction([
        prisma.transaction.update({
          where: { id: parseInt(id) },
          data: { status: 'APPROVED' }
        }),
        prisma.account.update({
          where: { type: transaction.accountType },
          data: { balance: { decrement: transaction.amount } }
        })
      ]);
    } else {
      await prisma.transaction.update({
        where: { id: parseInt(id) },
        data: { status: 'REJECTED' }
      });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Processing failed. Check account balances." });
  }
};

/**
 * 4. GET MATTER LEDGER (Reconciliation View)
 */
export const getMatterLedger = async (req: any, res: any) => {
  const { matterId } = req.params;

  try {
    const transactions = await prisma.transaction.findMany({
      where: { matterId: parseInt(matterId) },
      orderBy: { date: 'asc' }
    });

    const totalCredits = transactions
      .filter(t => t.type === 'CREDIT' && t.status === 'COMPLETED')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalDebits = transactions
      .filter(t => t.type === 'DEBIT' && t.status === 'APPROVED')
      .reduce((sum, t) => sum + t.amount, 0);

    res.json({
      matterId,
      history: transactions,
      summary: {
        totalDeposited: totalCredits,
        totalSpent: totalDebits,
        availableTrust: totalCredits - totalDebits 
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Could not fetch ledger" });
  }
};