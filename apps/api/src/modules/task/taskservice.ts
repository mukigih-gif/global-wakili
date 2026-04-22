// apps/api/src/modules/task/TaskService.ts

import type {
  LegalTaskStatus,
  TaskCreateInput,
  TaskDbClient,
  TaskSearchFilters,
  TaskUpdateInput,
} from './task.types';

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;

  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid task date'), {
      statusCode: 422,
      code: 'TASK_DATE_INVALID',
    });
  }

  return parsed;
}

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required'), {
      statusCode: 400,
      code: 'TASK_TENANT_REQUIRED',
    });
  }
}

function assertTaskTitle(title: string): void {
  if (!title?.trim()) {
    throw Object.assign(new Error('Task title is required'), {
      statusCode: 422,
      code: 'TASK_TITLE_REQUIRED',
    });
  }
}

const allowedTransitions: Record<string, LegalTaskStatus[]> = {
  TODO: ['IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'],
  IN_PROGRESS: ['BLOCKED', 'DONE', 'CANCELLED'],
  BLOCKED: ['IN_PROGRESS', 'CANCELLED'],
  DONE: [],
  CANCELLED: [],
};

function assertTransition(current: string, next: LegalTaskStatus): void {
  if (current === next) return;

  const allowed = allowedTransitions[current] ?? [];

  if (!allowed.includes(next)) {
    throw Object.assign(new Error(`Task cannot move from ${current} to ${next}`), {
      statusCode: 409,
      code: 'TASK_STATUS_TRANSITION_FORBIDDEN',
      details: {
        current,
        next,
        allowed,
      },
    });
  }
}

function buildAccessScope(userId: string): Record<string, unknown> {
  return {
    OR: [
      { createdById: userId },
      { assignedTo: userId },
      {
        matter: {
          is: {
            partnerId: userId,
          },
        },
      },
      {
        matter: {
          is: {
            assignedLawyerId: userId,
          },
        },
      },
    ],
  };
}

function buildTaskWhere(params: {
  tenantId: string;
  userId: string;
  query?: string | null;
  filters?: TaskSearchFilters | null;
}): Record<string, unknown> {
  const filters = params.filters ?? {};
  const andClauses: Record<string, unknown>[] = [buildAccessScope(params.userId)];

  if (params.query?.trim()) {
    const query = params.query.trim();

    andClauses.push({
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        {
          matter: {
            is: {
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { matterCode: { contains: query, mode: 'insensitive' } },
              ],
            },
          },
        },
        {
          assignee: {
            is: {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
              ],
            },
          },
        },
      ],
    });
  }

  if (filters.matterId) andClauses.push({ matterId: filters.matterId });
  if (filters.clientId) {
    andClauses.push({
      matter: {
        is: {
          clientId: filters.clientId,
        },
      },
    });
  }
  if (filters.assignedTo) andClauses.push({ assignedTo: filters.assignedTo });
  if (filters.createdById) andClauses.push({ createdById: filters.createdById });
  if (filters.status) andClauses.push({ status: filters.status });
  if (filters.priority) andClauses.push({ priority: filters.priority });

  const dueFrom = normalizeDate(filters.dueFrom);
  const dueTo = normalizeDate(filters.dueTo);

  if (dueFrom || dueTo) {
    andClauses.push({
      dueDate: {
        ...(dueFrom ? { gte: dueFrom } : {}),
        ...(dueTo ? { lte: dueTo } : {}),
      },
    });
  }

  if (filters.overdueOnly === true) {
    andClauses.push({
      dueDate: {
        lt: new Date(),
      },
    });
    andClauses.push({
      status: {
        notIn: ['DONE', 'CANCELLED'],
      },
    });
  }

  return {
    tenantId: params.tenantId,
    AND: andClauses,
  };
}

export class TaskService {
  static async createTask(db: TaskDbClient, input: TaskCreateInput) {
    assertTenant(input.tenantId);
    assertTaskTitle(input.title);

    if (!input.matterId?.trim()) {
      throw Object.assign(new Error('Matter ID is required for task creation'), {
        statusCode: 422,
        code: 'TASK_MATTER_REQUIRED',
      });
    }

    if (!input.createdById?.trim()) {
      throw Object.assign(new Error('Creator ID is required for task creation'), {
        statusCode: 422,
        code: 'TASK_CREATOR_REQUIRED',
      });
    }

    const [matter, creator, assignee] = await Promise.all([
      db.matter.findFirst({
        where: {
          tenantId: input.tenantId,
          id: input.matterId,
        },
        select: {
          id: true,
        },
      }),
      db.user.findFirst({
        where: {
          tenantId: input.tenantId,
          id: input.createdById,
          status: 'ACTIVE',
        },
        select: {
          id: true,
        },
      }),
      input.assignedTo
        ? db.user.findFirst({
            where: {
              tenantId: input.tenantId,
              id: input.assignedTo,
              status: 'ACTIVE',
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve(null),
    ]);

    if (!matter) {
      throw Object.assign(new Error('Matter not found for tenant'), {
        statusCode: 404,
        code: 'TASK_MATTER_NOT_FOUND',
      });
    }

    if (!creator) {
      throw Object.assign(new Error('Task creator not found or inactive'), {
        statusCode: 404,
        code: 'TASK_CREATOR_NOT_FOUND',
      });
    }

    if (input.assignedTo && !assignee) {
      throw Object.assign(new Error('Task assignee not found or inactive'), {
        statusCode: 404,
        code: 'TASK_ASSIGNEE_NOT_FOUND',
      });
    }

    const status = input.status ?? 'TODO';

    return db.matterTask.create({
      data: {
        tenantId: input.tenantId,
        matterId: input.matterId,
        title: input.title.trim(),
        description: input.description?.trim() ?? null,
        status,
        priority: input.priority ?? 'NORMAL',
        assignedTo: input.assignedTo ?? null,
        dueDate: normalizeDate(input.dueDate),
        completedAt: status === 'DONE' ? new Date() : null,
        createdById: input.createdById,
      },
      include: {
        matter: {
          select: {
            id: true,
            title: true,
            matterCode: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  static async getTask(
    db: TaskDbClient,
    params: {
      tenantId: string;
      taskId: string;
      userId: string;
    },
  ) {
    assertTenant(params.tenantId);

    const task = await db.matterTask.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.taskId,
        AND: [buildAccessScope(params.userId)],
      },
      include: {
        matter: {
          select: {
            id: true,
            title: true,
            matterCode: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        comments: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw Object.assign(new Error('Task not found or access denied'), {
        statusCode: 404,
        code: 'TASK_NOT_FOUND',
      });
    }

    return task;
  }

  static async searchTasks(
    db: TaskDbClient,
    params: {
      tenantId: string;
      userId: string;
      query?: string | null;
      filters?: TaskSearchFilters | null;
      page?: number;
      limit?: number;
    },
  ) {
    assertTenant(params.tenantId);

    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 50;
    const skip = (page - 1) * limit;

    const where = buildTaskWhere({
      tenantId: params.tenantId,
      userId: params.userId,
      query: params.query,
      filters: params.filters,
    });

    const [data, total] = await Promise.all([
      db.matterTask.findMany({
        where,
        include: {
          matter: {
            select: {
              id: true,
              title: true,
              matterCode: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      db.matterTask.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        query: params.query?.trim() ?? '',
      },
    };
  }

  static async updateTask(db: TaskDbClient, input: TaskUpdateInput) {
    assertTenant(input.tenantId);

    const existing = await db.matterTask.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.taskId,
        AND: [buildAccessScope(input.actorId)],
      },
      select: {
        id: true,
        matterId: true,
        status: true,
        assignedTo: true,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Task not found or access denied'), {
        statusCode: 404,
        code: 'TASK_NOT_FOUND',
      });
    }

    if (input.status) {
      assertTransition(String(existing.status), input.status);
    }

    if (input.assignedTo) {
      const assignee = await db.user.findFirst({
        where: {
          tenantId: input.tenantId,
          id: input.assignedTo,
          status: 'ACTIVE',
        },
        select: {
          id: true,
        },
      });

      if (!assignee) {
        throw Object.assign(new Error('Task assignee not found or inactive'), {
          statusCode: 404,
          code: 'TASK_ASSIGNEE_NOT_FOUND',
        });
      }
    }

    const data: Record<string, unknown> = {};

    if (input.title !== undefined) data.title = input.title.trim();
    if (input.description !== undefined) data.description = input.description?.trim() ?? null;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.assignedTo !== undefined) data.assignedTo = input.assignedTo ?? null;
    if (input.dueDate !== undefined) data.dueDate = normalizeDate(input.dueDate);

    if (input.status !== undefined) {
      data.status = input.status;
      data.completedAt = input.status === 'DONE' ? new Date() : null;
    }

    return db.matterTask.update({
      where: {
        id: input.taskId,
      },
      data,
      include: {
        matter: {
          select: {
            id: true,
            title: true,
            matterCode: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  static async setStatus(
    db: TaskDbClient,
    params: {
      tenantId: string;
      taskId: string;
      actorId: string;
      status: LegalTaskStatus;
    },
  ) {
    return this.updateTask(db, {
      tenantId: params.tenantId,
      taskId: params.taskId,
      actorId: params.actorId,
      status: params.status,
    });
  }

  static async completeTask(
    db: TaskDbClient,
    params: {
      tenantId: string;
      taskId: string;
      actorId: string;
    },
  ) {
    return this.setStatus(db, {
      tenantId: params.tenantId,
      taskId: params.taskId,
      actorId: params.actorId,
      status: 'DONE',
    });
  }

  static async cancelTask(
    db: TaskDbClient,
    params: {
      tenantId: string;
      taskId: string;
      actorId: string;
    },
  ) {
    return this.setStatus(db, {
      tenantId: params.tenantId,
      taskId: params.taskId,
      actorId: params.actorId,
      status: 'CANCELLED',
    });
  }
}

export default TaskService;