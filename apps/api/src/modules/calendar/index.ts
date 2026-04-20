// apps/api/src/modules/calendar/index.ts

export * from './calendar.types';
export * from './calendar.validators';

export { CalendarService } from './CalendarService';
export { CalendarAvailabilityService } from './CalendarAvailabilityService';
export { EventVisibilityService } from './event-visibility.service';
export { ReminderService } from './ReminderService';
export { DeadlineService } from './DeadlineService';
export { CourtIntegrationBridge } from './CourtIntegrationBridge';
export { TaskService } from './TaskService';
export { CalendarSyncService } from './CalendarSyncService';
export { ExternalSyncService } from './ExternalSyncService';
export { CalendarSubscriptionService } from './CalendarSubscriptionService';
export { CalendarDashboardService } from './calendar.dashboard';

export * from './calendar.controller';

export { default as calendarRoutes } from './calendar.routes';