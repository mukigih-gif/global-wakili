// apps/api/src/modules/notifications/NotificationPermissionMap.ts

export const NOTIFICATION_PERMISSION_KEYS = {
  sendNotification: 'notifications.send_notification',
  queueNotification: 'notifications.queue_notification',
  viewNotification: 'notifications.view_notification',
  searchNotification: 'notifications.search_notification',
  markRead: 'notifications.mark_read',
  viewDashboard: 'notifications.view_dashboard',
  viewReports: 'notifications.view_reports',
  manageWebhooks: 'notifications.manage_webhooks',
} as const;

export type NotificationPermissionKey =
  (typeof NOTIFICATION_PERMISSION_KEYS)[keyof typeof NOTIFICATION_PERMISSION_KEYS];