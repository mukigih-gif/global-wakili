import { CalendarService } from './CalendarService';

export class LeaveManagementService {
  static async approveLeave(requestId: string, approverId: string) {
    const request = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { user: true }
    });

    if (!request) throw new Error("Leave Request Not Found");

    // 1. Create Calendar Block (Global Visibility)
    const calendarEvent = await CalendarService.createEvent({
      title: `O.O.O: ${request.user.name}`,
      description: `${request.type} Leave approved by ${approverId}`,
      startTime: request.startDate,
      endTime: request.endDate,
      eventType: 'FIRM_HOLIDAY',
      isPrivate: false,
      userId: request.userId,
      attendees: []
    });

    // 2. Update Status and Link Event
    return await prisma.leaveRequest.update({
      where: { id: requestId },
      data: { 
        status: 'APPROVED', 
        calendarEventId: calendarEvent.id 
      }
    });
  }
}