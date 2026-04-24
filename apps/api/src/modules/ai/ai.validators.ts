// apps/api/src/modules/ai/ai.validators.ts

import { z } from 'zod';
import {
  AI_ARTIFACT_STATUSES,
  AI_DATA_SENSITIVITIES,
  AI_EXECUTION_STATUSES,
  AI_PROVIDERS,
  AI_SCOPES,
  AI_TASK_TYPES,
} from './ai.types';

const safeJsonObject = z.record(z.string(), z.unknown());
const isoDateTime = z.string().datetime();

export const aiScopeSchema = z.enum(AI_SCOPES);
export const aiProviderSchema = z.enum(AI_PROVIDERS);
export const aiTaskTypeSchema = z.enum(AI_TASK_TYPES);
export const aiExecutionStatusSchema = z.enum(AI_EXECUTION_STATUSES);
export const aiArtifactStatusSchema = z.enum(AI_ARTIFACT_STATUSES);
export const aiSensitivitySchema = z.enum(AI_DATA_SENSITIVITIES);

export const aiProviderConfigUpsertSchema = z
  .object({
    provider: aiProviderSchema,
    isEnabled: z.boolean(),
    defaultModel: z.string().trim().max(255).nullable().optional(),
    endpointUrl: z.string().trim().url().max(2000).nullable().optional(),
    apiKeyRef: z.string().trim().max(255).nullable().optional(),
    humanReviewRequired: z.boolean().optional(),
    redactionRequired: z.boolean().optional(),
    usageCapDaily: z.coerce.number().int().min(1).nullable().optional(),
    usageCapMonthly: z.coerce.number().int().min(1).nullable().optional(),
    allowedScopes: z.array(aiScopeSchema).nullable().optional(),
    blockedScopes: z.array(aiScopeSchema).nullable().optional(),
    metadata: safeJsonObject.nullable().optional(),
  })
  .strict();

export const aiArtifactSearchQuerySchema = z
  .object({
    taskType: aiTaskTypeSchema.optional(),
    status: aiArtifactStatusSchema.optional(),
    entityType: z.string().trim().max(100).optional(),
    entityId: z.string().trim().max(150).optional(),
    createdFrom: isoDateTime.optional(),
    createdTo: isoDateTime.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export const aiUsageSearchQuerySchema = z
  .object({
    taskType: aiTaskTypeSchema.optional(),
    provider: aiProviderSchema.optional(),
    status: aiExecutionStatusSchema.optional(),
    entityType: z.string().trim().max(100).optional(),
    entityId: z.string().trim().max(150).optional(),
    createdFrom: isoDateTime.optional(),
    createdTo: isoDateTime.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

const aiExecutionBaseSchema = z
  .object({
    entityType: z.string().trim().max(100).nullable().optional(),
    entityId: z.string().trim().max(150).nullable().optional(),
    preferredProvider: aiProviderSchema.nullable().optional(),
    metadata: safeJsonObject.nullable().optional(),
  })
  .strict();

export const aiDocumentAnalysisSchema = aiExecutionBaseSchema.extend({
  title: z.string().trim().max(255).nullable().optional(),
  fileName: z.string().trim().max(255).nullable().optional(),
  mimeType: z.string().trim().max(255).nullable().optional(),
  pageCount: z.coerce.number().int().min(1).nullable().optional(),
  contentText: z.string().trim().min(1).max(20000),
  tags: z.array(z.string().trim().max(100)).optional(),
});

export const aiMatterRiskSchema = aiExecutionBaseSchema.extend({
  matterName: z.string().trim().max(255).nullable().optional(),
  riskScore: z.coerce.number().min(0).max(100).nullable().optional(),
  openTasks: z.coerce.number().int().min(0).optional(),
  overdueDeadlines: z.coerce.number().int().min(0).optional(),
  outstandingInvoices: z.coerce.number().int().min(0).optional(),
  trustBalance: z.coerce.number().nullable().optional(),
  complianceFlags: z.array(z.string().trim().max(255)).optional(),
});

export const aiDeadlineIntelligenceSchema = aiExecutionBaseSchema.extend({
  deadlines: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(255),
        date: isoDateTime,
        owner: z.string().trim().max(255).nullable().optional(),
        source: z.string().trim().max(100).nullable().optional(),
        severity: z.string().trim().max(100).nullable().optional(),
      }),
    )
    .min(1),
});

export const aiBillingInsightSchema = aiExecutionBaseSchema.extend({
  invoices: z
    .array(
      z.object({
        invoiceNumber: z.string().trim().min(1).max(100),
        status: z.string().trim().max(100),
        total: z.coerce.number(),
        balanceDue: z.coerce.number().optional(),
        paidAmount: z.coerce.number().optional(),
        dueDate: isoDateTime.nullable().optional(),
      }),
    )
    .min(1),
});

export const aiTrustComplianceAlertSchema = aiExecutionBaseSchema.extend({
  trustBalance: z.coerce.number().nullable().optional(),
  unreconciledCount: z.coerce.number().int().min(0).optional(),
  suspiciousFlags: z.array(z.string().trim().max(255)).optional(),
  clientRiskBand: z.string().trim().max(100).nullable().optional(),
  complianceReportStatus: z.string().trim().max(100).nullable().optional(),
});

export const aiDraftingAssistantSchema = aiExecutionBaseSchema.extend({
  documentType: z.string().trim().min(1).max(100),
  title: z.string().trim().max(255).nullable().optional(),
  goal: z.string().trim().min(1).max(5000),
  audience: z.string().trim().max(255).nullable().optional(),
  tone: z.string().trim().max(100).nullable().optional(),
  facts: z.array(z.string().trim().max(2000)).optional(),
  requestedSections: z.array(z.string().trim().max(255)).optional(),
});

export const aiKnowledgeBaseQuerySchema = aiExecutionBaseSchema.extend({
  query: z.string().trim().min(1).max(5000),
  sources: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(255),
        content: z.string().trim().min(1).max(20000),
        reference: z.string().trim().max(500).nullable().optional(),
      }),
    )
    .min(1),
});

export const aiClientIntakeAssistantSchema = aiExecutionBaseSchema.extend({
  clientName: z.string().trim().max(255).nullable().optional(),
  clientType: z.string().trim().max(100).nullable().optional(),
  notes: z.string().trim().min(1).max(10000),
  questions: z.array(z.string().trim().max(500)).optional(),
});

export const aiLegalResearchSchema = aiKnowledgeBaseQuerySchema;

export const aiContractReviewSchema = aiDocumentAnalysisSchema;

export type AIProviderConfigUpsertDto = z.infer<
  typeof aiProviderConfigUpsertSchema
>;