// apps/api/src/modules/queues/QueuePermissionMap.ts

export const QUEUE_PERMISSION_KEYS = {
  createJob: 'queues.create_job',
  enqueueJob: 'queues.enqueue_job',
  viewJob: 'queues.view_job',
  searchJobs: 'queues.search_jobs',
  manageJobs: 'queues.manage_jobs',
  retryJob: 'queues.retry_job',
  viewDashboard: 'queues.view_dashboard',
  viewReports: 'queues.view_reports',
} as const;

export type QueuePermissionKey =
  (typeof QUEUE_PERMISSION_KEYS)[keyof typeof QUEUE_PERMISSION_KEYS];