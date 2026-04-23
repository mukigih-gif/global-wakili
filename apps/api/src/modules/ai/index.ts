// apps/api/src/modules/ai/index.ts

export * from './ai.types';
export * from './ai.validators';

export * from './AIPermissionMap';
export * from './AIAuditService';
export * from './AICapabilityService';
export * from './AIProviderRegistry';
export * from './AIPolicyService';
export * from './AIPromptAuditService';
export * from './AIUsageLogService';
export * from './AIOrchestratorService';
export * from './AIDocumentIntelligenceService';
export * from './AIMatterRiskService';
export * from './AIDeadlineIntelligenceService';
export * from './AIBillingInsightService';
export * from './AITrustComplianceAlertService';
export * from './AIDraftingAssistantService';
export * from './AIKnowledgeBaseService';

export * from './ai.controller';

export { default as aiRoutes } from './ai.routes';