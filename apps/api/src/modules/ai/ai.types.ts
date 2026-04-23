// apps/api/src/modules/ai/ai.types.ts

export const AI_SCOPES = [
  'legal-research',
  'document-analysis',
  'contract-review',
  'matter-risk',
  'deadline-intelligence',
  'billing-insights',
  'trust-compliance-alerts',
  'client-intake-assistant',
  'drafting-assistant',
  'knowledge-base',
] as const;

export const AI_PROVIDERS = [
  'OPENAI',
  'AZURE_OPENAI',
  'ANTHROPIC',
  'GOOGLE_GEMINI',
  'AWS_BEDROCK',
  'INTERNAL_RULES',
  'OCR_ONLY',
] as const;

export const AI_TASK_TYPES = [
  'DOCUMENT_ANALYSIS',
  'LEGAL_RESEARCH',
  'CONTRACT_REVIEW',
  'MATTER_RISK',
  'DEADLINE_INTELLIGENCE',
  'BILLING_INSIGHT',
  'TRUST_COMPLIANCE_ALERT',
  'CLIENT_INTAKE_ASSISTANT',
  'DRAFTING_ASSISTANT',
  'KNOWLEDGE_BASE',
  'EXTRACTION',
  'SUMMARIZATION',
  'RECOMMENDATION',
] as const;

export const AI_EXECUTION_STATUSES = [
  'PENDING',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'BLOCKED',
  'CANCELLED',
  'REVIEW_REQUIRED',
] as const;

export const AI_ARTIFACT_STATUSES = [
  'DRAFT',
  'GENERATED',
  'REVIEW_REQUIRED',
  'APPROVED',
  'REJECTED',
  'ARCHIVED',
] as const;

export const AI_REVIEW_STATUSES = [
  'PENDING',
  'IN_REVIEW',
  'APPROVED',
  'REJECTED',
  'ESCALATED',
] as const;

export const AI_RECOMMENDATION_STATUSES = [
  'OPEN',
  'ACCEPTED',
  'REJECTED',
  'DISMISSED',
  'EXPIRED',
] as const;

export const AI_DATA_SENSITIVITIES = [
  'PUBLIC',
  'INTERNAL',
  'CONFIDENTIAL',
  'PRIVILEGED',
  'HIGHLY_RESTRICTED',
] as const;

export type AIScope = (typeof AI_SCOPES)[number];
export type AIProvider = (typeof AI_PROVIDERS)[number];
export type AITaskType = (typeof AI_TASK_TYPES)[number];
export type AIExecutionStatus = (typeof AI_EXECUTION_STATUSES)[number];
export type AIArtifactStatus = (typeof AI_ARTIFACT_STATUSES)[number];
export type AIReviewStatus = (typeof AI_REVIEW_STATUSES)[number];
export type AIRecommendationStatus =
  (typeof AI_RECOMMENDATION_STATUSES)[number];
export type AIDataSensitivity = (typeof AI_DATA_SENSITIVITIES)[number];

export type AIAuditAction =
  | 'HUB_VIEWED'
  | 'CAPABILITY_VIEWED'
  | 'PROVIDERS_VIEWED'
  | 'PROVIDER_CONFIGS_VIEWED'
  | 'PROVIDER_CONFIG_UPSERTED'
  | 'ARTIFACTS_SEARCHED'
  | 'USAGE_LOGS_SEARCHED'
  | 'TASK_EXECUTED';

export type AIRecommendationDraft = {
  category: string;
  title: string;
  summary: string;
  recommendation: Record<string, unknown>;
  confidence?: number | null;
};

export type AIExecutionResult = {
  title: string;
  summary: string;
  output: Record<string, unknown>;
  recommendations?: AIRecommendationDraft[];
  requiresHumanReview?: boolean;
  reviewReason?: string | null;
};

export type AIExecutionInput = {
  tenantId: string;
  requesterUserId: string;
  scope: AIScope;
  entityType?: string | null;
  entityId?: string | null;
  payload: Record<string, unknown>;
  preferredProvider?: AIProvider | null;
};

export type AIProviderConfigInput = {
  tenantId: string;
  provider: AIProvider;
  isEnabled: boolean;
  defaultModel?: string | null;
  endpointUrl?: string | null;
  apiKeyRef?: string | null;
  humanReviewRequired?: boolean;
  redactionRequired?: boolean;
  usageCapDaily?: number | null;
  usageCapMonthly?: number | null;
  allowedScopes?: AIScope[] | null;
  blockedScopes?: AIScope[] | null;
  metadata?: Record<string, unknown> | null;
};

export type AISearchFilters = {
  taskType?: AITaskType | null;
  status?: AIExecutionStatus | AIArtifactStatus | null;
  entityType?: string | null;
  entityId?: string | null;
  provider?: AIProvider | null;
  createdFrom?: Date | string | null;
  createdTo?: Date | string | null;
};

export type AIDbClient = {
  $transaction?: Function;
  tenant: {
    findFirst: Function;
  };
  user: {
    findFirst: Function;
  };
  aiProviderConfig: {
    findFirst: Function;
    findMany: Function;
    create: Function;
    update: Function;
    count: Function;
  };
  aiPromptAudit: {
    create: Function;
    update: Function;
    findFirst: Function;
  };
  aiUsageLog: {
    create: Function;
    update: Function;
    findMany: Function;
    count: Function;
  };
  aiArtifact: {
    create: Function;
    update: Function;
    findMany: Function;
    count: Function;
  };
  aiReviewTask: {
    create: Function;
    update: Function;
    findMany: Function;
    count: Function;
  };
  aiRecommendation: {
    create: Function;
    findMany: Function;
    count: Function;
  };
  auditLog: {
    create: Function;
  };
};