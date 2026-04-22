// apps/api/src/modules/compliance/ComplianceReviewService.ts

import { ClientKYCService } from '../client/ClientKYCService';
import { PEPCheckService } from '../client/PEPCheckService';
import { SanctionsCheckService } from '../client/SanctionsCheckService';
import { RiskScoringService } from '../client/RiskScoringService';
import type { ComplianceDbClient, ComplianceReviewInput } from './compliance.types';

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required'), {
      statusCode: 400,
      code: 'COMPLIANCE_TENANT_REQUIRED',
    });
  }
}

export class ComplianceReviewService {
  static async runClientReview(db: ComplianceDbClient, input: ComplianceReviewInput) {
    assertTenant(input.tenantId);

    if (!input.clientId?.trim()) {
      throw Object.assign(new Error('Client ID is required for compliance review'), {
        statusCode: 422,
        code: 'COMPLIANCE_CLIENT_REQUIRED',
      });
    }

    const tenant = await db.tenant.findFirst({
      where: {
        id: input.tenantId,
      },
      select: {
        id: true,
        enableAml: true,
        complianceMode: true,
      },
    });

    if (!tenant) {
      throw Object.assign(new Error('Tenant not found'), {
        statusCode: 404,
        code: 'COMPLIANCE_TENANT_NOT_FOUND',
      });
    }

    if (tenant.enableAml === false || tenant.complianceMode === false) {
      throw Object.assign(new Error('AML/compliance mode is disabled for this tenant'), {
        statusCode: 403,
        code: 'COMPLIANCE_DISABLED_FOR_TENANT',
      });
    }

    const client = await db.client.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.clientId,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        kycStatus: true,
        pepStatus: true,
        sanctionsStatus: true,
        riskScore: true,
        riskBand: true,
        needsEnhancedDueDiligence: true,
      },
    });

    if (!client) {
      throw Object.assign(new Error('Client not found for tenant'), {
        statusCode: 404,
        code: 'COMPLIANCE_CLIENT_NOT_FOUND',
      });
    }

    const performKyc = input.performKyc ?? true;
    const performPepCheck = input.performPepCheck ?? true;
    const performSanctionsCheck = input.performSanctionsCheck ?? true;
    const persistResult = input.persistResult ?? true;

    const [kyc, pep, sanctions] = await Promise.all([
      performKyc
        ? ClientKYCService.evaluate(db, {
            tenantId: input.tenantId,
            clientId: input.clientId,
            persistResult,
            createdById: input.actorId ?? null,
          })
        : Promise.resolve(null),
      performPepCheck
        ? PEPCheckService.run(db, {
            tenantId: input.tenantId,
            clientId: input.clientId,
            persistResult,
            createdById: input.actorId ?? null,
          })
        : Promise.resolve(null),
      performSanctionsCheck
        ? SanctionsCheckService.run(db, {
            tenantId: input.tenantId,
            clientId: input.clientId,
            persistResult,
            createdById: input.actorId ?? null,
          })
        : Promise.resolve(null),
    ]);

    const risk = await RiskScoringService.compute(db, {
      tenantId: input.tenantId,
      clientId: input.clientId,
      kyc: kyc ?? undefined,
      pep: pep ?? undefined,
      sanctions: sanctions ?? undefined,
      persistResult,
      createdById: input.actorId ?? null,
    });

    const refreshedClient = await db.client.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.clientId,
      },
      select: {
        id: true,
        name: true,
        kycStatus: true,
        pepStatus: true,
        sanctionsStatus: true,
        riskScore: true,
        riskBand: true,
        needsEnhancedDueDiligence: true,
        lastKycReviewedAt: true,
        lastPepScreenedAt: true,
        lastSanctionsScreenedAt: true,
        lastRiskAssessedAt: true,
        metadata: true,
      },
    });

    return {
      client: refreshedClient,
      checks: {
        kyc,
        pep,
        sanctions,
        risk,
      },
      review: {
        reviewedAt: new Date(),
        performed: {
          kyc: performKyc,
          pep: performPepCheck,
          sanctions: performSanctionsCheck,
          risk: true,
        },
        persistResult,
      },
    };
  }

  static async listClientChecks(
    db: ComplianceDbClient,
    params: {
      tenantId: string;
      clientId?: string | null;
      checkType?: string | null;
      riskBand?: string | null;
      checkedFrom?: Date | string | null;
      checkedTo?: Date | string | null;
      page?: number;
      limit?: number;
    },
  ) {
    assertTenant(params.tenantId);

    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 50;
    const skip = (page - 1) * limit;

    const andClauses: Record<string, unknown>[] = [];

    if (params.clientId) andClauses.push({ clientId: params.clientId });
    if (params.checkType) andClauses.push({ checkType: params.checkType });
    if (params.riskBand) andClauses.push({ riskBand: params.riskBand });

    const checkedFrom = params.checkedFrom ? new Date(params.checkedFrom) : null;
    const checkedTo = params.checkedTo ? new Date(params.checkedTo) : null;

    if (checkedFrom && Number.isNaN(checkedFrom.getTime())) {
      throw Object.assign(new Error('Invalid checkedFrom date'), {
        statusCode: 422,
        code: 'COMPLIANCE_CHECKED_FROM_INVALID',
      });
    }

    if (checkedTo && Number.isNaN(checkedTo.getTime())) {
      throw Object.assign(new Error('Invalid checkedTo date'), {
        statusCode: 422,
        code: 'COMPLIANCE_CHECKED_TO_INVALID',
      });
    }

    if (checkedFrom || checkedTo) {
      andClauses.push({
        checkedAt: {
          ...(checkedFrom ? { gte: checkedFrom } : {}),
          ...(checkedTo ? { lte: checkedTo } : {}),
        },
      });
    }

    const where = {
      tenantId: params.tenantId,
      ...(andClauses.length ? { AND: andClauses } : {}),
    };

    const [data, total] = await Promise.all([
      db.clientComplianceCheck.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              clientCode: true,
              kycStatus: true,
              pepStatus: true,
              sanctionsStatus: true,
              riskBand: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ checkedAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.clientComplianceCheck.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export default ComplianceReviewService;