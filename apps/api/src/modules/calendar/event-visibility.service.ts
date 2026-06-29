import { EventVisibility } from '@global-wakili/database';

export class EventVisibilityService {
  /**
   * Filters and obscures events based on:
   * - creator
   * - attendees
   * - visibility
   * - restricted matter membership
   */
  static async filterVisibleEvents(
    events: any[],
    userId: string,
  ) {
    return events.map((event) => {
      const isCreator = event.creatorId === userId;
      const isAttendee = event.attendees?.some((a: any) => a.id === userId) ?? false;
      const isPublic = event.visibility === EventVisibility.PUBLIC;
      const isPrivate = event.isPrivate === true || event.visibility === EventVisibility.PRIVATE;
      const isTeamOnly = event.visibility === EventVisibility.TEAM_ONLY;

      const matter = event.matter ?? null;
      const isRestrictedMatter = matter?.metadata?.isRestricted === true;
      // Matter has only leadAdvocateId (no partnerId/assignedLawyerId on the
      // deployed schema — FINDING-008-006 / CAL-001 1c). Matter-team = lead advocate.
      const isMatterTeam = matter?.leadAdvocateId === userId;

      if (isRestrictedMatter) {
        if (isCreator || isAttendee || isMatterTeam) {
          return {
            ...event,
            isObscured: false,
          };
        }

        return {
          id: event.id,
          startTime: event.startTime,
          endTime: event.endTime,
          type: event.type,
          visibility: event.visibility,
          isPrivate: true,
          title: 'Busy/Restricted Matter',
          description: null,
          matterId: null,
          attendees: [],
          creatorId: null,
          isObscured: true,
        };
      }

      if (isCreator || isAttendee || isPublic) {
        return {
          ...event,
          isObscured: false,
        };
      }

      if (isTeamOnly) {
        if (isMatterTeam) {
          return {
            ...event,
            isObscured: false,
          };
        }

        return {
          id: event.id,
          startTime: event.startTime,
          endTime: event.endTime,
          type: event.type,
          visibility: event.visibility,
          isPrivate: false,
          title: 'Busy/Team Event',
          description: null,
          matterId: null,
          attendees: [],
          creatorId: null,
          isObscured: true,
        };
      }

      if (isPrivate) {
        return {
          id: event.id,
          startTime: event.startTime,
          endTime: event.endTime,
          type: event.type,
          visibility: EventVisibility.PRIVATE,
          isPrivate: true,
          title: 'Busy/Private Appointment',
          description: null,
          matterId: null,
          attendees: [],
          creatorId: null,
          isObscured: true,
        };
      }

      return {
        ...event,
        isObscured: false,
      };
    });
  }
}