// apps/api/src/modules/ai/ai.controller.ts

import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { AIAuditService } from './AIAuditService';
import { AICapabilityService } from './AICapabilityService';
import { AIProviderRegistry } from './AIProviderRegistry';
import { AIOrchestratorService } from './AIOrchestratorService';
import {
  AI_ARTIFACT_STATUSES,
  AI_EXECUTION_STATUSES,
  AI_PROVIDERS,
  AI_SCOPES,
  AI_TASK_TYPES,
} from './ai.types';
import type { AIDbClient, AIArtifactStatus, AIExecutionStatus, AIProvider, AIScope, AITaskType } from './ai.types';
import { AIUsageLogService } from './AIUsageLogService';

function requireTenantId(req: Request): string {
  if (!req.tenantId?.trim()) {
    throw Object.assign(new Error('Tenant context is required for AI module'), {
      statusCode: 400,
      code: 'AI_TENANT_CONTEXT_REQUIRED',
    });
  }

  return req.tenantId.trim();
}

function requireUserId(req: Request): string {
  const userId = req.user?.sub;
  if (!userId?.trim()) {
    throw Object.assign(new Error('Authenticated user is required for AI module'), {
      statusCode: 401,
      code: 'AI_USER_CONTEXT_REQUIRED',
    });
  }

  return userId.trim();
}


function assertDelegate(
  db: Record<string, unknown>,
  delegateName: keyof AIDbClient,
  methods: string[],
): void {
  const delegate = db[delegateName as string] as Record<string, unknown> | undefined;

  if (!delegate || typeof delegate !== 'object') {
    throw Object.assign(
      new Error(`AI database delegate "${String(delegateName)}" is not available.`),
      {
        statusCode: 500,
        code: 'AI_DB_DELEGATE_MISSING',
        details: { delegateName },
      },
    );
  }

  const missingMethods = methods.filter((method) => typeof delegate[method] !== 'function');

  if (missingMethods.length > 0) {
    throw Object.assign(
      new Error(`AI database delegate "${String(delegateName)}" is missing required methods.`),
      {
        statusCode: 500,
        code: 'AI_DB_DELEGATE_METHOD_MISSING',
        details: { delegateName, missingMethods },
      },
    );
  }
}

function aiDb(req: Request): AIDbClient {
  const db = req.db as unknown as Record<string, unknown>;

  if (!db || typeof db !== 'object') {
    throw Object.assign(new Error('Database client is required for AI module.'), {
      statusCode: 500,
      code: 'AI_DB_CLIENT_REQUIRED',
    });
  }

  assertDelegate(db, 'tenant', ['findFirst']);
  assertDelegate(db, 'user', ['findFirst']);
  assertDelegate(db, 'aIProviderConfig', ['findFirst', 'findMany', 'create', 'update', 'count']);
  assertDelegate(db, 'aIPromptAudit', ['create', 'update', 'findFirst']);
  assertDelegate(db, 'aIUsageLog', ['create', 'update', 'findMany', 'count']);
  assertDelegate(db, 'aIArtifact', ['create', 'update', 'findMany', 'count']);
  assertDelegate(db, 'aIReviewTask', ['create', 'update', 'findMany', 'count']);
  assertDelegate(db, 'aIRecommendation', ['create', 'findMany', 'count']);
  assertDelegate(db, 'auditLog', ['create']);

  return db as unknown as AIDbClient;
}

function parsePositiveInteger(value: unknown, fieldName: string): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw Object.assign(new Error(`${fieldName} must be a positive number.`), {
      statusCode: 400,
      code: 'AI_INVALID_PAGINATION',
      details: { fieldName, value },
    });
  }

  return Math.trunc(parsed);
}

function parseOptionalString(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
}

function parseEnumQueryValue<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  fieldName: string,
): T | null {
  if (value === undefined || value === null || value === '') return null;

  const normalized = String(value);

  if (!allowedValues.includes(normalized as T)) {
    throw Object.assign(new Error(`${fieldName} is invalid.`), {
      statusCode: 400,
      code: 'AI_INVALID_QUERY_FILTER',
      details: { fieldName, value, allowedValues },
    });
  }

  return normalized as T;
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
  await AIAuditService.logAction(aiDb(req), {
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

  const result = await AIOrchestratorService.execute(aiDb(req), {
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
  const configs = await AIProviderRegistry.listTenantProviderConfigs(aiDb(req), tenantId);

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

  const result = await AIProviderRegistry.upsertProviderConfig(aiDb(req), {
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

  const result = await AIOrchestratorService.searchArtifacts(aiDb(req), {
    tenantId,
    page: parsePositiveInteger(req.query.page, 'page'),
    limit: parsePositiveInteger(req.query.limit, 'limit'),
    filters: {
      taskType: parseEnumQueryValue<AITaskType>(req.query.taskType, AI_TASK_TYPES, 'taskType'),
      status: parseEnumQueryValue<AIArtifactStatus>(req.query.status, AI_ARTIFACT_STATUSES, 'status'),
      entityType: parseOptionalString(req.query.entityType),
      entityId: parseOptionalString(req.query.entityId),
      createdFrom: parseOptionalString(req.query.createdFrom),
      createdTo: parseOptionalString(req.query.createdTo),
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

  const result = await AIUsageLogService.searchUsageLogs(aiDb(req), {
    tenantId,
    page: parsePositiveInteger(req.query.page, 'page'),
    limit: parsePositiveInteger(req.query.limit, 'limit'),
    filters: {
      taskType: parseEnumQueryValue<AITaskType>(req.query.taskType, AI_TASK_TYPES, 'taskType'),
      provider: parseEnumQueryValue<AIProvider>(req.query.provider, AI_PROVIDERS, 'provider'),
      status: parseEnumQueryValue<AIExecutionStatus>(req.query.status, AI_EXECUTION_STATUSES, 'status'),
      entityType: parseOptionalString(req.query.entityType),
      entityId: parseOptionalString(req.query.entityId),
      createdFrom: parseOptionalString(req.query.createdFrom),
      createdTo: parseOptionalString(req.query.createdTo),
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