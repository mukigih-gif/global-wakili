// ConflictCheckService.ts

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class ConflictCheckService {
  /**
   * Scans the entire firm (all branches) for potential conflicts
   * @param firmId The ID of the tenant
   * @param prospectiveName Name of the person/entity the firm wants to represent or oppose
   */
  async runGlobalConflictCheck(firmId: string, prospectiveName: string) {
    // 1. Clean the name for better matching (removing 'Ltd', 'Inc', etc.)
    const cleanName = prospectiveName.toLowerCase().replace(/ltd|inc|limited|co/g, '').trim();

    // 2. Search across three critical areas:
    const [existingClients, pastConflictParties, existingPayerConflicts] = await Promise.all([
      // Check if they are already a client in ANY branch
      prisma.client.findMany({
        where: {
          firmId,
          name: { contains: cleanName, mode: 'insensitive' }
        },
        select: { name: true, id: true }
      }),

      // Check the ConflictRegistry (Opposing parties in other matters)
      prisma.conflictRegistry.findMany({
        where: {
          matter: { firmId },
          partyName: { contains: cleanName, mode: 'insensitive' }
        },
        include: { matter: { select: { title: true, caseNumber: true } } }
      }),

      // Check if they are a blocked payer (ConflictPayer model)
      prisma.conflictPayer.findMany({
        where: {
          matter: { firmId },
          entityName: { contains: cleanName, mode: 'insensitive' }
        }
      })
    ]);

    // 3. Determine Risk Level
    const totalHits = existingClients.length + pastConflictParties.length + existingPayerConflicts.length;
    let status = "CLEAN";
    if (totalHits > 0) status = totalHits > 3 ? "HIGH_RISK" : "POTENTIAL_CONFLICT";

    return {
      status,
      hits: {
        clients: existingClients,
        opposingParties: pastConflictParties,
        blockedPayers: existingPayerConflicts
      },
      timestamp: new Date()
    };
  }
}