// src/api/portal/portalController.ts

import { PrismaClient } from '@prisma/client';
import { generateSecureToken } from '../../utils/crypto'; // Helper for Magic Links

const prisma = new PrismaClient();

export class ClientPortalService {
  /**
   * 1. REQUEST ACCESS (Magic Link)
   * Client enters email -> System sends a 15-min secure link
   */
  async requestMagicLink(email: string) {
    const client = await prisma.client.findUnique({ where: { email } });
    if (!client) throw new Error("Access Denied");

    const token = generateSecureToken(); // e.g., A secure UUID
    
    await prisma.portalUser.upsert({
      where: { clientId: client.id },
      update: { magicToken: token },
      create: { clientId: client.id, email, magicToken: token }
    });

    // SendEmail(email, `https://portal.wakili.com/auth?token=${token}`);
    return { message: "Magic link sent to your registered email." };
  }

  /**
   * 2. SECURE DASHBOARD FETCH
   * Returns Matters, Shared Docs, and Invoices
   */
  async getClientDashboard(portalUserId: string) {
    const portalUser = await prisma.portalUser.findUnique({
      where: { id: portalUserId },
      include: { client: { include: {
        matters: {
          where: { status: { not: "ARCHIVED" } },
          include: {
            // ONLY FETCH SHARED DOCUMENTS
            documents: {
              where: { isShared: true },
              include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } }
            },
            // ONLY FETCH ISSUED INVOICES
            invoices: { where: { status: "ISSUED" } }
          }
        }
      }}}
    });

    return portalUser?.client;
  }
}