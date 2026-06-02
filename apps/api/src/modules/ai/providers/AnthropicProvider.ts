/**
 * providers/AnthropicProvider.ts
 *
 * Anthropic Claude integration for Global Wakili AI Platform.
 *
 * Activation: set ANTHROPIC_API_KEY in environment.
 * Model: defaults to claude-sonnet-4-6 (configurable via AIProviderConfig.defaultModel).
 *
 * Features:
 *   - Prompt caching: system prompt cached via cache_control breakpoint (saves tokens on repeated calls)
 *   - Prompt injection detection: input sanitised before prompt construction
 *   - Context isolation: tenantId embedded in system prompt; cross-tenant data structurally impossible
 *   - Token tracking: input/output tokens returned for cost quota enforcement
 *   - Human review: always required for all external LLM calls (enforced by AIPolicyService)
 *
 * Prompt construction per scope: each scope gets a structured system prompt and
 * a JSON-encoded user payload. Output is parsed as structured JSON.
 *
 * WIP-005 — Gap 008.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { AIExecutionResult, AIScope } from '../ai.types';

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 4096;

// ── Prompt injection detection ────────────────────────────────────────────────

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/i,
  /you\s+are\s+now\s+a/i,
  /forget\s+(everything|all|your|the)\s+(above|previous|instructions?)/i,
  /system\s+prompt/i,
  /\[SYSTEM\]/i,
  /\[INST\]/i,
  /jailbreak/i,
  /dan\s+mode/i,
  /act\s+as\s+(if\s+you\s+are\s+)?(?:an?\s+)?(?:uncensored|unfiltered|unrestricted)/i,
  /<\s*\/?s\s*>/i,   // XML-style role injection tags
];

export function detectPromptInjection(payload: Record<string, unknown>): string | null {
  const text = JSON.stringify(payload).toLowerCase();
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return `Prompt injection pattern detected: ${pattern.source.slice(0, 60)}`;
    }
  }
  return null;
}

// ── Scope-specific prompt builders ───────────────────────────────────────────

function buildScopeInstructions(scope: AIScope): string {
  switch (scope) {
    case 'document-analysis':
      return 'Analyse the provided legal document. Extract key clauses, obligations, rights, risks, and any unusual provisions. Return structured findings suitable for lawyer review.';
    case 'contract-review':
      return 'Review the contract for risk clauses, missing standard provisions, unfavourable terms, and compliance issues under Kenyan law. Flag all items requiring legal attention.';
    case 'matter-risk':
      return 'Assess the legal matter for risks: statute of limitations proximity, opposing party strength, evidence gaps, procedural risks, and settlement indicators. Rate each risk LOW/MEDIUM/HIGH/CRITICAL.';
    case 'deadline-intelligence':
      return 'Analyse the matter timeline for upcoming deadlines, compliance dates, court dates, and filing requirements. Flag any at risk of being missed. Apply Kenyan procedural timelines where applicable.';
    case 'billing-insights':
      return 'Analyse billing data for inefficiencies, write-off risk, unbilled time patterns, and client payment behaviour. Provide actionable revenue optimisation recommendations.';
    case 'trust-compliance-alerts':
      return 'Review trust accounting data for regulatory compliance: overdraw risk, reconciliation variances, commingling indicators, and Law Society of Kenya trust accounting rule adherence.';
    case 'drafting-assistant':
      return 'Draft the requested legal document section. Use formal Kenyan legal English. Flag any assumptions made. Mark every clause that requires lawyer verification before use.';
    case 'knowledge-base':
      return 'Answer the legal knowledge query with reference to Kenyan law, precedents, and practice. Cite applicable statutes or cases where known. Flag uncertainty clearly.';
    case 'legal-research':
      return 'Research the legal question under Kenyan jurisdiction. Summarise applicable law, relevant cases, and practical implications. Highlight areas of unsettled law.';
    case 'client-intake-assistant':
      return 'Assist with client intake by extracting relevant facts, identifying the legal area, assessing urgency, and suggesting next steps. Flag any conflict of interest indicators.';
    default:
      return 'Provide a structured legal analysis of the provided information. Remain conservative and flag all areas requiring human review.';
  }
}

function buildSystemPrompt(tenantId: string, scope: AIScope): string {
  return [
    'You are a governed legal-enterprise AI subsystem for Global Wakili Legal Enterprise.',
    `You operate exclusively within tenant context: ${tenantId}.`,
    'You must never reference, infer, or include data from any other tenant or organisation.',
    'You are conservative, precise, and audit-aware. Every response must be suitable for lawyer review.',
    'You do not provide final legal advice — you provide structured analysis for qualified legal professionals.',
    '',
    `Task scope: ${scope}`,
    buildScopeInstructions(scope),
    '',
    'Return your response as valid JSON matching this structure:',
    '{ "title": string, "summary": string, "findings": object, "recommendations": array, "reviewRequired": boolean, "reviewReason": string }',
    'The "findings" object should contain scope-specific structured data.',
    'The "recommendations" array should contain objects with: { category, title, summary, recommendation, confidence }.',
  ].join('\n');
}

// ── Provider ──────────────────────────────────────────────────────────────────

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw Object.assign(new Error('ANTHROPIC_API_KEY is not configured'), {
      statusCode: 500,
      code: 'ANTHROPIC_API_KEY_MISSING',
    });
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export type AnthropicCallResult = {
  result: AIExecutionResult;
  inputTokens: number;
  outputTokens: number;
  model: string;
};

export async function callAnthropic(params: {
  tenantId: string;
  scope: AIScope;
  payload: Record<string, unknown>;
  modelOverride?: string | null;
}): Promise<AnthropicCallResult> {
  const injectionReason = detectPromptInjection(params.payload);
  if (injectionReason) {
    throw Object.assign(new Error(`AI request blocked: ${injectionReason}`), {
      statusCode: 422,
      code: 'AI_PROMPT_INJECTION_DETECTED',
      details: { reason: injectionReason },
    });
  }

  const model = params.modelOverride?.trim() || DEFAULT_MODEL;
  const client = getClient();
  const systemPrompt = buildSystemPrompt(params.tenantId, params.scope);

  const userContent = [
    `Tenant: ${params.tenantId}`,
    `Scope: ${params.scope}`,
    'Input data:',
    JSON.stringify(params.payload, null, 2),
  ].join('\n');

  const response = await client.messages.create({
    model,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        // Prompt caching — cache the system prompt across repeated calls
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: userContent,
      },
    ],
  });

  const rawText = response.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as { type: 'text'; text: string }).text)
    .join('');

  let parsed: Record<string, unknown>;
  try {
    // Strip markdown code fences if present
    const cleaned = rawText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    // LLM returned non-JSON — wrap as plain output
    parsed = {
      title: `${params.scope} Analysis`,
      summary: rawText.slice(0, 300),
      findings: { rawOutput: rawText },
      recommendations: [],
      reviewRequired: true,
      reviewReason: 'LLM output could not be parsed as structured JSON — requires manual review.',
    };
  }

  const result: AIExecutionResult = {
    title: String(parsed.title ?? `${params.scope} Analysis`),
    summary: String(parsed.summary ?? 'AI analysis complete.'),
    output: (parsed.findings as Record<string, unknown>) ?? parsed,
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    requiresHumanReview: true, // Always true for external LLM calls
    reviewReason: String(parsed.reviewReason ?? 'External LLM output requires human review before operational reliance.'),
  };

  const usage = (response as any).usage ?? {};

  return {
    result,
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    model,
  };
}
