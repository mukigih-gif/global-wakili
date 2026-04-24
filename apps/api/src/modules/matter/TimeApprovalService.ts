export class TimeApprovalService {
  static async approveEntry(
    db: any,
    params: {
      tenantId: string;
      timeEntryId: string;
      approverId: string;
      notes?: string | null;
    },
  ) {
    const entry = await db.timeEntry.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.timeEntryId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!entry) {
      throw Object.assign(new Error('Time entry not found'), {
        statusCode: 404,
        code: 'TIME_ENTRY_NOT_FOUND',
      });
    }

    if (entry.status !== 'PENDING') {
      throw Object.assign(new Error('Only pending entries can be approved'), {
        statusCode: 409,
        code: 'TIME_ENTRY_NOT_PENDING',
      });
    }

    return db.timeEntry.update({
      where: { id: params.timeEntryId },
      data: {
        status: 'APPROVED',
        approvedById: params.approverId,
        approvedAt: new Date(),
        approvalNotes: params.notes?.trim() ?? null,
      },
    });
  }

  static async rejectEntry(
    db: any,
    params: {
      tenantId: string;
      timeEntryId: string;
      approverId: string;
      notes: string;
    },
  ) {
    const entry = await db.timeEntry.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.timeEntryId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!entry) {
      throw Object.assign(new Error('Time entry not found'), {
        statusCode: 404,
        code: 'TIME_ENTRY_NOT_FOUND',
      });
    }

    if (entry.status !== 'PENDING') {
      throw Object.assign(new Error('Only pending entries can be rejected'), {
        statusCode: 409,
        code: 'TIME_ENTRY_NOT_PENDING',
      });
    }

    return db.timeEntry.update({
      where: { id: params.timeEntryId },
      data: {
        status: 'REJECTED',
        approvedById: params.approverId,
        approvedAt: new Date(),
        approvalNotes: params.notes.trim(),
      },
    });
  }
}