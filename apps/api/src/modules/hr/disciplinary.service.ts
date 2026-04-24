// apps/api/src/modules/hr/disciplinary.service.ts

import { Prisma, prisma } from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

export type DisciplinarySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type DisciplinaryStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'HEARING_SCHEDULED'
  | 'ACTION_ISSUED'
  | 'CLOSED'
  | 'CANCELLED';

export type DisciplinaryActionType =
  | 'VERBAL_WARNING'
  | 'WRITTEN_WARNING'
  | 'FINAL_WARNING'
  | 'SUSPENSION'
  | 'TERMINATION_RECOMMENDATION'
  | 'TRAINING'
  | 'NO_ACTION';

export type CreateDisciplinaryCaseInput = {
  tenantId: string;
  employeeId: string;
  reportedById: string;
  actorId: string;
  title: string;
  description: string;
  incidentDate: Date;
  severity?: DisciplinarySeverity;
  category?: string | null;
  witnessEmployeeIds?: string[];
  documentIds?: string[];
  metadata?: Record<string, unknown>;
};

export type DisciplinaryActionInput = {
  tenantId: string;
  caseId: string;
  actorId: string;
  actionType: DisciplinaryActionType;
  actionDate?: Date;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
};

function delegate(db: DbClient, name: string) {
  const modelDelegate = db[name];

  if (!modelDelegate) {
    throw Object.assign(
      new Error(`Prisma model delegate "${name}" is missing. Apply HR schema before activating this workflow.`),
      {
        statusCode: 500,
        code: 'HR_SCHEMA_DELEGATE_MISSING',
        model: name,
      },
    );
  }

  return modelDelegate;
}

function asRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, any>;
}

function appendHistory(metadata: unknown, entry: Record<string, unknown>) {
  const current = asRecord(metadata);
  const history = Array.isArray(current.history) ? current.history : [];

  return {
    ...current,
    history: [...history, entry],
  };
}

export class DisciplinaryService {
  async createCase(input: CreateDisciplinaryCaseInput) {
    const disciplinaryCase = delegate(prisma, 'disciplinaryCase');
    const employee = delegate(prisma, 'employee');

    const existingEmployee = await employee.findFirst({
      where: {
        id: input.employeeId,
        tenantId: input.tenantId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existingEmployee) {
      throw Object.assign(new Error('Employee not found'), {
        statusCode: 404,
        code: 'EMPLOYEE_NOT_FOUND',
      });
    }

    return disciplinaryCase.create({
      data: {
        tenantId: input.tenantId,
        employeeId: input.employeeId,
        reportedById: input.reportedById,
        title: input.title,
        description: input.description,
        incidentDate: input.incidentDate,
        severity: input.severity ?? 'MEDIUM',
        category: input.category ?? null,
        status: 'OPEN',
        witnessEmployeeIds: input.witnessEmployeeIds ?? [],
        documentIds: input.documentIds ?? [],
        createdById: input.actorId,
        metadata: appendHistory(input.metadata, {
          action: 'DISCIPLINARY_CASE_CREATED',
          actorId: input.actorId,
          at: new Date().toISOString(),
        }) as any,
      },
    });
  }

  async scheduleHearing(input: {
    tenantId: string;
    caseId: string;
    actorId: string;
    hearingAt: Date;
    location?: string | null;
    panelEmployeeIds?: string[];
    notes?: string | null;
  }) {
    return prisma.$transaction(async (tx) => {
      const disciplinaryCase = delegate(tx, 'disciplinaryCase');

      const existing = await this.getCaseOrThrow(tx, input.tenantId, input.caseId);

      if (['CLOSED', 'CANCELLED'].includes(String(existing.status))) {
        throw Object.assign(new Error('Closed disciplinary cases cannot be scheduled'), {
          statusCode: 409,
          code: 'DISCIPLINARY_CASE_CLOSED',
        });
      }

      return disciplinaryCase.update({
        where: {
          id: input.caseId,
        },
        data: {
          status: 'HEARING_SCHEDULED',
          hearingAt: input.hearingAt,
          hearingLocation: input.location ?? null,
          panelEmployeeIds: input.panelEmployeeIds ?? [],
          hearingNotes: input.notes ?? null,
          metadata: appendHistory(existing.metadata, {
            action: 'DISCIPLINARY_HEARING_SCHEDULED',
            actorId: input.actorId,
            hearingAt: input.hearingAt.toISOString(),
            at: new Date().toISOString(),
          }) as any,
          updatedById: input.actorId,
          updatedAt: new Date(),
        },
      });
    });
  }

  async issueAction(input: DisciplinaryActionInput) {
    return prisma.$transaction(async (tx) => {
      const disciplinaryCase = delegate(tx, 'disciplinaryCase');
      const disciplinaryAction = delegate(tx, 'disciplinaryAction');

      const existing = await this.getCaseOrThrow(tx, input.tenantId, input.caseId);

      if (['CLOSED', 'CANCELLED'].includes(String(existing.status))) {
        throw Object.assign(new Error('Closed disciplinary cases cannot receive actions'), {
          statusCode: 409,
          code: 'DISCIPLINARY_CASE_CLOSED',
        });
      }

      const action = await disciplinaryAction.create({
        data: {
          tenantId: input.tenantId,
          disciplinaryCaseId: input.caseId,
          employeeId: existing.employeeId,
          actionType: input.actionType,
          actionDate: input.actionDate ?? new Date(),
          effectiveFrom: input.effectiveFrom ?? null,
          effectiveTo: input.effectiveTo ?? null,
          notes: input.notes ?? null,
          issuedById: input.actorId,
          metadata: input.metadata ?? {},
        },
      });

      await disciplinaryCase.update({
        where: {
          id: input.caseId,
        },
        data: {
          status: 'ACTION_ISSUED',
          latestActionType: input.actionType,
          metadata: appendHistory(existing.metadata, {
            action: 'DISCIPLINARY_ACTION_ISSUED',
            actorId: input.actorId,
            actionType: input.actionType,
            disciplinaryActionId: action.id,
            at: new Date().toISOString(),
          }) as any,
          updatedById: input.actorId,
          updatedAt: new Date(),
        },
      });

      return action;
    });
  }

  async closeCase(input: {
    tenantId: string;
    caseId: string;
    actorId: string;
    resolution: string;
    notes?: string | null;
  }) {
    if (!input.resolution?.trim()) {
      throw Object.assign(new Error('Resolution is required to close disciplinary case'), {
        statusCode: 400,
        code: 'DISCIPLINARY_RESOLUTION_REQUIRED',
      });
    }

    return prisma.$transaction(async (tx) => {
      const disciplinaryCase = delegate(tx, 'disciplinaryCase');

      const existing = await this.getCaseOrThrow(tx, input.tenantId, input.caseId);

      if (String(existing.status) === 'CLOSED') return existing;

      return disciplinaryCase.update({
        where: {
          id: input.caseId,
        },
        data: {
          status: 'CLOSED',
          resolution: input.resolution,
          closureNotes: input.notes ?? null,
          closedById: input.actorId,
          closedAt: new Date(),
          metadata: appendHistory(existing.metadata, {
            action: 'DISCIPLINARY_CASE_CLOSED',
            actorId: input.actorId,
            resolution: input.resolution,
            at: new Date().toISOString(),
          }) as any,
        },
      });
    });
  }

  async cancelCase(input: {
    tenantId: string;
    caseId: string;
    actorId: string;
    reason: string;
  }) {
    if (!input.reason?.trim()) {
      throw Object.assign(new Error('Cancellation reason is required'), {
        statusCode: 400,
        code: 'DISCIPLINARY_CANCEL_REASON_REQUIRED',
      });
    }

    return prisma.$transaction(async (tx) => {
      const disciplinaryCase = delegate(tx, 'disciplinaryCase');

      const existing = await this.getCaseOrThrow(tx, input.tenantId, input.caseId);

      if (['CLOSED', 'CANCELLED'].includes(String(existing.status))) {
        return existing;
      }

      return disciplinaryCase.update({
        where: {
          id: input.caseId,
        },
        data: {
          status: 'CANCELLED',
          cancellationReason: input.reason,
          cancelledById: input.actorId,
          cancelledAt: new Date(),
          metadata: appendHistory(existing.metadata, {
            action: 'DISCIPLINARY_CASE_CANCELLED',
            actorId: input.actorId,
            reason: input.reason,
            at: new Date().toISOString(),
          }) as any,
        },
      });
    });
  }

  async listCases(input: {
    tenantId: string;
    employeeId?: string;
    status?: DisciplinaryStatus | string;
    severity?: DisciplinarySeverity | string;
    from?: Date;
    to?: Date;
    take?: number;
    skip?: number;
  }) {
    const disciplinaryCase = delegate(prisma, 'disciplinaryCase');

    return disciplinaryCase.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.employeeId ? { employeeId: input.employeeId } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.severity ? { severity: input.severity } : {}),
        ...(input.from || input.to
          ? {
              incidentDate: {
                ...(input.from ? { gte: input.from } : {}),
                ...(input.to ? { lte: input.to } : {}),
              },
            }
          : {}),
      },
      include: {
        actions: true,
      },
      orderBy: [
        { incidentDate: 'desc' },
        { createdAt: 'desc' },
      ],
      take: Math.min(input.take ?? 100, 100),
      skip: input.skip ?? 0,
    });
  }

  async getCaseById(tenantId: string, caseId: string) {
    const disciplinaryCase = delegate(prisma, 'disciplinaryCase');

    const existing = await disciplinaryCase.findFirst({
      where: {
        id: caseId,
        tenantId,
      },
      include: {
        actions: true,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Disciplinary case not found'), {
        statusCode: 404,
        code: 'DISCIPLINARY_CASE_NOT_FOUND',
      });
    }

    return existing;
  }

  private async getCaseOrThrow(
    tx: Prisma.TransactionClient,
    tenantId: string,
    caseId: string,
  ) {
    const disciplinaryCase = delegate(tx, 'disciplinaryCase');

    const existing = await disciplinaryCase.findFirst({
      where: {
        id: caseId,
        tenantId,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Disciplinary case not found'), {
        statusCode: 404,
        code: 'DISCIPLINARY_CASE_NOT_FOUND',
      });
    }

    return existing;
  }
}

export const disciplinaryService = new DisciplinaryService();

export default DisciplinaryService;