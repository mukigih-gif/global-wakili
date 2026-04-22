// apps/api/src/modules/document/DocumentAccessPolicyService.ts

type DeletedAtMode = 'active' | 'archived' | 'any';

export class DocumentAccessPolicyService {
  static buildAccessScope(params: {
    userId?: string | null;
    includeRestricted?: boolean;
  }): Record<string, unknown> | null {
    if (params.includeRestricted === true) {
      return null;
    }

    if (!params.userId?.trim()) {
      return {
        AND: [
          {
            NOT: {
              metadata: {
                path: ['isRestricted'],
                equals: true,
              },
            },
          },
          {
            NOT: {
              metadata: {
                path: ['isConfidential'],
                equals: true,
              },
            },
          },
          {
            OR: [
              { matterId: null },
              {
                matter: {
                  is: {
                    NOT: {
                      metadata: {
                        path: ['isRestricted'],
                        equals: true,
                      },
                    },
                  },
                },
              },
            ],
          },
        ],
      };
    }

    return {
      OR: [
        { uploadedBy: params.userId },
        {
          matter: {
            is: {
              partnerId: params.userId,
            },
          },
        },
        {
          matter: {
            is: {
              assignedLawyerId: params.userId,
            },
          },
        },
        {
          AND: [
            {
              NOT: {
                metadata: {
                  path: ['isRestricted'],
                  equals: true,
                },
              },
            },
            {
              NOT: {
                metadata: {
                  path: ['isConfidential'],
                  equals: true,
                },
              },
            },
            {
              OR: [
                { matterId: null },
                {
                  matter: {
                    is: {
                      NOT: {
                        metadata: {
                          path: ['isRestricted'],
                          equals: true,
                        },
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    };
  }

  static buildDocumentWhere(params: {
    tenantId: string;
    userId?: string | null;
    matterId?: string | null;
    includeRestricted?: boolean;
    deletedAtMode?: DeletedAtMode;
    extraAnd?: Record<string, unknown>[];
  }): Record<string, unknown> {
    if (!params.tenantId?.trim()) {
      throw Object.assign(new Error('Tenant ID is required for document access policy'), {
        statusCode: 400,
        code: 'DOCUMENT_ACCESS_POLICY_TENANT_REQUIRED',
      });
    }

    const where: Record<string, unknown> = {
      tenantId: params.tenantId,
      ...(params.matterId ? { matterId: params.matterId } : {}),
    };

    const deletedAtMode = params.deletedAtMode ?? 'active';

    if (deletedAtMode === 'active') {
      where.deletedAt = null;
    }

    if (deletedAtMode === 'archived') {
      where.deletedAt = { not: null };
    }

    const andClauses: Record<string, unknown>[] = [];

    const accessScope = this.buildAccessScope({
      userId: params.userId,
      includeRestricted: params.includeRestricted,
    });

    if (accessScope) {
      andClauses.push(accessScope);
    }

    if (params.extraAnd?.length) {
      andClauses.push(...params.extraAnd);
    }

    if (andClauses.length) {
      where.AND = andClauses;
    }

    return where;
  }
}

export default DocumentAccessPolicyService;