export class StatuteLimitService {
  static calculateLimitation(
    params: {
      causeDate: Date;
      limitationYears: number;
    },
  ) {
    const deadline = new Date(params.causeDate);
    deadline.setFullYear(deadline.getFullYear() + params.limitationYears);

    return {
      causeDate: params.causeDate,
      limitationYears: params.limitationYears,
      deadline,
    };
  }

  static async attachMatterLimitation(
    db: any,
    params: {
      tenantId: string;
      matterId: string;
      causeDate: Date;
      limitationYears: number;
      notes?: string | null;
    },
  ) {
    const matter = await db.matter.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.matterId,
      },
      select: {
        id: true,
        metadata: true,
      },
    });

    if (!matter) {
      throw Object.assign(new Error('Matter not found'), {
        statusCode: 404,
        code: 'MISSING_MATTER',
      });
    }

    const deadline = this.calculateLimitation({
      causeDate: params.causeDate,
      limitationYears: params.limitationYears,
    });

    return db.matter.update({
      where: { id: params.matterId },
      data: {
        metadata: {
          ...(matter.metadata ?? {}),
          limitation: {
            causeDate: params.causeDate.toISOString(),
            limitationYears: params.limitationYears,
            deadline: deadline.deadline.toISOString(),
            notes: params.notes?.trim() ?? null,
          },
        },
      },
    });
  }

  static async getMatterLimitation(
    db: any,
    params: {
      tenantId: string;
      matterId: string;
    },
  ) {
    const matter = await db.matter.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.matterId,
      },
      select: {
        id: true,
        metadata: true,
      },
    });

    if (!matter) {
      throw Object.assign(new Error('Matter not found'), {
        statusCode: 404,
        code: 'MISSING_MATTER',
      });
    }

    return matter.metadata?.limitation ?? null;
  }
}