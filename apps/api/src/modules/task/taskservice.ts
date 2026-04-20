export class TaskService {

  /**
   * 🧾 CREATE TASK
   */
  static async create(context: any, params: {
    title: string;
    dueDate: Date;
    matterId?: string;
    assignedToId: string;
    isPrivate?: boolean;
  }) {

    return context.req.db.task.create({
      data: {
        tenantId: context.tenantId,
        ...params,
        status: 'PENDING'
      }
    });
  }

  /**
   * ✅ COMPLETE TASK
   */
  static async complete(context: any, taskId: string) {
    return context.req.db.task.update({
      where: { id: taskId },
      data: { status: 'COMPLETED' }
    });
  }
}