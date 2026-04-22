// apps/api/src/modules/task/task.types.ts

import type { TaskPriority, TaskStatus } from '@global-wakili/database';

export type LegalTaskStatus = TaskStatus | 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'CANCELLED';

export type LegalTaskPriority = TaskPriority | 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type TaskAuditAction =
  | 'CREATED'
  | 'VIEWED'
  | 'SEARCHED'
  | 'UPDATED'
  | 'ASSIGNED'
  | 'STATUS_CHANGED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'COMMENT_ADDED'
  | 'COMMENTS_VIEWED'
  | 'DASHBOARD_VIEWED'
  | 'CAPABILITY_VIEWED'
  | 'REMINDER_REQUESTED'
  | 'CALENDAR_LINK_REQUESTED';

export type TaskCreateInput = {
  tenantId: string;
  matterId: string;
  title: string;
  description?: string | null;
  status?: LegalTaskStatus;
  priority?: LegalTaskPriority;
  assignedTo?: string | null;
  dueDate?: Date | string | null;
  createdById: string;
};

export type TaskUpdateInput = {
  tenantId: string;
  taskId: string;
  actorId: string;
  title?: string;
  description?: string | null;
  status?: LegalTaskStatus;
  priority?: LegalTaskPriority;
  assignedTo?: string | null;
  dueDate?: Date | string | null;
};

export type TaskSearchFilters = {
  matterId?: string | null;
  clientId?: string | null;
  assignedTo?: string | null;
  createdById?: string | null;
  status?: LegalTaskStatus | null;
  priority?: LegalTaskPriority | null;
  dueFrom?: Date | string | null;
  dueTo?: Date | string | null;
  overdueOnly?: boolean | null;
};

export type TaskCommentCreateInput = {
  tenantId: string;
  taskId: string;
  userId: string;
  message: string;
};

export type TaskDbClient = {
  matterTask: {
    create: Function;
    update: Function;
    findFirst: Function;
    findMany: Function;
    count: Function;
    groupBy?: Function;
  };
  taskComment: {
    create: Function;
    findMany: Function;
    count?: Function;
  };
  matter: {
    findFirst: Function;
    findMany?: Function;
  };
  user: {
    findFirst: Function;
    findMany?: Function;
  };
  auditLog: {
    create: Function;
    findMany?: Function;
  };
};