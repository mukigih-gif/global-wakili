// apps/api/src/modules/ai/AIBillingInsightService.ts

import type { AIExecutionResult } from './ai.types';

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export class AIBillingInsightService {
  static analyze(payload: Record<string, unknown>): AIExecutionResult {
    const invoices = Array.isArray(payload.invoices)
      ? payload.invoices.map((item) => ({
          invoiceNumber: String((item as any).invoiceNumber ?? ''),
          status: String((item as any).status ?? ''),
          total: toNumber((item as any).total),
          balanceDue: toNumber((item as any).balanceDue),
          paidAmount: toNumber((item as any).paidAmount),
          dueDate: (item as any).dueDate ? new Date(String((item as any).dueDate)) : null,
        }))
      : [];

    const totalInvoiced = invoices.reduce((sum, item) => sum + item.total, 0);
    const totalOutstanding = invoices.reduce((sum, item) => sum + item.balanceDue, 0);
    const overdue = invoices.filter(
      (item) => item.dueDate && item.dueDate.getTime() < Date.now() && item.balanceDue > 0,
    );

    return {
      title: 'Billing Insights',
      summary: `Reviewed ${invoices.length} invoice(s), with ${overdue.length} overdue and ${totalOutstanding} outstanding.`,
      output: {
        invoiceCount: invoices.length,
        totalInvoiced,
        totalOutstanding,
        overdueCount: overdue.length,
        overdueInvoices: overdue,
      },
      recommendations: [
        {
          category: 'billing-insight',
          title: 'Escalate overdue receivables',
          summary: 'Outstanding and overdue invoices should be reviewed for collection priority and client communication.',
          recommendation: {
            prioritizeCollections: overdue.length > 0,
            monitorOutstandingBalance: totalOutstanding > 0,
          },
          confidence: 0.83,
        },
      ],
      requiresHumanReview: overdue.length > 0 || totalOutstanding > 0,
      reviewReason:
        overdue.length > 0 || totalOutstanding > 0
          ? 'Billing insight outputs should be reviewed before client-facing action.'
          : null,
    };
  }
}

export default AIBillingInsightService;