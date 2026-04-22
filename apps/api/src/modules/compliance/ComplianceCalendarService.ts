// apps/api/src/modules/compliance/ComplianceCalendarService.ts

function subtractDays(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function addDays(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export class ComplianceCalendarService {
  static async getDeadlines(
    db: any,
    params: {
      tenantId: string;
      reviewWindowDays?: number;
      kycReviewAgeDays?: number;
      screeningReviewAgeDays?: number;
    },
  ) {
    if (!params.tenantId?.trim()) {
      throw Object.assign(new Error('Tenant ID is required for compliance calendar'), {
        statusCode: 400,
        code: 'COMPLIANCE_CALENDAR_TENANT_REQUIRED',
      });
    }

    const reviewWindowDays = params.reviewWindowDays ?? 30;
    const kycReviewAgeDays = params.kycReviewAgeDays ?? 365;
    const screeningReviewAgeDays = params.screeningReviewAgeDays ?? 180;

    const kycThreshold = subtractDays(kycReviewAgeDays);
    const screeningThreshold = subtractDays(screeningReviewAgeDays);
    const reviewWindowEnd = addDays(reviewWindowDays);

    const [
      kycDueClients,
      pepDueClients,
      sanctionsDueClients,
      highRiskClients,
      pendingReviewReports,
      rejectedReports,
    ] = await Promise.all([
      db.client.findMany({
        where: {
          tenantId: params.tenantId,
          OR: [
            { lastKycReviewedAt: null },
            { lastKycReviewedAt: { lt: kycThreshold } },
            { kycStatus: 'PENDING' },
          ],
        },
        select: {
          id: true,
          name: true,
          clientCode: true,
          kycStatus: true,
          riskBand: true,
          lastKycReviewedAt: true,
        },
        orderBy: [{ lastKycReviewedAt: 'asc' }, { createdAt: 'asc' }],
        take: 50,
      }),
      db.client.findMany({
        where: {
          tenantId: params.tenantId,
          OR: [
            { lastPepScreenedAt: null },
            { lastPepScreenedAt: { lt: screeningThreshold } },
            { pepStatus: 'REVIEW_REQUIRED' },
            { pepStatus: 'MATCHED' },
          ],
        },
        select: {
          id: true,
          name: true,
          clientCode: true,
          pepStatus: true,
          riskBand: true,
          lastPepScreenedAt: true,
        },
        orderBy: [{ lastPepScreenedAt: 'asc' }, { createdAt: 'asc' }],
        take: 50,
      }),
      db.client.findMany({
        where: {
          tenantId: params.tenantId,
          OR: [
            { lastSanctionsScreenedAt: null },
            { lastSanctionsScreenedAt: { lt: screeningThreshold } },
            { sanctionsStatus: 'REVIEW_REQUIRED' },
            { sanctionsStatus: 'MATCHED' },
          ],
        },
        select: {
          id: true,
          name: true,
          clientCode: true,
          sanctionsStatus: true,
          riskBand: true,
          lastSanctionsScreenedAt: true,
        },
        orderBy: [{ lastSanctionsScreenedAt: 'asc' }, { createdAt: 'asc' }],
        take: 50,
      }),
      db.client.findMany({
        where: {
          tenantId: params.tenantId,
          OR: [
            { riskBand: 'HIGH' },
            { riskBand: 'CRITICAL' },
            { needsEnhancedDueDiligence: true },
          ],
        },
        select: {
          id: true,
          name: true,
          clientCode: true,
          riskScore: true,
          riskBand: true,
          needsEnhancedDueDiligence: true,
          lastRiskAssessedAt: true,
        },
        orderBy: [{ riskScore: 'desc' }, { updatedAt: 'desc' }],
        take: 50,
      }),
      db.complianceReport.findMany({
        where: {
          tenantId: params.tenantId,
          status: 'PENDING_REVIEW',
          OR: [
            { periodEnd: null },
            { periodEnd: { lte: reviewWindowEnd } },
          ],
        },
        orderBy: [{ periodEnd: 'asc' }, { createdAt: 'desc' }],
        take: 50,
      }),
      db.complianceReport.findMany({
        where: {
          tenantId: params.tenantId,
          status: 'REJECTED',
        },
        orderBy: [{ updatedAt: 'desc' }],
        take: 50,
      }),
    ]);

    return {
      tenantId: params.tenantId,
      generatedAt: new Date(),
      parameters: {
        reviewWindowDays,
        kycReviewAgeDays,
        screeningReviewAgeDays,
      },
      deadlines: {
        kycDueClients,
        pepDueClients,
        sanctionsDueClients,
        highRiskClients,
        pendingReviewReports,
        rejectedReports,
      },
      summary: {
        kycDueCount: kycDueClients.length,
        pepDueCount: pepDueClients.length,
        sanctionsDueCount: sanctionsDueClients.length,
        highRiskClientCount: highRiskClients.length,
        pendingReviewReportCount: pendingReviewReports.length,
        rejectedReportCount: rejectedReports.length,
      },
    };
  }
}

export default ComplianceCalendarService;