import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

export async function ... // your functions
const prisma = new PrismaClient();

/**
 * SYNC E-FILING STATUS
 * Professional version for Global Wakili Module #9
 */
export async function syncEfilingStatus(documentId, status, caseNumber = null) {
  try {
    // 1. Update the document status first
    const updatedDoc = await prisma.document.update({
      where: { id: documentId },
      data: { efilingStatus: status },
      select: { matterId: true, name: true }
    });

    // 2. If a Case Number is provided, update the Matter & change stage
    if (caseNumber) {
      await prisma.matter.update({
        where: { id: updatedDoc.matterId },
        data: { 
          caseNumber: caseNumber, 
          stage: 'PLEADINGS' // Progresses the matter automatically
        }
      });
      console.log(`✅ Matter Updated: Case ${caseNumber} is now in Pleadings.`);
    }

    console.log(`📑 Document "${updatedDoc.name}" status set to: ${status}`);
    return { success: true };

  } catch (error) {
    console.error("❌ Sync Error:", error.message);
    return { success: false, error: error.message };
  }
}