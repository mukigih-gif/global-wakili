// apps/api/src/modules/finance/chart-of-accounts.ts

import { prisma } from '../../config/database';
import { CoaService, type CoaDbClient } from './coa.service';

export const seedChartOfAccounts = async (tenantId: string) => {
  if (typeof tenantId !== 'string' || !tenantId.trim()) {
    throw Object.assign(new Error('Tenant ID is required'), {
      statusCode: 422,
      code: 'FINANCE_TENANT_REQUIRED',
    });
  }

  return CoaService.seedDefaults(prisma as CoaDbClient, tenantId.trim(), {
    overwriteNames: false,
  });
};

export default seedChartOfAccounts;