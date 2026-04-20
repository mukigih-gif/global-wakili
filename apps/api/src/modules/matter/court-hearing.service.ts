export class CourtHearingService {
  static async upcoming(
    db: any,
    params: {
      tenantId: string;
      from?: Date;
      to?: Date;
    },
  ) {
    const from = params.from ?? new Date();
    const to = params.to ?? new Date(from.getTime() + 1000 * 60 * 60 * 24 * 30);

    return db.courtHearing.findMany({
      where: {
        tenantId: params.tenantId,
        hearingDate: {
          gte: from,
          lte: to,
        },
      },
      include: {
        matter: {
          select: {
            id: true,
            title: true,
            matterCode: true,
          },
        },
      },
      orderBy: [{ hearingDate: 'asc' }],
    });
  }
}