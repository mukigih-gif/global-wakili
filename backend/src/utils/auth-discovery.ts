// backend/src/utils/auth-discovery.ts
import { PrismaClient } from '../../prisma/generated/client';

const prisma = new PrismaClient();

export async function discoverAuthMethod(email: string) {
  // 1. Extract the domain (e.g., 'wakili-advocates.co.ke')
  const domain = email.split('@')[1]?.toLowerCase();
  
  if (!domain) return { strategy: 'LOCAL' };

  // 2. Lookup the tenant by domain
  const tenant = await prisma.tenant.findUnique({
    where: { domain: domain },
    select: {
      authStrategy: true,
      ssoClientId: true,
      name: true
    }
  });

  // 3. Return the routing instructions to the frontend
  if (!tenant) {
    return { strategy: 'LOCAL' }; // Fallback to standard login
  }

  return {
    strategy: tenant.authStrategy, // GOOGLE, AZURE_AD, or LOCAL
    tenantName: tenant.name,
    clientId: tenant.ssoClientId // Used if the firm has a custom branded app
  };
}