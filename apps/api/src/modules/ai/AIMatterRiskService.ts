// apps/api/src/modules/ai/AIMatterRiskService.ts

import type { AIExecutionResult } from './ai.types';

function band(score: number): string {
  if (score >= 85) return 'CRITICAL';
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

export class AIMatterRiskService {
  static analyze(payload: Record<string, unknown>): AIExecutionResult {
    const matterName = String(payload.matterName ?? 'Matter Risk Review').trim();
    const inputRisk = Number(payload.riskScore ?? 0);
    const overdueDeadlines = Number(payload.overdueDeadlines ?? 0);
    const outstandingInvoices = Number(payload.outstandingInvoices ?? 0);
    const openTasks = Number(payload.openTasks ?? 0);
    const complianceFlags = Array.isArray(payload.complianceFlags)
      ? payload.complianceFlags.map((item) => String(item))
      : [];

    const computedRisk =
      Math.min(
        100,
        inputRisk +
          overdueDeadlines * 8 +
          outstandingInvoices * 4 +
          openTasks * 1 +
          complianceFlags.length * 10,
      ) || 0;

    const riskBand = band(computedRisk);

    return {
      title: `${matterName} Risk Assessment`,
      summary: `Matter risk evaluated at ${computedRisk}/100 (${riskBand}).`,
      output: {
        matterName,
        inputRisk,
        computedRisk,
        riskBand,
        overdueDeadlines,
        outstandingInvoices,
        openTasks,
        complianceFlags,
      },
      recommendations: [
        {
          category: 'matter-risk',
          title: 'Review elevated matter risk factors',
          summary: 'Escalate matters with high composite risk, overdue deadlines, and compliance flags.',
          recommendation: {
            escalateIfHighRisk: riskBand === 'HIGH' || riskBand === 'CRITICAL',
            reviewDeadlines: overdueDeadlines > 0,
            reviewComplianceFlags: complianceFlags.length > 0,
          },
          confidence: 0.79,
        },
      ],
      requiresHumanReview: riskBand !== 'LOW',
      reviewReason:
        riskBand !== 'LOW'
          ? 'Matter risk signals should be reviewed by a responsible legal or compliance user.'
          : null,
    };
  }
}

export default AIMatterRiskService;