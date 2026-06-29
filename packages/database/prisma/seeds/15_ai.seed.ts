import {
  AIArtifactStatus,
  AIDataSensitivity,
  AIExecutionStatus,
  AIProvider,
  AIRecommendationStatus,
  AIReviewStatus,
  AITaskType,
  Prisma,
  PrismaClient,
  TenantRole,
} from '@prisma/client';

/*
 * 15_ai.seed.ts — Per-tenant AI legal-operations layer (CLAUDE.md §12; TODO-006).
 *
 * Comprehensive AI-domain seed: ALL six models populated (standing directive):
 *   AIProviderConfig, AIPromptAudit, AIUsageLog, AIArtifact, AIReviewTask,
 *   AIRecommendation.
 *
 * Schema realities handled:
 *   - There is NO PromptTemplate / PromptVersion / ReviewWorkflow /
 *     ApprovalRecord model. Prompts are referenced by AIPromptAudit
 *     .promptTemplateKey (String); template "versions" are recorded in
 *     metadata.promptVersion. The human-review gate is AIReviewTask; its
 *     status (APPROVED / PENDING) is the approval record.
 *   - AIProviderConfig has no status field — enablement is `isEnabled`.
 *
 * AI governance (ADR-011): every artifact requiresHumanReview=true and is NOT
 * auto-approved; providers seed humanReviewRequired + redactionRequired and a
 * promptInjectionProtection flag. No real API keys — apiKeyRef is a masked
 * placeholder.
 *
 * DEMO/FIXTURE data — run only under the master demo-data gate.
 *
 * Policy:
 * - Idempotent: provider upsert(tenantId,provider); prompt audit gated by
 *   findFirst(tenantId,promptTemplateKey); usage log by (tenantId,promptAuditId);
 *   artifact by (tenantId,title); review task by (tenantId,artifactId);
 *   recommendation by (tenantId,title).
 * - Tenant-scoped. No schema changes, no destructive operations.
 */

type SeedPrisma = PrismaClient;

type ProviderSeed = { provider: AIProvider; defaultModel: string; models: string[]; apiKeyRef: string };
type PromptSeed = { key: string; name: string; taskType: AITaskType; provider: AIProvider; system: string; user: string };
type ArtifactSeed = { title: string; templateKey: string; taskType: AITaskType; summary: string; content: Prisma.InputJsonObject; review: AIReviewStatus };
type RecommendationSeed = { title: string; category: string; taskType: AITaskType; summary: string; confidence: number; linkArtifactKey: string | null };

export type AiSeedResult = {
  status: 'ai_seed_complete';
  tenantId: string;
  aiProviderConfigs: number;
  aiPromptAudits: number;
  aiUsageLogs: number;
  aiArtifacts: number;
  aiReviewTasks: number;
  aiRecommendations: number;
};

const PROMPT_VERSION = '1.0';
const PLACEHOLDER_KEY = 'sk-seed-placeholder';

const PROVIDERS: ProviderSeed[] = [
  { provider: AIProvider.ANTHROPIC, defaultModel: 'claude-opus-4-8', models: ['claude-opus-4-8', 'claude-sonnet-4-6'], apiKeyRef: `${PLACEHOLDER_KEY}-anthropic` },
  { provider: AIProvider.OPENAI, defaultModel: 'gpt-4o', models: ['gpt-4o', 'gpt-4o-mini'], apiKeyRef: `${PLACEHOLDER_KEY}-openai` },
];

const PROMPTS: PromptSeed[] = [
  { key: 'contract-review', name: 'Contract Review / Risk Analysis', taskType: AITaskType.CONTRACT_REVIEW, provider: AIProvider.ANTHROPIC, system: 'You are a Kenyan legal contract risk analyst. Identify risks, missing clauses and compliance gaps.', user: 'Review the attached contract and flag material risks.' },
  { key: 'matter-summary', name: 'Matter Summary Generation', taskType: AITaskType.SUMMARIZATION, provider: AIProvider.ANTHROPIC, system: 'You summarise legal matters concisely for a partner audience.', user: 'Summarise the current status of this matter.' },
  { key: 'legal-research', name: 'Legal Research Assistant', taskType: AITaskType.LEGAL_RESEARCH, provider: AIProvider.OPENAI, system: 'You are a Kenyan legal research assistant citing statute and case law.', user: 'Research the limitation period for breach of contract claims in Kenya.' },
  { key: 'document-drafting', name: 'Document Drafting Assistant', taskType: AITaskType.DRAFTING_ASSISTANT, provider: AIProvider.ANTHROPIC, system: 'You draft Kenyan legal documents from firm templates.', user: 'Draft a standard lease agreement for a commercial premises.' },
];

const ARTIFACTS: ArtifactSeed[] = [
  {
    title: 'Contract Review — Risk Analysis Output',
    templateKey: 'contract-review',
    taskType: AITaskType.CONTRACT_REVIEW,
    summary: 'Identified 3 material risks: uncapped indemnity, missing governing-law clause, weak termination rights.',
    content: { riskLevel: 'MEDIUM', findings: ['Uncapped indemnity (clause 8)', 'No governing-law clause', 'Termination notice too short'], source: 'AI_GENERATED' },
    review: AIReviewStatus.APPROVED,
  },
  {
    title: 'Matter Summary',
    templateKey: 'matter-summary',
    taskType: AITaskType.SUMMARIZATION,
    summary: 'Matter is in the discovery phase; next hearing scheduled; outstanding disbursements noted.',
    content: { phase: 'DISCOVERY', nextSteps: ['File witness statements', 'Settle disbursements'], source: 'AI_GENERATED' },
    review: AIReviewStatus.PENDING,
  },
];

const RECOMMENDATIONS: RecommendationSeed[] = [
  { title: 'Negotiate an indemnity cap', category: 'CONTRACT_RISK', taskType: AITaskType.CONTRACT_REVIEW, summary: 'The indemnity in clause 8 is uncapped; recommend a liability cap.', confidence: 0.87, linkArtifactKey: 'contract-review' },
  { title: 'Diary the limitation deadline', category: 'DEADLINE', taskType: AITaskType.MATTER_RISK, summary: 'Limitation period approaching; add a calendar reminder.', confidence: 0.92, linkArtifactKey: null },
];

async function resolveUsers(prisma: SeedPrisma, tenantId: string): Promise<{ requesterId: string; reviewerId: string }> {
  const admin =
    (await prisma.user.findFirst({ where: { tenantId, tenantRole: TenantRole.FIRM_ADMIN }, select: { id: true } })) ??
    (await prisma.user.findFirst({ where: { tenantId, status: 'ACTIVE' }, select: { id: true } }));
  if (!admin) {
    throw new Error(`seedAi: no user for tenant ${tenantId}. Run 02_users first.`);
  }
  const advocate = await prisma.user.findFirst({ where: { tenantId, tenantRole: TenantRole.ADVOCATE }, select: { id: true } });
  return { requesterId: advocate?.id ?? admin.id, reviewerId: admin.id };
}

export async function seedAi(prisma: PrismaClient, tenantId: string): Promise<AiSeedResult> {
  if (!tenantId || tenantId.trim().length === 0) {
    throw new Error('seedAi requires a tenantId.');
  }

  const { requesterId, reviewerId } = await resolveUsers(prisma, tenantId);
  const matter = await prisma.matter.findFirst({ where: { tenantId }, select: { id: true } });
  const matterId = matter?.id ?? null;
  const now = new Date();

  // 1. Provider configs — ANTHROPIC + OPENAI, enabled, governance flags on, masked keys.
  for (const p of PROVIDERS) {
    await prisma.aIProviderConfig.upsert({
      where: { tenantId_provider: { tenantId, provider: p.provider } },
      update: {
        isEnabled: true,
        defaultModel: p.defaultModel,
        apiKeyRef: p.apiKeyRef,
        humanReviewRequired: true,
        redactionRequired: true,
      },
      create: {
        tenantId,
        provider: p.provider,
        isEnabled: true,
        defaultModel: p.defaultModel,
        endpointUrl: null,
        apiKeyRef: p.apiKeyRef,
        humanReviewRequired: true,
        redactionRequired: true,
        usageCapDaily: 500,
        usageCapMonthly: 10000,
        metadata: { models: p.models, promptInjectionProtection: true, simulated: true },
      },
    });
  }

  // 2. Prompt audits (one per template/use-case) + 3. usage logs.
  const auditIdByKey = new Map<string, string>();
  for (const prompt of PROMPTS) {
    let auditId: string;
    const existing = await prisma.aIPromptAudit.findFirst({ where: { tenantId, promptTemplateKey: prompt.key }, select: { id: true } });
    if (existing) {
      auditId = existing.id;
    } else {
      const created = await prisma.aIPromptAudit.create({
        data: {
          tenantId,
          provider: prompt.provider,
          taskType: prompt.taskType,
          executionStatus: AIExecutionStatus.SUCCEEDED,
          sensitivity: AIDataSensitivity.CONFIDENTIAL,
          promptTemplateKey: prompt.key,
          systemPrompt: prompt.system,
          userPrompt: prompt.user,
          redactedInput: { redacted: true },
          outputPreview: { preview: `${prompt.name} output (seed).` },
          requesterUserId: requesterId,
          entityType: matterId ? 'Matter' : null,
          entityId: matterId,
          metadata: { promptVersion: PROMPT_VERSION, promptInjectionProtection: true, simulated: true },
        },
        select: { id: true },
      });
      auditId = created.id;
    }
    auditIdByKey.set(prompt.key, auditId);

    const existingLog = await prisma.aIUsageLog.findFirst({ where: { tenantId, promptAuditId: auditId }, select: { id: true } });
    if (!existingLog) {
      await prisma.aIUsageLog.create({
        data: {
          tenantId,
          provider: prompt.provider,
          taskType: prompt.taskType,
          status: AIExecutionStatus.SUCCEEDED,
          sensitivity: AIDataSensitivity.CONFIDENTIAL,
          requesterUserId: requesterId,
          reviewerUserId: reviewerId,
          entityType: matterId ? 'Matter' : null,
          entityId: matterId,
          promptAuditId: auditId,
          providerRequestId: `req-${tenantId.slice(-6)}-${prompt.key}`,
          modelName: PROVIDERS.find((x) => x.provider === prompt.provider)?.defaultModel ?? null,
          inputTokens: 1200,
          outputTokens: 800,
          totalTokens: 2000,
          estimatedCost: 0.0125,
          latencyMs: 3200,
          redactionApplied: true,
          startedAt: now,
          completedAt: now,
        },
      });
    }
  }

  // 4. Artifacts (+ 6. review tasks) — AI-generated, human-review gated (ADR-011).
  const artifactIdByKey = new Map<string, string>();
  let reviewTasks = 0;
  for (const art of ARTIFACTS) {
    const promptAuditId = auditIdByKey.get(art.templateKey) ?? null;
    const approved = art.review === AIReviewStatus.APPROVED;

    let artifactId: string;
    const existing = await prisma.aIArtifact.findFirst({ where: { tenantId, title: art.title }, select: { id: true } });
    if (existing) {
      artifactId = existing.id;
    } else {
      const created = await prisma.aIArtifact.create({
        data: {
          tenantId,
          taskType: art.taskType,
          status: approved ? AIArtifactStatus.APPROVED : AIArtifactStatus.REVIEW_REQUIRED,
          sensitivity: AIDataSensitivity.CONFIDENTIAL,
          entityType: matterId ? 'Matter' : null,
          entityId: matterId,
          title: art.title,
          content: art.content,
          summary: art.summary,
          promptAuditId,
          requiresHumanReview: true,
          reviewedByUserId: approved ? reviewerId : null,
          reviewedAt: approved ? now : null,
          metadata: { source: 'AI_GENERATED', promptVersion: PROMPT_VERSION },
        },
        select: { id: true },
      });
      artifactId = created.id;
    }
    artifactIdByKey.set(art.templateKey, artifactId);

    const existingReview = await prisma.aIReviewTask.findFirst({ where: { tenantId, artifactId }, select: { id: true } });
    if (!existingReview) {
      await prisma.aIReviewTask.create({
        data: {
          tenantId,
          artifactId,
          taskType: art.taskType,
          status: art.review,
          entityType: matterId ? 'Matter' : null,
          entityId: matterId,
          assignedReviewerId: reviewerId,
          reason: 'Mandatory human review of AI-generated artifact (ADR-011).',
          decisionReason: approved ? 'Reviewed and approved by supervising advocate.' : null,
          resolvedAt: approved ? now : null,
        },
      });
    }
    reviewTasks += 1;
  }

  // 5. Recommendations.
  for (const rec of RECOMMENDATIONS) {
    const existing = await prisma.aIRecommendation.findFirst({ where: { tenantId, title: rec.title }, select: { id: true } });
    if (!existing) {
      await prisma.aIRecommendation.create({
        data: {
          tenantId,
          taskType: rec.taskType,
          status: AIRecommendationStatus.OPEN,
          sensitivity: AIDataSensitivity.CONFIDENTIAL,
          entityType: matterId ? 'Matter' : null,
          entityId: matterId,
          category: rec.category,
          title: rec.title,
          summary: rec.summary,
          recommendation: { action: rec.summary, source: 'AI_GENERATED' },
          confidence: rec.confidence,
          requiresHumanReview: true,
          artifactId: rec.linkArtifactKey ? artifactIdByKey.get(rec.linkArtifactKey) ?? null : null,
        },
      });
    }
  }

  // Final counts via queries (idempotent-safe).
  const auditKeys = PROMPTS.map((p) => p.key);
  const artifactTitles = ARTIFACTS.map((a) => a.title);
  const recTitles = RECOMMENDATIONS.map((r) => r.title);
  const auditIds = [...auditIdByKey.values()];
  const artifactIds = [...artifactIdByKey.values()];
  const [
    aiProviderConfigs,
    aiPromptAudits,
    aiUsageLogs,
    aiArtifacts,
    aiReviewTasks,
    aiRecommendations,
  ] = await Promise.all([
    prisma.aIProviderConfig.count({ where: { tenantId, provider: { in: PROVIDERS.map((p) => p.provider) } } }),
    prisma.aIPromptAudit.count({ where: { tenantId, promptTemplateKey: { in: auditKeys } } }),
    prisma.aIUsageLog.count({ where: { tenantId, promptAuditId: { in: auditIds } } }),
    prisma.aIArtifact.count({ where: { tenantId, title: { in: artifactTitles } } }),
    prisma.aIReviewTask.count({ where: { tenantId, artifactId: { in: artifactIds } } }),
    prisma.aIRecommendation.count({ where: { tenantId, title: { in: recTitles } } }),
  ]);

  return {
    status: 'ai_seed_complete',
    tenantId,
    aiProviderConfigs,
    aiPromptAudits,
    aiUsageLogs,
    aiArtifacts,
    aiReviewTasks,
    aiRecommendations,
  };
}
