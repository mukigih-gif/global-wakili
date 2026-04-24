// apps/api/src/modules/ai/AIUsageLogService.ts

import type {
  AIDbClient,
  AIDataSensitivity,
  AIExecutionStatus,
  AIProvider,
  AITaskType,
  AISearchFilters,
} from './ai.types';

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid AI usage log date'), {
      statusCode: 422,
      code: 'AI_USAGE_DATE_INVALID',
    });
  }

  return parsed;
}

function pageParams(page?: number, limit?: number) {
  const safePage = page && page > 0 ? page : 1;
  const safeLimit = limit && limit > 0 ? Math.min(limit, 100) : 50;

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
}

export class AIUsageLogService {
  static async startExecution(
    db: AIDbClient,
    params: {
      tenantId: string;
      provider: AIProvider;
      taskType: AITaskType;
      sensitivity: AIDataSensitivity;
      requesterUserId?: string | null;
      entityType?: string | null;
      entityId?: string | null;
      promptAuditId?: string | null;
      modelName?: string | null;
      redactionApplied?: boolean;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    return db.aiUsageLog.create({
      data: {
        tenantId: params.tenantId,
        provider: params.provider,
        taskType: params.taskType,
        status: 'RUNNING',
        sensitivity: params.sensitivity,
        requesterUserId: params.requesterUserId ?? null,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        promptAuditId: params.promptAuditId ?? null,
        modelName: params.modelName ?? null,
        redactionApplied: params.redactionApplied ?? false,
        metadata: params.metadata ?? {},
        startedAt: new Date(),
      },
    });
  }

  static async finishExecution(
    db: AIDbClient,
    params: {
      usageLogId: string;
      status: Extract<AIExecutionStatus, 'SUCCEEDED' | 'FAILED' | 'REVIEW_REQUIRED'>;
      errorMessage?: string | null;
      outputTokens?: number | null;
      inputTokens?: number | null;
      totalTokens?: number | null;
      estimatedCost?: number | string | null;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    return db.aiUsageLog.update({
      where: { id: params.usageLogId },
      data: {
        status: params.status,
        errorMessage: params.errorMessage ?? null,
        inputTokens: params.inputTokens ?? null,
        outputTokens: params.outputTokens ?? null,
        totalTokens: params.totalTokens ?? null,
        estimatedCost: params.estimatedCost ?? null,
        metadata: params.metadata ?? {},
        completedAt: new Date(),
      },
    });
  }

  static async blockExecution(
    db: AIDbClient,
    params: {
      tenantId: string;
      provider: AIProvider;
      taskType: AITaskType;
      sensitivity: AIDataSensitivity;
      requesterUserId?: string | null;
      entityType?: string | null;
      entityId?: string | null;
      promptAuditId?: string | null;
      blockedReason: string;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    return db.aiUsageLog.create({
      data: {
        tenantId: params.tenantId,
        provider: params.provider,
        taskType: params.taskType,
        status: 'BLOCKED',
        sensitivity: params.sensitivity,
        requesterUserId: params.requesterUserId ?? null,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        promptAuditId: params.promptAuditId ?? null,
        blockedReason: params.blockedReason,
        metadata: params.metadata ?? {},
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });
  }

  static async searchUsageLogs(
    db: AIDbClient,
    params: {
      tenantId: string;
      filters?: AISearchFilters | null;
      page?: number;
      limit?: number;
    },
  ) {
    const { page, limit, skip } = pageParams(params.page, params.limit);
    const createdFrom = normalizeDate(params.filters?.createdFrom);
    const createdTo = normalizeDate(params.filters?.createdTo);

    const where = {
      tenantId: params.tenantId,
      ...(params.filters?.taskType ? { taskType: params.filters.taskType } : {}),
      ...(params.filters?.provider ? { provider: params.filters.provider } : {}),
      ...(params.filters?.status ? { status: params.filters.status } : {}),
      ...(params.filters?.entityType ? { entityType: params.filters.entityType } : {}),
      ...(params.filters?.entityId ? { entityId: params.filters.entityId } : {}),
      ...(createdFrom || createdTo
        ? {
            createdAt: {
              ...(createdFrom ? { gte: createdFrom } : {}),
              ...(createdTo ? { lte: createdTo } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      db.aiUsageLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.aiUsageLog.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export default AIUsageLogService;