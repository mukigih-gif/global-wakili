// apps/api/src/modules/ai/AITrustComplianceAlertService.ts

import type { AIExecutionResult } from './ai.types';

export class AITrustComplianceAlertService {
  static analyze(payload: Record<string, unknown>): AIExecutionResult {
    const trustBalance = Number(payload.trustBalance ?? 0);
    const unreconciledCount = Number(payload.unreconciledCount ?? 0);
    const clientRiskBand = payload.clientRiskBand ? String(payload.clientRiskBand) : null;
    const complianceReportStatus = payload.complianceReportStatus
      ? String(payload.complianceReportStatus)
      : null;
    const suspiciousFlags = Array.isArray(payload.suspiciousFlags)
      ? payload.suspiciousFlags.map((item) => String(item))
      : [];

    const severity =
      suspiciousFlags.length > 0 || unreconciledCount > 0 || clientRiskBand === 'CRITICAL'
        ? 'HIGH'
        : trustBalance > 0
          ? 'MEDIUM'
          : 'LOW';

    return {
      title: 'Trust & Compliance Alerts',
      summary: `Generated trust/compliance review with severity ${severity}.`,
      output: {
        severity,
        trustBalance,
        unreconciledCount,
        clientRiskBand,
        complianceReportStatus,
        suspiciousFlags,
      },
      recommendations: [
        {
          category: 'trust-compliance-alert',
          title: 'Review trust and compliance exceptions',
          summary: 'Unreconciled trust activity, suspicious flags, and high client risk require immediate human review.',
          recommendation: {
            immediateReview: severity === 'HIGH',
            escalateCompliance: suspiciousFlags.length > 0,
            reconcileTrust: unreconciledCount > 0,
          },
          confidence: 0.9,
        },
      ],
      requiresHumanReview: true,
      reviewReason: 'Trust and compliance alerts must always remain human-reviewed.',
    };
  }
}

export default AITrustComplianceAlertService;