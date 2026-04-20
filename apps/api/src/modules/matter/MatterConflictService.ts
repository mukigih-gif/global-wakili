export type ConflictLevel =
  | 'CLEAR'
  | 'REVIEW_REQUIRED'
  | 'HIGH_RISK';

export class MatterConflictService {
  static async runConflictCheck(
    db: any,
    params: {
      tenantId: string;
      clientId?: string | null;
      matterId?: string | null;
      adversePartyNames?: string[] | null;
      relatedEntityNames?: string[] | null;
    },
  ) {
    const names = [
      ...(params.adversePartyNames ?? []),
      ...(params.relatedEntityNames ?? []),
    ]
      .map((value) => value.trim())
      .filter(Boolean);

    const directClient = params.clientId
      ? await db.client.findFirst({
          where: {
            tenantId: params.tenantId,
            id: params.clientId,
          },
          select: {
            id: true,
            name: true,
            status: true,
          },
        })
      : null;

    const matchedClients = names.length
      ? await db.client.findMany({
          where: {
            tenantId: params.tenantId,
            OR: names.map((name) => ({
              name: {
                contains: name,
                mode: 'insensitive',
              },
            })),
          },
          select: {
            id: true,
            name: true,
            clientCode: true,
            status: true,
            matters: {
              select: {
                id: true,
                title: true,
                status: true,
              },
              take: 5,
              orderBy: [{ openedDate: 'desc' }],
            },
          },
          take: 20,
        })
      : [];

    const matchedMatters = names.length
      ? await db.matter.findMany({
          where: {
            tenantId: params.tenantId,
            OR: names.map((name) => ({
              title: {
                contains: name,
                mode: 'insensitive',
              },
            })),
          },
          select: {
            id: true,
            title: true,
            matterCode: true,
            status: true,
            clientId: true,
          },
          take: 20,
        })
      : [];

    const activeAdverse = matchedClients.some((client: any) => client.status === 'ACTIVE');
    const formerAdverse = matchedClients.some((client: any) => client.status !== 'ACTIVE');

    let conflictLevel: ConflictLevel = 'CLEAR';
    let conflictReason: string | null = null;
    let requiresWaiver = false;
    let requiresPartnerApproval = false;

    if (activeAdverse) {
      conflictLevel = 'HIGH_RISK';
      conflictReason =
        'Adverse party appears to be an ACTIVE client of the firm. Representation is generally prohibited unless cleared through a formal exception process.';
      requiresWaiver = true;
      requiresPartnerApproval = true;
    } else if (formerAdverse || matchedMatters.length > 0) {
      conflictLevel = 'REVIEW_REQUIRED';
      conflictReason =
        'Potential former-client or prior-matter overlap detected. Review required for confidentiality, loyalty, and confidential-information risk.';
      requiresPartnerApproval = true;
    }

    return {
      conflictLevel,
      conflictReason,
      requiresWaiver,
      requiresPartnerApproval,
      searchedNames: names,
      directClient,
      matchedClients,
      matchedMatters,
      matchedEvidence: {
        activeAdverseClientFound: activeAdverse,
        formerAdverseClientFound: formerAdverse,
        priorMatterOverlapFound: matchedMatters.length > 0,
      },
      summary: {
        matchedClientCount: matchedClients.length,
        matchedMatterCount: matchedMatters.length,
      },
      generatedAt: new Date(),
    };
  }

  static async runMatterOpenCheck(
    db: any,
    params: {
      tenantId: string;
      clientId: string;
      title: string;
      matterCode?: string | null;
    },
  ) {
    const existingByCode = params.matterCode
      ? await db.matter.findFirst({
          where: {
            tenantId: params.tenantId,
            matterCode: params.matterCode.trim(),
          },
          select: {
            id: true,
            title: true,
            matterCode: true,
            status: true,
          },
        })
      : null;

    const existingSimilar = await db.matter.findMany({
      where: {
        tenantId: params.tenantId,
        clientId: params.clientId,
        title: {
          contains: params.title.trim(),
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        title: true,
        matterCode: true,
        status: true,
      },
      take: 10,
    });

    return {
      existingByCode,
      existingSimilar,
      blocked: Boolean(existingByCode),
      reviewRecommended: existingSimilar.length > 0,
      generatedAt: new Date(),
    };
  }
}