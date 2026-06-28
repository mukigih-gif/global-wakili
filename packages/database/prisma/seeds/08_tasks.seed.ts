import { PrismaClient, TaskPriority, TaskStatus, TenantRole } from '@prisma/client';

/*
 * 08_tasks.seed.ts — Per-tenant matter-task layer (CLAUDE.md §12).
 *
 * Seeds MatterTasks linked to the seeded matters and assigned to seeded users
 * (advocate / associate / clerk). createdBy = the advocate.
 *
 * DEMO/FIXTURE data — run only under the master demo-data gate.
 *
 * Schema reality (verified, model MatterTask):
 * - Required: tenantId, matterId, title, createdById. Optional: description,
 *   assignedTo, dueDate, completedAt. status TaskStatus (default TODO);
 *   priority TaskPriority (default NORMAL).
 *
 * Policy:
 * - Idempotent: not @@unique → findFirst (tenantId, matterId, title) then
 *   update/create. Deterministic → reruns converge.
 * - Matter/assignee resolved within the tenant; missing matter skips the task.
 * - completedAt is set only for DONE tasks. Tenant-scoped. No schema changes.
 */

type SeedPrisma = PrismaClient;

type AssigneeRole = 'ADVOCATE' | 'ASSOCIATE' | 'CLERK';

type TaskSeed = {
  matterCode: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignTo: AssigneeRole;
  dueDate: string; // ISO, deterministic
};

export type TasksSeedResult = {
  status: 'tasks_seed_complete';
  tenantId: string;
  tasks: number;
};

const TASK_SEEDS: TaskSeed[] = [
  // MAT-0002 — Acme litigation
  { matterCode: 'MAT-0002', title: 'Draft statement of defence', description: 'Prepare and settle the defence for filing.', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, assignTo: 'ADVOCATE', dueDate: '2026-07-02' },
  { matterCode: 'MAT-0002', title: 'Compile bundle of documents', description: 'Assemble and paginate the hearing bundle.', status: TaskStatus.TODO, priority: TaskPriority.NORMAL, assignTo: 'ASSOCIATE', dueDate: '2026-07-07' },
  { matterCode: 'MAT-0002', title: 'Serve pleadings on opposing counsel', description: 'Effect service and file affidavit of service.', status: TaskStatus.TODO, priority: TaskPriority.NORMAL, assignTo: 'CLERK', dueDate: '2026-07-04' },

  // MAT-0004 — Conveyancing
  { matterCode: 'MAT-0004', title: 'Conduct official land search', description: 'Obtain official search at the lands registry.', status: TaskStatus.DONE, priority: TaskPriority.NORMAL, assignTo: 'CLERK', dueDate: '2026-06-15' },
  { matterCode: 'MAT-0004', title: 'Prepare sale agreement', description: 'Draft the sale agreement and circulate.', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, assignTo: 'ADVOCATE', dueDate: '2026-07-05' },

  // MAT-0005 — Probate
  { matterCode: 'MAT-0005', title: 'File petition for grant of probate', description: 'Lodge the petition and supporting affidavits.', status: TaskStatus.DONE, priority: TaskPriority.HIGH, assignTo: 'ADVOCATE', dueDate: '2026-06-08' },
  { matterCode: 'MAT-0005', title: 'Publish gazette notice', description: 'Arrange gazettement of the probate notice.', status: TaskStatus.TODO, priority: TaskPriority.NORMAL, assignTo: 'CLERK', dueDate: '2026-07-10' },

  // MAT-0007 — Judicial review
  { matterCode: 'MAT-0007', title: 'Draft replying affidavit', description: 'Prepare the replying affidavit for the JR.', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, assignTo: 'ADVOCATE', dueDate: '2026-07-12' },
  { matterCode: 'MAT-0007', title: 'File written submissions', description: 'Settle and file written submissions ahead of hearing.', status: TaskStatus.BLOCKED, priority: TaskPriority.URGENT, assignTo: 'ASSOCIATE', dueDate: '2026-07-18' },

  // MAT-0001 — Acquisition
  { matterCode: 'MAT-0001', title: 'Complete due diligence checklist', description: 'Run corporate/financial due diligence on the target.', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.NORMAL, assignTo: 'ASSOCIATE', dueDate: '2026-07-14' },
];

async function resolveMatterId(
  prisma: SeedPrisma,
  tenantId: string,
  matterCode: string,
): Promise<string | null> {
  const matter = await prisma.matter.findFirst({
    where: { tenantId, matterCode },
    select: { id: true },
  });

  return matter?.id ?? null;
}

export async function seedTasks(
  prisma: PrismaClient,
  tenantId: string,
): Promise<TasksSeedResult> {
  if (!tenantId || tenantId.trim().length === 0) {
    throw new Error('seedTasks requires a tenantId.');
  }

  // Resolve the assignable users once. Advocate is also the creator (required).
  const [advocate, associate, clerk] = await Promise.all([
    prisma.user.findFirst({ where: { tenantId, tenantRole: TenantRole.ADVOCATE }, select: { id: true } }),
    prisma.user.findFirst({ where: { tenantId, tenantRole: TenantRole.ASSOCIATE }, select: { id: true } }),
    prisma.user.findFirst({ where: { tenantId, tenantRole: TenantRole.CLERK }, select: { id: true } }),
  ]);

  const creator =
    advocate ??
    (await prisma.user.findFirst({ where: { tenantId, status: 'ACTIVE' }, select: { id: true } }));

  if (!creator) {
    throw new Error(`seedTasks: no user for tenant ${tenantId}. Run 02_users first.`);
  }

  const assigneeByRole: Record<AssigneeRole, string | null> = {
    ADVOCATE: advocate?.id ?? creator.id,
    ASSOCIATE: associate?.id ?? creator.id,
    CLERK: clerk?.id ?? creator.id,
  };

  let tasks = 0;

  for (const def of TASK_SEEDS) {
    const matterId = await resolveMatterId(prisma, tenantId, def.matterCode);
    if (!matterId) {
      continue;
    }

    const dueDate = new Date(def.dueDate);
    const completedAt = def.status === TaskStatus.DONE ? dueDate : null;
    const assignedTo = assigneeByRole[def.assignTo];

    const data = {
      description: def.description,
      status: def.status,
      priority: def.priority,
      assignedTo,
      dueDate,
      completedAt,
      createdById: creator.id,
    };

    const existing = await prisma.matterTask.findFirst({
      where: { tenantId, matterId, title: def.title },
      select: { id: true },
    });

    if (existing) {
      await prisma.matterTask.update({ where: { id: existing.id }, data });
    } else {
      await prisma.matterTask.create({
        data: { tenantId, matterId, title: def.title, ...data },
      });
    }

    tasks += 1;
  }

  return { status: 'tasks_seed_complete', tenantId, tasks };
}
