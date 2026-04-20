import type { Job } from 'bullmq';

type ReportExportPayload = {
  tenantId: string;
  module: 'finance' | 'trust' | 'payroll' | 'procurement';
  reportType: string;
  format: 'csv' | 'json' | 'xlsx' | 'pdf';
  requestedById: string;
  filters?: Record<string, unknown>;
  requestId?: string;
};

export async function handleReportExportJob(
  job: Job<Record<string, unknown>, unknown, 'report.export.generate'>,
): Promise<{ success: boolean; reportType: string }> {
  const payload = job.data as unknown as ReportExportPayload;

  console.info('[REPORT_EXPORT_JOB]', {
    jobId: job.id,
    tenantId: payload.tenantId,
    module: payload.module,
    reportType: payload.reportType,
    format: payload.format,
    requestedById: payload.requestedById,
    requestId: payload.requestId ?? null,
  });

  return {
    success: true,
    reportType: payload.reportType,
  };
}