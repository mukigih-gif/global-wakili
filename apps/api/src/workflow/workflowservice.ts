import { withAudit } from '../../utils/audit-wrapper';
import { AuditSeverity } from '../../types/audit';

export class WorkflowService {

  /**
   * ⚙️ TRIGGER WORKFLOW ON MATTER STAGE
   */
  static async trigger(context: any, params: {
    matterId: string;
    stage: string;
  }) {

    const db = context.req.db;

    const workflows = await db.workflow.findMany({
      where: {
        tenantId: context.tenantId,
        triggerStage: params.stage
      }
    });

    for (const wf of workflows) {
      for (const step of wf.steps) {

        // 🧾 CREATE TASK
        await db.task.create({
          data: {
            tenantId: context.tenantId,
            matterId: params.matterId,
            title: step.name,
            dueDate: new Date(Date.now() + step.offsetDays * 86400000),
            assignedToId: step.assigneeId
          }
        });

        // 📅 CREATE CALENDAR EVENT
        await db.calendarEvent.create({
          data: {
            tenantId: context.tenantId,
            matterId: params.matterId,
            title: step.name,
            type: 'STATUTORY_DEADLINE',
            start: new Date(),
            end: new Date(),
            isPrivate: false
          }
        });
      }
    }

    return true;
  }
}