import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class QueueWorker {
  static async processQueue() {
    const pendingJobs = await prisma.externalJobQueue.findMany({
      where: { status: { in: ['QUEUED', 'RETRYING'] } },
      take: 10
    });

    for (const job of pendingJobs) {
      try {
        await prisma.externalJobQueue.update({ where: { id: job.id }, data: { status: 'PROCESSING' } });

        // Logic Switch based on serviceType (ETIMS or BANKING)
        if (job.serviceType === 'ETIMS_INVOICE_SUBMISSION') {
           // await eTimsAdapter.submit(job.payload.invoiceId);
        }

        await prisma.externalJobQueue.update({
          where: { id: job.id },
          data: { status: 'COMPLETED', processedAt: new Date() }
        });
      } catch (error) {
        const nextStatus = job.retryCount < 3 ? 'RETRYING' : 'FAILED';
        await prisma.externalJobQueue.update({
          where: { id: job.id },
          data: { 
            status: nextStatus, 
            retryCount: { increment: 1 },
            lastError: error.message 
          }
        });
      }
    }
  }
}