export type SanctionsCheckStatus = 'CLEAR' | 'MATCHED' | 'REVIEW_REQUIRED';

export class SanctionsCheckService {
  static async run(
    db: any,
    params: {
      tenantId: string;
      clientId: string;
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
        name: true,
        metadata: true,
      },
    });

    if (!client) {
      throw Object.assign(new Error('Client not found'), {
        statusCode: 404,
        code: 'MISSING_CLIENT',
      });
    }

    const manualSanctionsFlag = client.metadata?.sanctionsMatch;
    const status: SanctionsCheckStatus =
      manualSanctionsFlag === true
        ? 'MATCHED'
        : manualSanctionsFlag === 'review'
          ? 'REVIEW_REQUIRED'
          : 'CLEAR';

    const result = {
      clientId: client.id,
      status,
      source: 'internal-screening',
      screenedName: client.name,
      evaluatedAt: new Date(),
    };

    if (persistResult) {
      await db.client.update({
        where: { id: client.id },
        data: {
          sanctionsStatus: status,
          lastSanctionsScreenedAt: result.evaluatedAt,
          metadata: {
            ...(client.metadata ?? {}),
            compliance: {
              ...(client.metadata?.compliance ?? {}),
              sanctions: {
                status,
                source: result.source,
                screenedName: result.screenedName,
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
            checkType: 'SANCTIONS',
            status,
            source: result.source,
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