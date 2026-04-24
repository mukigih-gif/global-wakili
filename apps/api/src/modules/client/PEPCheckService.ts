export type PepCheckStatus = 'CLEAR' | 'MATCHED' | 'REVIEW_REQUIRED';

export class PEPCheckService {
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

    const manualPepFlag = client.metadata?.pepMatch;
    const status: PepCheckStatus =
      manualPepFlag === true
        ? 'MATCHED'
        : manualPepFlag === 'review'
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
          pepStatus: status,
          lastPepScreenedAt: result.evaluatedAt,
          metadata: {
            ...(client.metadata ?? {}),
            compliance: {
              ...(client.metadata?.compliance ?? {}),
              pep: {
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
            checkType: 'PEP',
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