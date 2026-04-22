// apps/api/src/modules/task/TaskPermissionMap.ts

export const TASK_PERMISSION_KEYS = {
  createTask: 'task.create_task',
  updateTask: 'task.update_task',
  viewTask: 'task.view_task',
  searchTask: 'task.search_task',
  assignTask: 'task.assign_task',
  completeTask: 'task.complete_task',
  cancelTask: 'task.cancel_task',
  deleteTask: 'task.delete_task',
  commentTask: 'task.comment_task',
  viewDashboard: 'task.view_dashboard',
  manageReminders: 'task.manage_reminders',
  linkCalendar: 'task.link_calendar',
} as const;

export type TaskPermissionKey =
  (typeof TASK_PERMISSION_KEYS)[keyof typeof TASK_PERMISSION_KEYS];