export class CourtService {

  static async scheduleHearing(context: any, data: {
    matterId: string;
    hearingDate: Date;
    courtName: string;
    judge?: string;
  }) {

    return context.req.db.$transaction(async (tx: any) => {

      const hearing = await tx.courtHearing.create({
        data: {
          ...data,
          tenantId: context.tenantId,
          status: 'UPCOMING'
        }
      });

      // 📅 AUTO CALENDAR EVENT
      await tx.calendarEvent.create({
        data: {
          tenantId: context.tenantId,
          matterId: data.matterId,
          title: `Court Hearing - ${data.courtName}`,
          type: 'COURT_DATE',
          start: data.hearingDate,
          end: data.hearingDate
        }
      });

      return hearing;
    });
  }
}