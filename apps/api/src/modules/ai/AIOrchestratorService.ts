// apps/api/src/modules/ai/AIOrchestratorService.ts

import type {
  AIDbClient,
  AIExecutionInput,
  AIExecutionResult,
  AIScope,
  AISearchFilters,
} from './ai.types';
import { AIDocumentIntelligenceService } from './AIDocumentIntelligenceService';
import { AIMatterRiskService } from './AIMatterRiskService';
import { AIDeadlineIntelligenceService } from './AIDeadlineIntelligenceService';
import { AIBillingInsightService } from './AIBillingInsightService';
import { AITrustComplianceAlertService } from './AITrustComplianceAlertService';
import { AIDraftingAssistantService } from './AIDraftingAssistantService';
import { AIKnowledgeBaseService } from './AIKnowledgeBaseService';
import { AIProviderRegistry } from './AIProviderRegistry';
import { AIPolicyService } from './AIPolicyService';
import { AIPromptAuditService } from './AIPromptAuditService';
import { AIUsageLogService } from './AIUsageLogService';

function pageParams(page?: number, limit?: number) {
  const safePage = page && page > 0 ? page : 1;
  const safeLimit = limit && limit > 0 ? Math.min(limit, 100) : 50;

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
}

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function reviewPriorityForScope(scope: AIScope): 'NORMAL' | 'HIGH' | 'CRITICAL' {
  if (scope === 'trust-compliance-alerts' || scope === 'matter-risk') return 'CRITICAL';
  if (scope === 'document-analysis' || scope === 'contract-review') return 'HIGH';
  return 'NORMAL';
}

export class AIOrchestratorService {
  static async execute(db: AIDbClient, input: AIExecutionInput) {
    AIPolicyService.validateExecutionGuardrails(input);

    const taskType = AIPolicyService.taskTypeForScope(input.scope);
    const sensitivity = AIPolicyService.sensitivityForScope(input.scope);
    const providerResolution = await AIProviderRegistry.resolveProviderForScope(db, {
      tenantId: input.tenantId,
      scope: input.scope,
      preferredProvider: input.preferredProvider ?? null,
    });

    const provider = providerResolution?.config?.provider ?? 'INTERNAL_RULES';
    const systemPrompt = AIPolicyService.providerSystemPrompt(input.scope);
    const redactedInput = AIPolicyService.redactPayload(input.payload);

    const promptAudit = await AIPromptAuditService.createAudit(db, {
      tenantId: input.tenantId,
      provider,
      taskType,
      sensitivity,
      requesterUserId: input.requesterUserId,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      systemPrompt,
      userPrompt: `AI execution requested for scope ${input.scope}`,
      redactedInput,
      metadata: {
        scope: input.scope,
      },
    });

    if (!providerResolution) {
      await AIPromptAuditService.updateAudit(db, {
        promptAuditId: promptAudit.id,
        executionStatus: 'BLOCKED',
        outputPreview: {
          blocked: true,
          reason: 'No enabled AI provider configuration found for this tenant and scope.',
        },
      });

      const usageLog = await AIUsageLogService.blockExecution(db, {
        tenantId: input.tenantId,
        provider,
        taskType,
        sensitivity,
        requesterUserId: input.requesterUserId,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        promptAuditId: promptAudit.id,
        blockedReason:
          'No enabled governed AI provider configuration found for this scope.',
        metadata: {
          scope: input.scope,
        },
      });

      throw Object.assign(
        new Error(
          'AI execution is blocked because no enabled governed AI provider configuration exists for this scope.',
        ),
        {
          statusCode: 409,
          code: 'AI_PROVIDER_NOT_CONFIGURED',
          promptAuditId: promptAudit.id,
          usageLogId: usageLog.id,
        },
      );
    }

    if (!AIPolicyService.isProviderExecutionSupported(providerResolution.config.provider)) {
      await AIPromptAuditService.updateAudit(db, {
        promptAuditId: promptAudit.id,
        executionStatus: 'BLOCKED',
        outputPreview: {
          blocked: true,
          reason: 'Selected provider is configured but execution integration remains fail-closed.',
        },
      });

      const usageLog = await AIUsageLogService.blockExecution(db, {
        tenantId: input.tenantId,
        provider: providerResolution.config.provider,
        taskType,
        sensitivity,
        requesterUserId: input.requesterUserId,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        promptAuditId: promptAudit.id,
        blockedReason:
          'Configured external provider is not yet enabled for direct execution.',
        metadata: {
          scope: input.scope,
        },
      });

      throw Object.assign(
        new Error(
          'AI execution is blocked because the configured provider is not yet enabled for direct governed execution.',
        ),
        {
          statusCode: 409,
          code: 'AI_PROVIDER_EXECUTION_NOT_ENABLED',
          promptAuditId: promptAudit.id,
          usageLogId: usageLog.id,
        },
      );
    }

    const usageLog = await AIUsageLogService.startExecution(db, {
      tenantId: input.tenantId,
      provider: providerResolution.config.provider,
      taskType,
      sensitivity,
      requesterUserId: input.requesterUserId,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      promptAuditId: promptAudit.id,
      modelName: providerResolution.config.defaultModel ?? null,
      redactionApplied: providerResolution.config.redactionRequired,
      metadata: {
        scope: input.scope,
      },
    });

    let result: AIExecutionResult;

    try {
      result = this.dispatchScope(input.scope, input.payload);

      const requiresHumanReview = AIPolicyService.requiresHumanReview({
        provider: providerResolution.config.provider,
        configuredHumanReviewRequired: providerResolution.config.humanReviewRequired,
        scope: input.scope,
        sensitivity,
      });

      const artifact = await db.aiArtifact.create({
        data: {
          tenantId: input.tenantId,
          taskType,
          status: requiresHumanReview ? 'REVIEW_REQUIRED' : 'GENERATED',
          sensitivity,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          title: result.title,
          content: result.output,
          summary: result.summary,
          promptAuditId: promptAudit.id,
          requiresHumanReview,
          metadata: {
            scope: input.scope,
          },
        },
      });

      const recommendationRecords = [];
      for (const item of result.recommendations ?? []) {
        const created = await db.aiRecommendation.create({
          data: {
            tenantId: input.tenantId,
            taskType,
            status: 'OPEN',
            sensitivity,
            entityType: input.entityType ?? null,
            entityId: input.entityId ?? null,
            category: item.category,
            title: item.title,
            summary: item.summary,
            recommendation: item.recommendation,
            confidence: item.confidence ?? null,
            requiresHumanReview,
            artifactId: artifact.id,
            metadata: {
              scope: input.scope,
            },
          },
        });

        recommendationRecords.push(created);
      }

      let reviewTask = null;
      if (requiresHumanReview) {
        reviewTask = await db.aiReviewTask.create({
          data: {
            tenantId: input.tenantId,
            artifactId: artifact.id,
            taskType,
            status: 'PENDING',
            priority: reviewPriorityForScope(input.scope),
            entityType: input.entityType ?? null,
            entityId: input.entityId ?? null,
            reason:
              result.reviewReason ??
              'Human review is required by AI policy before operational reliance.',
            metadata: {
              scope: input.scope,
            },
          },
        });
      }

      await AIPromptAuditService.updateAudit(db, {
        promptAuditId: promptAudit.id,
        executionStatus: requiresHumanReview ? 'REVIEW_REQUIRED' : 'SUCCEEDED',
        outputPreview: {
          title: result.title,
          summary: result.summary,
        },
        metadata: {
          scope: input.scope,
          artifactId: artifact.id,
        },
      });

      await AIUsageLogService.finishExecution(db, {
        usageLogId: usageLog.id,
        status: requiresHumanReview ? 'REVIEW_REQUIRED' : 'SUCCEEDED',
        metadata: {
          scope: input.scope,
          artifactId: artifact.id,
          recommendationCount: recommendationRecords.length,
          reviewTaskId: reviewTask?.id ?? null,
        },
      });

      return {
        scope: input.scope,
        provider: providerResolution.config.provider,
        taskType,
        sensitivity,
        promptAudit,
        usageLogId: usageLog.id,
        artifact,
        recommendations: recommendationRecords,
        reviewTask,
        requiresHumanReview,
      };
    } catch (error: any) {
      await AIPromptAuditService.updateAudit(db, {
        promptAuditId: promptAudit.id,
        executionStatus: 'FAILED',
        outputPreview: {
          error: error?.message ?? 'Unknown AI execution failure',
        },
      });

      await AIUsageLogService.finishExecution(db, {
        usageLogId: usageLog.id,
        status: 'FAILED',
        errorMessage: error?.message ?? 'Unknown AI execution failure',
      });

      throw error;
    }
  }

  static dispatchScope(scope: AIScope, payload: Record<string, unknown>): AIExecutionResult {
    switch (scope) {
      case 'document-analysis':
        return AIDocumentIntelligenceService.analyze(payload);
      case 'contract-review':
        return AIDocumentIntelligenceService.reviewContract(payload);
      case 'matter-risk':
        return AIMatterRiskService.analyze(payload);
      case 'deadline-intelligence':
        return AIDeadlineIntelligenceService.analyze(payload);
      case 'billing-insights':
        return AIBillingInsightService.analyze(payload);
      case 'trust-compliance-alerts':
        return AITrustComplianceAlertService.analyze(payload);
      case 'drafting-assistant':
        return AIDraftingAssistantService.draft(payload);
      case 'knowledge-base':
        return AIKnowledgeBaseService.query(payload);
      case 'legal-research':
        return AIKnowledgeBaseService.research(payload);
      case 'client-intake-assistant':
        return AIKnowledgeBaseService.clientIntakeAssist(payload);
      default:
        throw Object.assign(new Error(`Unsupported AI scope: ${scope}`), {
          statusCode: 404,
          code: 'AI_SCOPE_UNSUPPORTED',
        });
    }
  }

  static async searchArtifacts(
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
      db.aiArtifact.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.aiArtifact.count({ where }),
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

export default AIOrchestratorService;