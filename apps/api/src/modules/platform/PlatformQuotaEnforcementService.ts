// apps/api/src/modules/platform/PlatformQuotaEnforcementService.ts

import type { PlatformDbClient } from './platform.types';

export class PlatformQuotaEnforcementService {
  static async evaluate(
    db: PlatformDbClient,
    params: {
      tenantId: string;
      metricType: string;
      projectedValue?: number | null;
    },
  ) {
    const [policy, latestMetric] = await Promise.all([
      db.tenantQuotaPolicy.findFirst({
        where: {
          tenantId: params.tenantId,
          metricType: params.metricType,
        },
        orderBy: [{ updatedAt: 'desc' }],
      }),
      db.tenantUsageMetric.findFirst({
        where: {
          tenantId: params.tenantId,
          metricType: params.metricType,
        },
        orderBy: [{ periodEnd: 'desc' }, { updatedAt: 'desc' }],
      }),
    ]);

    if (!policy) {
      return {
        allowed: true,
        readOnly: false,
        metricType: params.metricType,
        currentValue: Number(latestMetric?.currentValue ?? 0),
        projectedValue: Number(params.projectedValue ?? latestMetric?.currentValue ?? 0),
        enforcementMode: null,
        reasons: [],
      };
    }

    const currentValue = Number(latestMetric?.currentValue ?? 0);
    const projectedValue = Number(params.projectedValue ?? currentValue);
    const softLimit = Number(policy.softLimit ?? 0);
    const hardLimit = Number(policy.hardLimit ?? 0);

    const reasons: string[] = [];
    let allowed = true;
    let readOnly = false;

    if (hardLimit > 0 && projectedValue > hardLimit) {
      reasons.push(`Projected usage exceeds hard limit for ${params.metricType}.`);

      switch (policy.enforcementMode) {
        case 'HARD':
          allowed = false;
          break;
        case 'READ_ONLY':
          readOnly = true;
          break;
        case 'SUSPEND':
          allowed = false;
          readOnly = true;
          break;
        default:
          break;
      }
    } else if (softLimit > 0 && projectedValue > softLimit) {
      reasons.push(`Projected usage exceeds soft limit for ${params.metricType}.`);

      if (policy.enforcementMode === 'READ_ONLY') {
        readOnly = true;
      }
    }

    return {
      allowed,
      readOnly,
      metricType: params.metricType,
      currentValue,
      projectedValue,
      enforcementMode: policy.enforcementMode,
      softLimit,
      hardLimit,
      reasons,
    };
  }

  static async assertWritable(
    db: PlatformDbClient,
    params: {
      tenantId: string;
      metricType: string;
      projectedValue?: number | null;
    },
  ) {
    const evaluation = await this.evaluate(db, params);

    if (!evaluation.allowed) {
      throw Object.assign(new Error('Quota policy denied this operation'), {
        statusCode: 403,
        code: 'TENANT_QUOTA_DENIED',
        details: evaluation,
      });
    }

    if (evaluation.readOnly) {
      throw Object.assign(new Error('Quota policy placed this tenant in read-only mode'), {
        statusCode: 423,
        code: 'TENANT_QUOTA_READ_ONLY',
        details: evaluation,
      });
    }

    return evaluation;
  }
}

export default PlatformQuotaEnforcementService;