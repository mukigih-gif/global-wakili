// apps/api/src/modules/ai/ai.routes.ts

import { Router, type Request, type Response } from 'express';
import { PERMISSIONS } from '../../config/permissions';
import { requirePermissions } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import {
  aiArtifactSearchQuerySchema,
  aiBillingInsightSchema,
  aiClientIntakeAssistantSchema,
  aiContractReviewSchema,
  aiDeadlineIntelligenceSchema,
  aiDocumentAnalysisSchema,
  aiKnowledgeBaseQuerySchema,
  aiLegalResearchSchema,
  aiMatterRiskSchema,
  aiProviderConfigUpsertSchema,
  aiTrustComplianceAlertSchema,
  aiUsageSearchQuerySchema,
  aiDraftingAssistantSchema,
} from './ai.validators';
import {
  executeBillingInsights,
  executeClientIntakeAssistant,
  executeContractReview,
  executeDeadlineIntelligence,
  executeDocumentAnalysis,
  executeDraftingAssistant,
  executeKnowledgeBase,
  executeLegalResearch,
  executeMatterRisk,
  executeTrustComplianceAlerts,
  getAICapabilities,
  getAIHealth,
  getAIHub,
  getAIProviderConfigs,
  getAIProviders,
  getAIScopeHealth,
  searchAIArtifacts,
  searchAIUsageLogs,
  upsertAIProviderConfig,
} from './ai.controller';

import { bindPlatformModuleEnforcement } from '../../middleware/platform/module-enforcement';
import { platformFeatureFlag } from '../../middleware/platform-feature-flag.middleware';
import { PLATFORM_FEATURE_KEYS } from '../platform/PlatformFeatureKeys';
const router = Router();

bindPlatformModuleEnforcement(router, {
  moduleKey: 'ai',
  metricType: 'API_REQUESTS',
});

const aiTenantWorkflowsFeature = platformFeatureFlag(
  PLATFORM_FEATURE_KEYS.AI_TENANT_WORKFLOWS,
  'ai',
);

router.get('/health', getAIHealth);

router.get(
  '/',
  aiTenantWorkflowsFeature,
  requirePermissions(PERMISSIONS.ai.viewHub),
  getAIHub,
);

router.get(
  '/capabilities',
  requirePermissions(PERMISSIONS.ai.viewHub),
  getAICapabilities,
);

router.get(
  '/providers',
  requirePermissions(PERMISSIONS.ai.viewHub),
  getAIProviders,
);

router.get(
  '/providers/configs',
  requirePermissions(PERMISSIONS.ai.manageProviders),
  getAIProviderConfigs,
);

router.post(
  '/providers/configs',
  requirePermissions(PERMISSIONS.ai.manageProviders),
  validate({ body: aiProviderConfigUpsertSchema }),
  upsertAIProviderConfig,
);

router.get(
  '/artifacts/search',
  aiTenantWorkflowsFeature,
  requirePermissions(PERMISSIONS.ai.viewUsage),
  validate({ query: aiArtifactSearchQuerySchema }),
  searchAIArtifacts,
);

router.get(
  '/usage/search',
  requirePermissions(PERMISSIONS.ai.viewUsage),
  validate({ query: aiUsageSearchQuerySchema }),
  searchAIUsageLogs,
);

router.post(
  '/document-analysis',
  requirePermissions(PERMISSIONS.ai.executeDocumentAnalysis),
  validate({ body: aiDocumentAnalysisSchema }),
  executeDocumentAnalysis,
);

router.post(
  '/contract-review',
  aiTenantWorkflowsFeature,
  requirePermissions(PERMISSIONS.ai.executeContractReview),
  validate({ body: aiContractReviewSchema }),
  executeContractReview,
);

router.post(
  '/matter-risk',
  requirePermissions(PERMISSIONS.ai.executeMatterRisk),
  validate({ body: aiMatterRiskSchema }),
  executeMatterRisk,
);

router.post(
  '/deadline-intelligence',
  requirePermissions(PERMISSIONS.ai.executeDeadlineIntelligence),
  validate({ body: aiDeadlineIntelligenceSchema }),
  executeDeadlineIntelligence,
);

router.post(
  '/billing-insights',
  requirePermissions(PERMISSIONS.ai.executeBillingInsights),
  validate({ body: aiBillingInsightSchema }),
  executeBillingInsights,
);

router.post(
  '/trust-compliance-alerts',
  requirePermissions(PERMISSIONS.ai.executeTrustComplianceAlerts),
  validate({ body: aiTrustComplianceAlertSchema }),
  executeTrustComplianceAlerts,
);

router.post(
  '/client-intake-assistant',
  aiTenantWorkflowsFeature,
  requirePermissions(PERMISSIONS.ai.executeClientIntakeAssistant),
  validate({ body: aiClientIntakeAssistantSchema }),
  executeClientIntakeAssistant,
);

router.post(
  '/drafting-assistant',
  aiTenantWorkflowsFeature,
  requirePermissions(PERMISSIONS.ai.executeDraftingAssistant),
  validate({ body: aiDraftingAssistantSchema }),
  executeDraftingAssistant,
);

router.post(
  '/knowledge-base',
  requirePermissions(PERMISSIONS.ai.executeKnowledgeBase),
  validate({ body: aiKnowledgeBaseQuerySchema }),
  executeKnowledgeBase,
);

router.post(
  '/legal-research',
  requirePermissions(PERMISSIONS.ai.executeLegalResearch),
  validate({ body: aiLegalResearchSchema }),
  executeLegalResearch,
);

router.get(
  '/:scope/health',
  requirePermissions(PERMISSIONS.ai.viewHub),
  getAIScopeHealth,
);

router.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    module: 'ai',
    error: 'AI route not found',
    code: 'AI_ROUTE_NOT_FOUND',
    path: req.originalUrl,
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

export default router;