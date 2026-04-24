// apps/api/src/modules/ai/AIPermissionMap.ts

export const AI_PERMISSION_KEYS = {
  viewHub: 'ai.view_hub',
  viewUsage: 'ai.view_usage',
  manageProviders: 'ai.manage_providers',
  reviewOutputs: 'ai.review_outputs',
  executeLegalResearch: 'ai.execute_legal_research',
  executeDocumentAnalysis: 'ai.execute_document_analysis',
  executeContractReview: 'ai.execute_contract_review',
  executeMatterRisk: 'ai.execute_matter_risk',
  executeDeadlineIntelligence: 'ai.execute_deadline_intelligence',
  executeBillingInsights: 'ai.execute_billing_insights',
  executeTrustComplianceAlerts: 'ai.execute_trust_compliance_alerts',
  executeClientIntakeAssistant: 'ai.execute_client_intake_assistant',
  executeDraftingAssistant: 'ai.execute_drafting_assistant',
  executeKnowledgeBase: 'ai.execute_knowledge_base',
} as const;

export type AIPermissionKey =
  (typeof AI_PERMISSION_KEYS)[keyof typeof AI_PERMISSION_KEYS];