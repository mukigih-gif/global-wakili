// apps/api/src/modules/ai/AIPromptAuditService.ts

import type {
  AIDbClient,
  AIDataSensitivity,
  AIExecutionStatus,
  AIProvider,
  AITaskType,
} from './ai.types';

export class AIPromptAuditService {
  static async createAudit(
    db: AIDbClient,
    params: {
      tenantId: string;
      provider: AIProvider;
      taskType: AITaskType;
      sensitivity: AIDataSensitivity;
      requesterUserId?: string | null;
      entityType?: string | null;
      entityId?: string | null;
      systemPrompt?: string | null;
      userPrompt?: string | null;
      redactedInput?: Record<string, unknown> | null;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    return db.aiPromptAudit.create({
      data: {
        tenantId: params.tenantId,
        provider: params.provider,
        taskType: params.taskType,
        executionStatus: 'PENDING',
        sensitivity: params.sensitivity,
        systemPrompt: params.systemPrompt ?? null,
        userPrompt: params.userPrompt ?? null,
        redactedInput: params.redactedInput ?? {},
        requesterUserId: params.requesterUserId ?? null,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        metadata: params.metadata ?? {},
      },
    });
  }

  static async updateAudit(
    db: AIDbClient,
    params: {
      promptAuditId: string;
      executionStatus: AIExecutionStatus;
      outputPreview?: Record<string, unknown> | null;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    return db.aiPromptAudit.update({
      where: { id: params.promptAuditId },
      data: {
        executionStatus: params.executionStatus,
        outputPreview: params.outputPreview ?? {},
        metadata: params.metadata ?? {},
      },
    });
  }
}

export default AIPromptAuditService;