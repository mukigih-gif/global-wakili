// apps/api/src/modules/ai/ai.controller.ts

import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { AIAuditService } from './AIAuditService';
import { AICapabilityService } from './AICapabilityService';
import { AIProviderRegistry } from './AIProviderRegistry';
import { AIOrchestratorService } from './AIOrchestratorService';
import { AI_SCOPES } from './ai.types';
import type { AIScope } from './ai.types';
import { AIUsageLogService } from './AIUsageLogService';

function requireTenantId(req: Request): string {
  if (!req.tenantId?.trim()) {
    throw Object.assign(new Error('Tenant context is required for AI module'), {
      statusCode: 400,
      code: 'AI_TENANT_CONTEXT_REQUIRED',
    });
  }

  return req.tenantId;
}

function requireUserId(req: Request): string {
  const userId = req.user?.sub;
  if (!userId?.trim()) {
    throw Object.assign(new Error('Authenticated user is required for AI module'), {
      statusCode: 401,
      code: 'AI_USER_CONTEXT_REQUIRED',
    });
  }

  return userId;
}

async function logAction(
  req: Request,
  action: Parameters<typeof AIAuditService.logAction>[1]['action'],
  params?: {
    entityId?: string | null;
    entityType?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  await AIAuditService.logAction(req.db, {
    tenantId: requireTenantId(req),
    userId: req.user?.sub ?? null,
    action,
    entityId: params?.entityId ?? null,
    entityType: params?.entityType ?? 'AI',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    metadata: params?.metadata ?? {},
  });
}

async function executeScope(req: Request, res: Response, scope: AIScope) {
  const tenantId = requireTenantId(req);
  const requesterUserId = requireUserId(req);

  const result = await AIOrchestratorService.execute(req.db, {
    tenantId,
    requesterUserId,
    scope,
    entityType: req.body.entityType ?? null,
    entityId: req.body.entityId ?? null,
    preferredProvider: req.body.preferredProvider ?? null,
    payload: req.body,
  });

  await logAction(req, 'TASK_EXECUTED', {
    entityId: result.artifact.id,
    entityType: 'AI_ARTIFACT',
    metadata: {
      scope,
      provider: result.provider,
      taskType: result.taskType,
      sensitivity: result.sensitivity,
      reviewTaskId: result.reviewTask?.id ?? null,
      recommendationCount: result.recommendations.length,
    },
  });

  res.status(201).json(result);
}

export const getAIHealth = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'ai',
    status: 'mounted',
    service: 'global-wakili-api',
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

export const getAIHub = asyncHandler(async (req: Request, res: Response) => {
  const summary = AICapabilityService.getSummary();

  await logAction(req, 'HUB_VIEWED', {
    metadata: {
      active: summary.active,
    },
  });

  res.status(200).json({
    success: true,
    module: 'ai',
    status: 'governed',
    message:
      'Governed AI module is active with provider controls, prompt audit, usage logs, artifacts, review tasks, recommendations, and fail-closed execution.',
    plannedScopes: AI_SCOPES,
    architectureNotes: [
      'AI workflows remain tenant-scoped and permission-controlled.',
      'AI outputs remain assistant-generated and reviewable.',
      'External provider execution stays fail-closed until explicitly integrated.',
      'Internal rules execution supports governed intelligence without external data transfer.',
      'Artifacts, recommendations, prompt audit, and usage logs are persisted for traceability.',
    ],
    capabilitySummary: summary,
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

export const getAICapabilities = asyncHandler(async (req: Request, res: Response) => {
  const result = AICapabilityService.getSummary();

  await logAction(req, 'CAPABILITY_VIEWED', {
    metadata: {
      active: result.active,
      pendingExternalProviderExecution: result.pendingExternalProviderExecution,
      pendingCrossModuleBridges: result.pendingCrossModuleBridges,
      pendingPlatformGovernance: result.pendingPlatformGovernance,
    },
  });

  res.status(200).json(result);
});

export const getAIProviders = asyncHandler(async (req: Request, res: Response) => {
  const providers = AIProviderRegistry.getProviderCatalog();

  await logAction(req, 'PROVIDERS_VIEWED', {
    metadata: {
      providerCount: providers.length,
    },
  });

  res.status(200).json({
    providers,
  });
});

export const getAIProviderConfigs = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const configs = await AIProviderRegistry.listTenantProviderConfigs(req.db, tenantId);

  await logAction(req, 'PROVIDER_CONFIGS_VIEWED', {
    metadata: {
      configCount: configs.length,
    },
  });

  res.status(200).json({
    tenantId,
    configs,
  });
});

export const upsertAIProviderConfig = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);

  const result = await AIProviderRegistry.upsertProviderConfig(req.db, {
    tenantId,
    provider: req.body.provider,
    isEnabled: req.body.isEnabled,
    defaultModel: req.body.defaultModel,
    endpointUrl: req.body.endpointUrl,
    apiKeyRef: req.body.apiKeyRef,
    humanReviewRequired: req.body.humanReviewRequired,
    redactionRequired: req.body.redactionRequired,
    usageCapDaily: req.body.usageCapDaily,
    usageCapMonthly: req.body.usageCapMonthly,
    allowedScopes: req.body.allowedScopes,
    blockedScopes: req.body.blockedScopes,
    metadata: req.body.metadata,
  });

  await logAction(req, 'PROVIDER_CONFIG_UPSERTED', {
    entityId: result.id,
    entityType: 'AI_PROVIDER_CONFIG',
    metadata: {
      provider: result.provider,
      isEnabled: result.isEnabled,
    },
  });

  res.status(200).json(result);
});

export const searchAIArtifacts = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);

  const result = await AIOrchestratorService.searchArtifacts(req.db, {
    tenantId,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    filters: {
      taskType: req.query.taskType ? (String(req.query.taskType) as any) : null,
      status: req.query.status ? (String(req.query.status) as any) : null,
      entityType: req.query.entityType ? String(req.query.entityType) : null,
      entityId: req.query.entityId ? String(req.query.entityId) : null,
      createdFrom: req.query.createdFrom ? String(req.query.createdFrom) : null,
      createdTo: req.query.createdTo ? String(req.query.createdTo) : null,
    },
  });

  await logAction(req, 'ARTIFACTS_SEARCHED', {
    metadata: {
      total: result.meta.total,
      page: result.meta.page,
      limit: result.meta.limit,
    },
  });

  res.status(200).json(result);
});

export const searchAIUsageLogs = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);

  const result = await AIUsageLogService.searchUsageLogs(req.db, {
    tenantId,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    filters: {
      taskType: req.query.taskType ? (String(req.query.taskType) as any) : null,
      provider: req.query.provider ? (String(req.query.provider) as any) : null,
      status: req.query.status ? (String(req.query.status) as any) : null,
      entityType: req.query.entityType ? String(req.query.entityType) : null,
      entityId: req.query.entityId ? String(req.query.entityId) : null,
      createdFrom: req.query.createdFrom ? String(req.query.createdFrom) : null,
      createdTo: req.query.createdTo ? String(req.query.createdTo) : null,
    },
  });

  await logAction(req, 'USAGE_LOGS_SEARCHED', {
    metadata: {
      total: result.meta.total,
      page: result.meta.page,
      limit: result.meta.limit,
    },
  });

  res.status(200).json(result);
});

export const executeDocumentAnalysis = asyncHandler(async (req: Request, res: Response) => {
  await executeScope(req, res, 'document-analysis');
});

export const executeContractReview = asyncHandler(async (req: Request, res: Response) => {
  await executeScope(req, res, 'contract-review');
});

export const executeMatterRisk = asyncHandler(async (req: Request, res: Response) => {
  await executeScope(req, res, 'matter-risk');
});

export const executeDeadlineIntelligence = asyncHandler(
  async (req: Request, res: Response) => {
    await executeScope(req, res, 'deadline-intelligence');
  },
);

export const executeBillingInsights = asyncHandler(async (req: Request, res: Response) => {
  await executeScope(req, res, 'billing-insights');
});

export const executeTrustComplianceAlerts = asyncHandler(
  async (req: Request, res: Response) => {
    await executeScope(req, res, 'trust-compliance-alerts');
  },
);

export const executeClientIntakeAssistant = asyncHandler(
  async (req: Request, res: Response) => {
    await executeScope(req, res, 'client-intake-assistant');
  },
);

export const executeDraftingAssistant = asyncHandler(async (req: Request, res: Response) => {
  await executeScope(req, res, 'drafting-assistant');
});

export const executeKnowledgeBase = asyncHandler(async (req: Request, res: Response) => {
  await executeScope(req, res, 'knowledge-base');
});

export const executeLegalResearch = asyncHandler(async (req: Request, res: Response) => {
  await executeScope(req, res, 'legal-research');
});

export const getAIScopeHealth = asyncHandler(async (req: Request, res: Response) => {
  const scope = String(req.params.scope ?? '') as AIScope;

  if (!(AI_SCOPES as readonly string[]).includes(scope)) {
    return res.status(404).json({
      success: false,
      module: 'ai',
      error: 'Unknown AI scope',
      code: 'UNKNOWN_AI_SCOPE',
      scope,
      allowedScopes: AI_SCOPES,
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(200).json({
    success: true,
    module: 'ai',
    scope,
    status: 'governed-scope-available',
    message: `The ${scope} AI scope is available through the governed AI module.`,
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});