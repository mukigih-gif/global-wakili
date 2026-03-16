import { generateDraftInvoice } from '../services/billingService';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const generateInvoiceController = async (req, res) => {
  const { matterId } = req.params;

  try {
    const invoiceData = await generateDraftInvoice(parseInt(matterId));

    // After calculating the total, we mark all included entries as BILLED
    await prisma.timeEntry.updateMany({
      where: { matterId: parseInt(matterId), isBilled: false },
      data: { isBilled: true }
    });

    // In a full production app, this is where you'd trigger a PDF library like 'jspdf'
    res.json({ success: true, invoice: invoiceData });
  } catch (error) {
    res.status(500).json({ error: "Invoice generation failed" });
  }
};