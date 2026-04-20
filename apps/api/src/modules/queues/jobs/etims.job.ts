import type { Job } from 'bullmq';
import { ETimsQueueService } from '../../../integrations/etims/eTimsQueueService';

type EtimsSubmitInvoicePayload = {
  tenantId: string;
  invoiceId: string;
  requestId?: string;
};

type EtimsSyncStatusPayload = {
  tenantId: string;
  invoiceId: string;
  etimsReference: string;
  requestId?: string;
};

export async function handleEtimsJob(
  job: Job<Record<string, unknown>, unknown, 'etims.submit.invoice' | 'etims.sync.status'>,
): Promise<{ success: boolean; jobName: string; result: unknown }> {
  switch (job.name) {
    case 'etims.submit.invoice': {
      const payload = job.data as unknown as EtimsSubmitInvoicePayload;
      const result = await ETimsQueueService.handleSubmitJob(payload);

      return {
        success: true,
        jobName: job.name,
        result,
      };
    }

    case 'etims.sync.status': {
      const payload = job.data as unknown as EtimsSyncStatusPayload;
      const result = await ETimsQueueService.handleStatusSyncJob(payload);

      return {
        success: true,
        jobName: job.name,
        result,
      };
    }

    default:
      throw new Error(`Unsupported eTIMS job: ${job.name as string}`);
  }
}