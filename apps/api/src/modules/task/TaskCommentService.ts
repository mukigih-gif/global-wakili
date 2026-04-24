// apps/api/src/modules/task/TaskCommentService.ts

import type { TaskCommentCreateInput, TaskDbClient } from './task.types';
import { TaskService } from './TaskService';

export class TaskCommentService {
  static async addComment(db: TaskDbClient, input: TaskCommentCreateInput) {
    if (!input.tenantId?.trim()) {
      throw Object.assign(new Error('Tenant ID is required for task comment'), {
        statusCode: 400,
        code: 'TASK_COMMENT_TENANT_REQUIRED',
      });
    }

    if (!input.taskId?.trim()) {
      throw Object.assign(new Error('Task ID is required for task comment'), {
        statusCode: 422,
        code: 'TASK_COMMENT_TASK_REQUIRED',
      });
    }

    if (!input.userId?.trim()) {
      throw Object.assign(new Error('User ID is required for task comment'), {
        statusCode: 422,
        code: 'TASK_COMMENT_USER_REQUIRED',
      });
    }

    if (!input.message?.trim()) {
      throw Object.assign(new Error('Task comment message is required'), {
        statusCode: 422,
        code: 'TASK_COMMENT_MESSAGE_REQUIRED',
      });
    }

    const task = await TaskService.getTask(db, {
      tenantId: input.tenantId,
      taskId: input.taskId,
      userId: input.userId,
    });

    const user = await db.user.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.userId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw Object.assign(new Error('Commenting user not found or inactive'), {
        statusCode: 404,
        code: 'TASK_COMMENT_USER_NOT_FOUND',
      });
    }

    const comment = await db.taskComment.create({
      data: {
        tenantId: input.tenantId,
        taskId: input.taskId,
        userId: input.userId,
        message: input.message.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      task,
      comment,
    };
  }

  static async listComments(
    db: TaskDbClient,
    params: {
      tenantId: string;
      taskId: string;
      userId: string;
      page?: number;
      limit?: number;
    },
  ) {
    await TaskService.getTask(db, {
      tenantId: params.tenantId,
      taskId: params.taskId,
      userId: params.userId,
    });

    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      db.taskComment.findMany({
        where: {
          tenantId: params.tenantId,
          taskId: params.taskId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      db.taskComment.count
        ? db.taskComment.count({
            where: {
              tenantId: params.tenantId,
              taskId: params.taskId,
            },
          })
        : Promise.resolve(0),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: total ? Math.ceil(total / limit) : 0,
      },
    };
  }
}

export default TaskCommentService;