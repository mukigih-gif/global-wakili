// apps/api/src/modules/ai/AIPolicyService.ts

import type {
  AIDataSensitivity,
  AIExecutionInput,
  AIProvider,
  AIScope,
  AITaskType,
} from './ai.types';

const SENSITIVE_KEY_PATTERN =
  /email|phone|mobile|national.?id|passport|kra|pin|tax|bank|account|swift|iban|address|secret|token|password/i;

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce(
      (acc, [key, val]) => {
        acc[key] = SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : redactValue(val);
        return acc;
      },
      {} as Record<string, unknown>,
    );
  }

  if (typeof value === 'string' && value.length > 4000) {
    return `${value.slice(0, 4000)}...[TRUNCATED]`;
  }

  return value;
}

export class AIPolicyService {
  static taskTypeForScope(scope: AIScope): AITaskType {
    switch (scope) {
      case 'document-analysis':
        return 'DOCUMENT_ANALYSIS';
      case 'contract-review':
        return 'CONTRACT_REVIEW';
      case 'matter-risk':
        return 'MATTER_RISK';
      case 'deadline-intelligence':
        return 'DEADLINE_INTELLIGENCE';
      case 'billing-insights':
        return 'BILLING_INSIGHT';
      case 'trust-compliance-alerts':
        return 'TRUST_COMPLIANCE_ALERT';
      case 'client-intake-assistant':
        return 'CLIENT_INTAKE_ASSISTANT';
      case 'drafting-assistant':
        return 'DRAFTING_ASSISTANT';
      case 'knowledge-base':
        return 'KNOWLEDGE_BASE';
      case 'legal-research':
        return 'LEGAL_RESEARCH';
      default:
        return 'RECOMMENDATION';
    }
  }

  static sensitivityForScope(scope: AIScope): AIDataSensitivity {
    if (scope === 'knowledge-base' || scope === 'legal-research') return 'INTERNAL';
    if (scope === 'drafting-assistant') return 'CONFIDENTIAL';
    if (scope === 'trust-compliance-alerts' || scope === 'matter-risk') {
      return 'HIGHLY_RESTRICTED';
    }
    if (scope === 'client-intake-assistant') return 'PRIVILEGED';
    return 'CONFIDENTIAL';
  }

  static redactPayload(payload: Record<string, unknown>): Record<string, unknown> {
    return redactValue(payload) as Record<string, unknown>;
  }

  static providerSystemPrompt(scope: AIScope): string {
    return [
      'You are a governed legal-enterprise AI subsystem for Global Wakili.',
      'Remain tenant-scoped, conservative, review-aware, and audit-safe.',
      `Current scope: ${scope}.`,
      'Do not claim certainty where the input is incomplete.',
      'Return structured, reviewable, and risk-aware output.',
    ].join(' ');
  }

  static isProviderExecutionSupported(provider: AIProvider): boolean {
    return provider === 'INTERNAL_RULES' || provider === 'OCR_ONLY';
  }

  static requiresHumanReview(params: {
    provider: AIProvider;
    configuredHumanReviewRequired?: boolean | null;
    scope: AIScope;
    sensitivity: AIDataSensitivity;
  }): boolean {
    if (params.configuredHumanReviewRequired === true) return true;
    if (params.sensitivity === 'HIGHLY_RESTRICTED') return true;
    if (params.scope === 'trust-compliance-alerts') return true;
    if (params.scope === 'matter-risk') return true;
    return params.provider !== 'INTERNAL_RULES' ? true : Boolean(params.configuredHumanReviewRequired);
  }

  static validateExecutionGuardrails(input: AIExecutionInput): void {
    if (!input.tenantId?.trim()) {
      throw Object.assign(new Error('Tenant ID is required for AI execution'), {
        statusCode: 400,
        code: 'AI_TENANT_REQUIRED',
      });
    }

    if (!input.requesterUserId?.trim()) {
      throw Object.assign(new Error('Requester user is required for AI execution'), {
        statusCode: 401,
        code: 'AI_REQUESTER_REQUIRED',
      });
    }
  }
}

export default AIPolicyService;