// apps/api/src/modules/hr/performance.service.ts

import { Prisma, prisma } from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

export type PerformanceReviewStatus =
  | 'DRAFT'
  | 'SELF_REVIEW'
  | 'MANAGER_REVIEW'
  | 'CALIBRATION'
  | 'COMPLETED'
  | 'CANCELLED';

export type PerformanceRating =
  | 'EXCEEDS_EXPECTATIONS'
  | 'MEETS_EXPECTATIONS'
  | 'NEEDS_IMPROVEMENT'
  | 'UNSATISFACTORY'
  | 'NOT_RATED';

export type CreatePerformanceReviewInput = {
  tenantId: string;
  employeeId: string;
  reviewerId?: string | null;
  actorId: string;
  cycleName: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate?: Date | null;
  goals?: Array<{
    title: string;
    description?: string | null;
    weight?: number;
    target?: string | null;
    metric?: string | null;
  }>;
  metadata?: Record<string, unknown>;
};

export type SubmitPerformanceReviewInput = {
  tenantId: string;
  reviewId: string;
  actorId: string;
  comments?: string | null;
  selfRating?: PerformanceRating | string | null;
  managerRating?: PerformanceRating | string | null;
  score?: number | null;
  competencyScores?: Record<string, number>;
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

function normalizeScore(score?: number | null): number | null {
  if (score === null || score === undefined) return null;

  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw Object.assign(new Error('Performance score must be between 0 and 100'), {
      statusCode: 422,
      code: 'INVALID_PERFORMANCE_SCORE',
    });
  }

  return Math.round(score * 100) / 100;
}

function ratingFromScore(score: number | null): PerformanceRating {
  if (score === null) return 'NOT_RATED';
  if (score >= 85) return 'EXCEEDS_EXPECTATIONS';
  if (score >= 65) return 'MEETS_EXPECTATIONS';
  if (score >= 50) return 'NEEDS_IMPROVEMENT';
  return 'UNSATISFACTORY';
}

export class PerformanceService {
  async createReview(input: CreatePerformanceReviewInput) {
    return prisma.$transaction(async (tx) => {
      const employee = delegate(tx, 'employee');
      const performanceReview = delegate(tx, 'performanceReview');
      const performanceGoal = delegate(tx, 'performanceGoal');

      const existingEmployee = await employee.findFirst({
        where: {
          id: input.employeeId,
          tenantId: input.tenantId,
        },
      });

      if (!existingEmployee) {
        throw Object.assign(new Error('Employee not found'), {
          statusCode: 404,
          code: 'EMPLOYEE_NOT_FOUND',
        });
      }

      if (input.periodEnd < input.periodStart) {
        throw Object.assign(new Error('Performance period end cannot be before start'), {
          statusCode: 422,
          code: 'INVALID_PERFORMANCE_PERIOD',
        });
      }

      const review = await performanceReview.create({
        data: {
          tenantId: input.tenantId,
          employeeId: input.employeeId,
          reviewerId: input.reviewerId ?? existingEmployee.reportingManagerId ?? null,
          cycleName: input.cycleName,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          dueDate: input.dueDate ?? null,
          status: 'DRAFT',
          createdById: input.actorId,
          metadata: appendHistory(input.metadata, {
            action: 'PERFORMANCE_REVIEW_CREATED',
            actorId: input.actorId,
            at: new Date().toISOString(),
          }) as any,
        },
      });

      if (input.goals?.length) {
        await performanceGoal.createMany({
          data: input.goals.map((goal) => ({
            tenantId: input.tenantId,
            performanceReviewId: review.id,
            employeeId: input.employeeId,
            title: goal.title,
            description: goal.description ?? null,
            weight: goal.weight ?? null,
            target: goal.target ?? null,
            metric: goal.metric ?? null,
            status: 'ACTIVE',
            createdById: input.actorId,
          })),
        });
      }

      return performanceReview.findFirst({
        where: {
          id: review.id,
          tenantId: input.tenantId,
        },
        include: {
          goals: true,
        },
      });
    });
  }

  async startSelfReview(input: {
    tenantId: string;
    reviewId: string;
    actorId: string;
  }) {
    return this.transitionReview({
      ...input,
      status: 'SELF_REVIEW',
      action: 'PERFORMANCE_SELF_REVIEW_STARTED',
    });
  }

  async submitSelfReview(input: SubmitPerformanceReviewInput) {
    const score = normalizeScore(input.score);

    return prisma.$transaction(async (tx) => {
      const performanceReview = delegate(tx, 'performanceReview');

      const existing = await this.getReviewOrThrow(tx, input.tenantId, input.reviewId);

      if (!['DRAFT', 'SELF_REVIEW'].includes(String(existing.status))) {
        throw Object.assign(new Error('Performance review is not open for self review'), {
          statusCode: 409,
          code: 'PERFORMANCE_INVALID_STATUS',
        });
      }

      return performanceReview.update({
        where: {
          id: input.reviewId,
        },
        data: {
          status: 'MANAGER_REVIEW',
          selfRating: input.selfRating ?? ratingFromScore(score),
          selfScore: score,
          selfComments: input.comments ?? null,
          metadata: appendHistory(
            {
              ...asRecord(existing.metadata),
              ...(input.metadata ?? {}),
              competencyScores: input.competencyScores ?? asRecord(existing.metadata).competencyScores,
            },
            {
              action: 'PERFORMANCE_SELF_REVIEW_SUBMITTED',
              actorId: input.actorId,
              at: new Date().toISOString(),
            },
          ) as any,
          updatedById: input.actorId,
          updatedAt: new Date(),
        },
      });
    });
  }

  async submitManagerReview(input: SubmitPerformanceReviewInput) {
    const score = normalizeScore(input.score);

    return prisma.$transaction(async (tx) => {
      const performanceReview = delegate(tx, 'performanceReview');

      const existing = await this.getReviewOrThrow(tx, input.tenantId, input.reviewId);

      if (!['MANAGER_REVIEW', 'CALIBRATION'].includes(String(existing.status))) {
        throw Object.assign(new Error('Performance review is not open for manager review'), {
          statusCode: 409,
          code: 'PERFORMANCE_INVALID_STATUS',
        });
      }

      return performanceReview.update({
        where: {
          id: input.reviewId,
        },
        data: {
          status: 'COMPLETED',
          managerRating: input.managerRating ?? ratingFromScore(score),
          managerScore: score,
          finalRating: input.managerRating ?? ratingFromScore(score),
          finalScore: score,
          managerComments: input.comments ?? null,
          completedAt: new Date(),
          completedById: input.actorId,
          metadata: appendHistory(
            {
              ...asRecord(existing.metadata),
              ...(input.metadata ?? {}),
              competencyScores: input.competencyScores ?? asRecord(existing.metadata).competencyScores,
            },
            {
              action: 'PERFORMANCE_MANAGER_REVIEW_SUBMITTED',
              actorId: input.actorId,
              at: new Date().toISOString(),
            },
          ) as any,
          updatedById: input.actorId,
          updatedAt: new Date(),
        },
      });
    });
  }

  async cancelReview(input: {
    tenantId: string;
    reviewId: string;
    actorId: string;
    reason: string;
  }) {
    if (!input.reason?.trim()) {
      throw Object.assign(new Error('Cancellation reason is required'), {
        statusCode: 400,
        code: 'PERFORMANCE_CANCEL_REASON_REQUIRED',
      });
    }

    return prisma.$transaction(async (tx) => {
      const performanceReview = delegate(tx, 'performanceReview');

      const existing = await this.getReviewOrThrow(tx, input.tenantId, input.reviewId);

      if (String(existing.status) === 'COMPLETED') {
        throw Object.assign(new Error('Completed performance reviews cannot be cancelled'), {
          statusCode: 409,
          code: 'PERFORMANCE_REVIEW_COMPLETED',
        });
      }

      return performanceReview.update({
        where: {
          id: input.reviewId,
        },
        data: {
          status: 'CANCELLED',
          cancellationReason: input.reason,
          cancelledById: input.actorId,
          cancelledAt: new Date(),
          metadata: appendHistory(existing.metadata, {
            action: 'PERFORMANCE_REVIEW_CANCELLED',
            actorId: input.actorId,
            reason: input.reason,
            at: new Date().toISOString(),
          }) as any,
        },
      });
    });
  }

  async listReviews(input: {
    tenantId: string;
    employeeId?: string;
    reviewerId?: string;
    status?: PerformanceReviewStatus | string;
    year?: number;
    take?: number;
    skip?: number;
  }) {
    const performanceReview = delegate(prisma, 'performanceReview');

    return performanceReview.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.employeeId ? { employeeId: input.employeeId } : {}),
        ...(input.reviewerId ? { reviewerId: input.reviewerId } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.year
          ? {
              periodStart: {
                gte: new Date(input.year, 0, 1),
                lt: new Date(input.year + 1, 0, 1),
              },
            }
          : {}),
      },
      include: {
        goals: true,
      },
      orderBy: [
        { periodStart: 'desc' },
        { createdAt: 'desc' },
      ],
      take: Math.min(input.take ?? 100, 100),
      skip: input.skip ?? 0,
    });
  }

  async getReviewById(tenantId: string, reviewId: string) {
    const performanceReview = delegate(prisma, 'performanceReview');

    const existing = await performanceReview.findFirst({
      where: {
        id: reviewId,
        tenantId,
      },
      include: {
        goals: true,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Performance review not found'), {
        statusCode: 404,
        code: 'PERFORMANCE_REVIEW_NOT_FOUND',
      });
    }

    return existing;
  }

  private async transitionReview(input: {
    tenantId: string;
    reviewId: string;
    actorId: string;
    status: PerformanceReviewStatus;
    action: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const performanceReview = delegate(tx, 'performanceReview');

      const existing = await this.getReviewOrThrow(tx, input.tenantId, input.reviewId);

      return performanceReview.update({
        where: {
          id: input.reviewId,
        },
        data: {
          status: input.status,
          metadata: appendHistory(existing.metadata, {
            action: input.action,
            actorId: input.actorId,
            at: new Date().toISOString(),
          }) as any,
          updatedById: input.actorId,
          updatedAt: new Date(),
        },
      });
    });
  }

  private async getReviewOrThrow(
    tx: Prisma.TransactionClient,
    tenantId: string,
    reviewId: string,
  ) {
    const performanceReview = delegate(tx, 'performanceReview');

    const existing = await performanceReview.findFirst({
      where: {
        id: reviewId,
        tenantId,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Performance review not found'), {
        statusCode: 404,
        code: 'PERFORMANCE_REVIEW_NOT_FOUND',
      });
    }

    return existing;
  }
}

export const performanceService = new PerformanceService();

export default PerformanceService;