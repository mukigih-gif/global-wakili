// apps/api/src/modules/task/TaskDashboardService.ts

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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

export class TaskDashboardService {
  static async getDashboard(
    db: any,
    params: {
      tenantId: string;
      userId: string;
      matterId?: string | null;
      from?: Date | string | null;
      to?: Date | string | null;
    },
  ) {
    if (!params.tenantId?.trim()) {
      throw Object.assign(new Error('Tenant ID is required for task dashboard'), {
        statusCode: 400,
        code: 'TASK_DASHBOARD_TENANT_REQUIRED',
      });
    }

    if (!params.userId?.trim()) {
      throw Object.assign(new Error('User ID is required for task dashboard'), {
        statusCode: 422,
        code: 'TASK_DASHBOARD_USER_REQUIRED',
      });
    }

    const now = new Date();
    const from = normalizeDate(params.from);
    const to = normalizeDate(params.to);

    const andClauses: Record<string, unknown>[] = [buildAccessScope(params.userId)];

    if (params.matterId) andClauses.push({ matterId: params.matterId });

    if (from || to) {
      andClauses.push({
        createdAt: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
      });
    }

    const baseWhere = {
      tenantId: params.tenantId,
      AND: andClauses,
    };

    const [tasks, overdueTasks, dueSoonTasks, recentTasks] = await Promise.all([
      db.matterTask.findMany({
        where: baseWhere,
        select: {
          id: true,
          status: true,
          priority: true,
          assignedTo: true,
          dueDate: true,
          createdById: true,
        },
        take: 1000,
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      }),
      db.matterTask.findMany({
        where: {
          ...baseWhere,
          status: {
            notIn: ['DONE', 'CANCELLED'],
          },
          dueDate: {
            lt: now,
          },
        },
        take: 20,
        orderBy: [{ dueDate: 'asc' }],
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
        },
      }),
      db.matterTask.findMany({
        where: {
          ...baseWhere,
          status: {
            notIn: ['DONE', 'CANCELLED'],
          },
          dueDate: {
            gte: now,
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
        take: 20,
        orderBy: [{ dueDate: 'asc' }],
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
        },
      }),
      db.matterTask.findMany({
        where: baseWhere,
        take: 20,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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
      }),
    ]);

    const statusBreakdown: Record<string, number> = {};
    const priorityBreakdown: Record<string, number> = {};
    const assigneeBreakdown: Record<string, number> = {};

    for (const task of tasks) {
      statusBreakdown[task.status] = (statusBreakdown[task.status] ?? 0) + 1;
      priorityBreakdown[task.priority] = (priorityBreakdown[task.priority] ?? 0) + 1;

      const assigneeKey = task.assignedTo ?? 'UNASSIGNED';
      assigneeBreakdown[assigneeKey] = (assigneeBreakdown[assigneeKey] ?? 0) + 1;
    }

    return {
      tenantId: params.tenantId,
      matterId: params.matterId ?? null,
      generatedAt: new Date(),
      summary: {
        totalVisibleTasks: tasks.length,
        overdueCount: overdueTasks.length,
        dueSoonCount: dueSoonTasks.length,
        statusBreakdown,
        priorityBreakdown,
        assigneeBreakdown,
      },
      overdueTasks,
      dueSoonTasks,
      recentTasks,
    };
  }
}

export default TaskDashboardService;