export type MatterKycStatus =
  | 'PENDING'
  | 'INCOMPLETE'
  | 'BASIC_VERIFIED'
  | 'ENHANCED_DUE_DILIGENCE'
  | 'REJECTED';

export type MatterRiskBand =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeMatterType(input: unknown): string {
  return String(input ?? 'OTHER').trim().toUpperCase();
}

function normalizeWorkflowType(input: unknown): string {
  return String(input ?? 'GENERAL').trim().toUpperCase();
}

export class MatterKYCService {
  static computeRiskBand(score: number): MatterRiskBand {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 35) return 'MEDIUM';
    return 'LOW';
  }

  static async evaluate(
    db: any,
    params: {
      tenantId: string;
      matterId: string;
      persistResult?: boolean;
      sourceOfFundsRequired?: boolean;
      sourceOfWealthRequired?: boolean;
      createdById?: string | null;
    },
  ) {
    const persistResult = params.persistResult ?? false;
    const sourceOfFundsRequired = params.sourceOfFundsRequired ?? true;
    const sourceOfWealthRequired = params.sourceOfWealthRequired ?? false;

    const matter = await db.matter.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.matterId,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            kycStatus: true,
            pepStatus: true,
            sanctionsStatus: true,
            riskBand: true,
            riskScore: true,
            needsEnhancedDueDiligence: true,
            metadata: true,
          },
        },
      },
    });

    if (!matter) {
      throw Object.assign(new Error('Matter not found'), {
        statusCode: 404,
        code: 'MISSING_MATTER',
      });
    }

    const metadata = matter.metadata ?? {};
    const matterType = normalizeMatterType(metadata.matterType);
    const workflowType = normalizeWorkflowType(metadata.workflowType);

    const sourceOfFunds = metadata.sourceOfFunds ?? null;
    const sourceOfWealth = metadata.sourceOfWealth ?? null;
    const transactionValue = toNumber(metadata.transactionValue);
    const highRiskJurisdiction = metadata.highRiskJurisdiction === true;
    const trustSensitive = metadata.trustSensitive === true;
    const adverseMediaFlag = metadata.adverseMediaFlag === true;

    const missingFields: string[] = [];

    if (sourceOfFundsRequired && !sourceOfFunds) {
      missingFields.push('sourceOfFunds');
    }

    if (sourceOfWealthRequired && !sourceOfWealth) {
      missingFields.push('sourceOfWealth');
    }

    let score = 0;
    const factors: string[] = [];

    if (matter.client?.kycStatus === 'INCOMPLETE') {
      score += 20;
      factors.push('Client KYC incomplete');
    }

    if (matter.client?.needsEnhancedDueDiligence) {
      score += 25;
      factors.push('Client requires enhanced due diligence');
    }

    if (matter.client?.pepStatus === 'MATCHED') {
      score += 25;
      factors.push('Client PEP match');
    } else if (matter.client?.pepStatus === 'REVIEW_REQUIRED') {
      score += 10;
      factors.push('Client PEP review required');
    }

    if (matter.client?.sanctionsStatus === 'MATCHED') {
      score += 50;
      factors.push('Client sanctions match');
    } else if (matter.client?.sanctionsStatus === 'REVIEW_REQUIRED') {
      score += 20;
      factors.push('Client sanctions review required');
    }

    if (highRiskJurisdiction) {
      score += 20;
      factors.push('High-risk jurisdiction');
    }

    if (trustSensitive) {
      score += 15;
      factors.push('Trust-sensitive matter');
    }

    if (adverseMediaFlag) {
      score += 15;
      factors.push('Adverse media flag');
    }

    if (['CONVEYANCING', 'TAX', 'COMMERCIAL', 'ARBITRATION'].includes(matterType)) {
      score += 10;
      factors.push(`Higher-risk matter type: ${matterType}`);
    }

    if (workflowType === 'CONVEYANCING') {
      score += 10;
      factors.push('Property transfer workflow');
    }

    if (transactionValue !== null && transactionValue >= 10_000_000) {
      score += 20;
      factors.push('High transaction value');
    } else if (transactionValue !== null && transactionValue >= 1_000_000) {
      score += 10;
      factors.push('Moderate transaction value');
    }

    if (missingFields.length > 0) {
      score += 15;
      factors.push('Missing matter KYC fields');
    }

    score = Math.max(0, Math.min(100, score));
    const riskBand = this.computeRiskBand(score);

    let status: MatterKycStatus = 'BASIC_VERIFIED';

    if (matter.client?.sanctionsStatus === 'MATCHED') {
      status = 'REJECTED';
    } else if (
      matter.client?.needsEnhancedDueDiligence ||
      riskBand === 'HIGH' ||
      riskBand === 'CRITICAL'
    ) {
      status = 'ENHANCED_DUE_DILIGENCE';
    } else if (missingFields.length > 0) {
      status = 'INCOMPLETE';
    }

    const result = {
      matterId: matter.id,
      clientId: matter.client?.id ?? null,
      status,
      riskScore: score,
      riskBand,
      factors,
      matterType,
      workflowType,
      missingFields,
      evaluatedAt: new Date(),
    };

    if (persistResult) {
      await db.matter.update({
        where: { id: matter.id },
        data: {
          metadata: {
            ...(matter.metadata ?? {}),
            compliance: {
              ...(matter.metadata?.compliance ?? {}),
              matterKyc: {
                status,
                riskScore: score,
                riskBand,
                factors,
                matterType,
                workflowType,
                missingFields,
                evaluatedAt: result.evaluatedAt.toISOString(),
                createdById: params.createdById ?? null,
              },
            },
          },
        },
      });
    }

    return result;
  }
}