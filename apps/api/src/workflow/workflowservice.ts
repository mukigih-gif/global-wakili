// apps/api/src/workflow/workflowservice.ts

type WorkflowStep = {
  name?: unknown;
  title?: unknown;
  offsetDays?: unknown;
  assigneeId?: unknown;
};

type WorkflowRecord = {
  id: string;
  name?: string | null;
  steps?: unknown;
};

type WorkflowDbClient = {
  workflow: {
    findMany(args: {
      where: {
        tenantId: string;
        triggerStage: string;
      };
      select: {
        id: true;
        name: true;
        steps: true;
      };
    }): Promise<WorkflowRecord[]>;
  };
  matterTask?: {
    create(args: {
      data: {
        tenantId: string;
        matterId: string;
        title: string;
        dueDate: Date;
        assignedToId?: string | null;
      };
    }): Promise<unknown>;
  };
  task?: {
    create(args: {
      data: {
        tenantId: string;
        matterId: string;
        title: string;
        dueDate: Date;
        assignedToId?: string | null;
      };
    }): Promise<unknown>;
  };
  calendarEvent: {
    create(args: {
      data: {
        tenantId: string;
        matterId: string;
        title: string;
        type: string;
        start: Date;
        end: Date;
        isPrivate: boolean;
      };
    }): Promise<unknown>;
  };
};

type WorkflowRequestContext = {
  tenantId: string;
  req: {
    db: WorkflowDbClient;
  };
};

type WorkflowTriggerParams = {
  matterId: string;
  stage: string;
};

type WorkflowTriggerResult = {
  triggered: boolean;
  workflowCount: number;
  taskCount: number;
  calendarEventCount: number;
};

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} is required`);
  }

  return value.trim();
}

function normalizeSteps(steps: unknown): WorkflowStep[] {
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps.filter((step): step is WorkflowStep => {
    return Boolean(step && typeof step === 'object');
  });
}

function getStepTitle(step: WorkflowStep): string {
  const title = step.title ?? step.name;

  if (typeof title === 'string' && title.trim()) {
    return title.trim();
  }

  return 'Workflow task';
}

function getOffsetDays(step: WorkflowStep): number {
  const offsetDays = Number(step.offsetDays ?? 0);

  if (!Number.isFinite(offsetDays)) {
    return 0;
  }

  return Math.max(0, Math.floor(offsetDays));
}

function getAssigneeId(step: WorkflowStep): string | null {
  return typeof step.assigneeId === 'string' && step.assigneeId.trim()
    ? step.assigneeId.trim()
    : null;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

async function createWorkflowTask(
  db: WorkflowDbClient,
  data: {
    tenantId: string;
    matterId: string;
    title: string;
    dueDate: Date;
    assignedToId: string | null;
  },
): Promise<void> {
  if (db.matterTask?.create) {
    await db.matterTask.create({
      data,
    });
    return;
  }

  if (db.task?.create) {
    await db.task.create({
      data,
    });
    return;
  }

  throw new Error('No task delegate is available for workflow task creation');
}

export class WorkflowService {
  static async trigger(
    context: WorkflowRequestContext,
    params: WorkflowTriggerParams,
  ): Promise<WorkflowTriggerResult> {
    const tenantId = requireString(context.tenantId, 'tenantId');
    const matterId = requireString(params.matterId, 'matterId');
    const stage = requireString(params.stage, 'stage');
    const db = context.req.db;

    const workflows = await db.workflow.findMany({
      where: {
        tenantId,
        triggerStage: stage,
      },
      select: {
        id: true,
        name: true,
        steps: true,
      },
    });

    let taskCount = 0;
    let calendarEventCount = 0;

    for (const workflow of workflows) {
      const steps = normalizeSteps(workflow.steps);

      for (const step of steps) {
        const title = getStepTitle(step);
        const dueDate = addDays(new Date(), getOffsetDays(step));
        const assignedToId = getAssigneeId(step);

        await createWorkflowTask(db, {
          tenantId,
          matterId,
          title,
          dueDate,
          assignedToId,
        });

        taskCount += 1;

        await db.calendarEvent.create({
          data: {
            tenantId,
            matterId,
            title,
            type: 'STATUTORY_DEADLINE',
            start: new Date(),
            end: dueDate,
            isPrivate: false,
          },
        });

        calendarEventCount += 1;
      }
    }

    return {
      triggered: workflows.length > 0,
      workflowCount: workflows.length,
      taskCount,
      calendarEventCount,
    };
  }
}

export default WorkflowService;