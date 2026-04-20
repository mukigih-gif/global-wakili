import type { Job } from 'bullmq';
import prisma from '../../../../config/database';
import { BankSyncService } from '../../../integrations/banking/bank-sync.service';

type BankSyncPayload = {
  tenantId: string;
  provider: 'equity' | 'kcb' | 'ncba' | 'mpesa';
  accountId: string;
  requestId?: string;
  startDate?: string;
  endDate?: string;
};

export async function handleBankSyncJob(
  job: Job<Record<string, unknown>, unknown, 'bank.sync.account'>,
): Promise<{ success: boolean; provider: string; importedCount: number }> {
  const payload = job.data as unknown as BankSyncPayload;

  const result = await BankSyncService.runSync(prisma, {
    tenantId: payload.tenantId,
    provider: payload.provider,
    accountId: payload.accountId,
    startDate: payload.startDate ? new Date(payload.startDate) : undefined,
    endDate: payload.endDate ? new Date(payload.endDate) : undefined,
  });

  return {
    success: true,
    provider: payload.provider,
    importedCount: result.importedCount,
  };
}