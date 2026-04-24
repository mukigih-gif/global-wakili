export type ClientKycStatus =
  | 'PENDING'
  | 'INCOMPLETE'
  | 'UNDER_REVIEW'
  | 'BASIC_VERIFIED'
  | 'ENHANCED_DUE_DILIGENCE'
  | 'REJECTED';

export class ClientKYCService {
  static async evaluate(
    db: any,
    params: {
      tenantId: string;
      clientId: string;
      requireKraPinForBasicVerification?: boolean;
      persistResult?: boolean;
      createdById?: string | null;
    },
  ) {
    const requireKraPinForBasicVerification =
      params.requireKraPinForBasicVerification ?? true;
    const persistResult = params.persistResult ?? false;

    const client = await db.client.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.clientId,
      },
      select: {
        id: true,
        type: true,
        name: true,
        email: true,
        phone: true,
        kraPin: true,
        idNumber: true,
        registrationNumber: true,
        address: true,
        primaryContactName: true,
        primaryContactEmail: true,
        primaryContactPhone: true,
        metadata: true,
      },
    });

    if (!client) {
      throw Object.assign(new Error('Client not found'), {
        statusCode: 404,
        code: 'MISSING_CLIENT',
      });
    }

    const missingFields: string[] = [];

    if (!client.name) missingFields.push('name');
    if (!client.phone) missingFields.push('phone');
    if (!client.address) missingFields.push('address');

    if (client.type === 'INDIVIDUAL') {
      if (!client.idNumber) missingFields.push('idNumber');
    } else {
      if (!client.registrationNumber) missingFields.push('registrationNumber');
      if (!client.primaryContactName) missingFields.push('primaryContactName');
    }

    if (requireKraPinForBasicVerification && !client.kraPin) {
      missingFields.push('kraPin');
    }

    const requiresEnhancedDueDiligence =
      client.metadata?.pepMatch === true ||
      client.metadata?.sanctionsMatch === true ||
      client.type === 'STATE_AGENCY';

    let status: ClientKycStatus;

    if (requiresEnhancedDueDiligence) {
      status = 'ENHANCED_DUE_DILIGENCE';
    } else if (missingFields.length > 0) {
      status = 'INCOMPLETE';
    } else {
      status = 'BASIC_VERIFIED';
    }

    const result = {
      clientId: client.id,
      status,
      requiresEnhancedDueDiligence,
      missingFields,
      evaluatedAt: new Date(),
    };

    if (persistResult) {
      await db.client.update({
        where: { id: client.id },
        data: {
          kycStatus: status,
          needsEnhancedDueDiligence: requiresEnhancedDueDiligence,
          lastKycReviewedAt: result.evaluatedAt,
          metadata: {
            ...(client.metadata ?? {}),
            compliance: {
              ...(client.metadata?.compliance ?? {}),
              kyc: {
                status,
                requiresEnhancedDueDiligence,
                missingFields,
                evaluatedAt: result.evaluatedAt.toISOString(),
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
            checkType: 'KYC',
            status,
            source: 'internal-kyc',
            notes:
              missingFields.length > 0
                ? `Missing fields: ${missingFields.join(', ')}`
                : null,
            resultPayload: result,
            createdById: params.createdById ?? null,
            checkedAt: result.evaluatedAt,
          },
        });
      }
    }

    return result;
  }
}