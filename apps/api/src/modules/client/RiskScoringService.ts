export type RiskBand = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export class RiskScoringService {
  static computeRiskBand(score: number): RiskBand {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 35) return 'MEDIUM';
    return 'LOW';
  }

  static async compute(
    db: any,
    params: {
      tenantId: string;
      clientId: string;
      kyc?: {
        status?: string | null;
        requiresEnhancedDueDiligence?: boolean;
      } | null;
      pep?: {
        status?: string | null;
      } | null;
      sanctions?: {
        status?: string | null;
      } | null;
      persistResult?: boolean;
      createdById?: string | null;
    },
  ) {
    const persistResult = params.persistResult ?? false;

    const client = await db.client.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.clientId,
      },
      select: {
        id: true,
        type: true,
        taxExempt: true,
        metadata: true,
      },
    });

    if (!client) {
      throw Object.assign(new Error('Client not found'), {
        statusCode: 404,
        code: 'MISSING_CLIENT',
      });
    }

    let score = 0;
    const factors: string[] = [];

    if (params.kyc?.status === 'INCOMPLETE') {
      score += 20;
      factors.push('Incomplete KYC');
    }

    if (params.kyc?.requiresEnhancedDueDiligence) {
      score += 25;
      factors.push('Enhanced due diligence required');
    }

    if (params.pep?.status === 'MATCHED') {
      score += 30;
      factors.push('PEP match');
    } else if (params.pep?.status === 'REVIEW_REQUIRED') {
      score += 15;
      factors.push('PEP review required');
    }

    if (params.sanctions?.status === 'MATCHED') {
      score += 50;
      factors.push('Sanctions match');
    } else if (params.sanctions?.status === 'REVIEW_REQUIRED') {
      score += 25;
      factors.push('Sanctions review required');
    }

    if (client.type === 'STATE_AGENCY') {
      score += 10;
      factors.push('State agency client');
    }

    if (client.metadata?.highRiskJurisdiction === true) {
      score += 20;
      factors.push('High-risk jurisdiction flag');
    }

    if (client.taxExempt) {
      score += 5;
      factors.push('Tax exempt profile');
    }

    score = Math.max(0, Math.min(100, score));
    const riskBand = this.computeRiskBand(score);

    const result = {
      clientId: client.id,
      score,
      riskBand,
      factors,
      assessedAt: new Date(),
    };

    if (persistResult) {
      await db.client.update({
        where: { id: client.id },
        data: {
          riskScore: score,
          riskBand,
          needsEnhancedDueDiligence:
            params.kyc?.requiresEnhancedDueDiligence === true ||
            riskBand === 'HIGH' ||
            riskBand === 'CRITICAL',
          lastRiskAssessedAt: result.assessedAt,
          metadata: {
            ...(client.metadata ?? {}),
            compliance: {
              ...(client.metadata?.compliance ?? {}),
              risk: {
                score,
                riskBand,
                factors,
                assessedAt: result.assessedAt.toISOString(),
              },
            },
          },
        },
      });

      if (db.clientComplianceCheck?.create) {
        await db.clientComplianceCheck.create({
          data: {
            tenantId: params.tenantId,
            clientId: client.id,
            checkType: 'RISK',
            status: riskBand,
            score,
            riskBand,
            source: 'internal-risk-engine',
            resultPayload: result,
            createdById: params.createdById ?? null,
            checkedAt: result.assessedAt,
          },
        });
      }
    }

    return result;
  }
}