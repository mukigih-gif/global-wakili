export class CourtService {
  static async listMatterHearings(
    db: any,
    params: {
      tenantId: string;
      matterId: string;
    },
  ) {
    return db.courtHearing.findMany({
      where: {
        tenantId: params.tenantId,
        matterId: params.matterId,
      },
      orderBy: [{ hearingDate: 'asc' }],
    });
  }

  static async createCourtHearing(
    db: any,
    params: {
      tenantId: string;
      matterId: string;
      courtName: string;
      hearingDate: Date;
      hearingType?: string | null;
      location?: string | null;
      notes?: string | null;
    },
  ) {
    return db.courtHearing.create({
      data: {
        tenantId: params.tenantId,
        matterId: params.matterId,
        courtName: params.courtName.trim(),
        hearingDate: params.hearingDate,
        hearingType: params.hearingType?.trim() ?? null,
        location: params.location?.trim() ?? null,
        notes: params.notes?.trim() ?? null,
        status: 'SCHEDULED',
      },
    });
  }

  static async markOutcome(
    db: any,
    params: {
      tenantId: string;
      courtHearingId: string;
      outcome: string;
      nextActionDate?: Date | null;
      notes?: string | null;
    },
  ) {
    const hearing = await db.courtHearing.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.courtHearingId,
      },
      select: {
        id: true,
      },
    });

    if (!hearing) {
      throw Object.assign(new Error('Court hearing not found'), {
        statusCode: 404,
        code: 'COURT_HEARING_NOT_FOUND',
      });
    }

    return db.courtHearing.update({
      where: { id: params.courtHearingId },
      data: {
        status: 'HEARD',
        outcome: params.outcome.trim(),
        nextActionDate: params.nextActionDate ?? null,
        notes: params.notes?.trim() ?? null,
      },
    });
  }
}