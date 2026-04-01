// apps/api/src/types/express.d.ts
import { PrismaClient } from '@global-wakili/database';

declare global {
  namespace Express {
    interface Request {
      // The ONLY way to access the DB in a controller
      db: ReturnType<typeof import('@global-wakili/database').getTenantClient>;
      tenant: {
        id: string;
        slug: string;
        plan: string;
      };
      user: {
        id: string;
        roles: string[];
        isSuperAdmin: boolean;
      };
    }
  }
}