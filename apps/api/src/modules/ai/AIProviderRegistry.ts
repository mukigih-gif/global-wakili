// apps/api/src/modules/ai/AIProviderRegistry.ts

import type { AIDbClient, AIProvider, AIProviderConfigInput, AIScope } from './ai.types';

type ProviderDescriptor = {
  provider: AIProvider;
  label: string;
  executionMode: 'external' | 'internal';
  executionSupported: boolean;
  notes: string[];
};

function normalizeScopeArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item).trim())
    .filter(Boolean);
}

export class AIProviderRegistry {
  static getProviderCatalog(): ProviderDescriptor[] {
    return [
      {
        provider: 'OPENAI',
        label: 'OpenAI',
        executionMode: 'external',
        executionSupported: false,
        notes: [
          'Governed provider abstraction reserved.',
          'Execution remains fail-closed until explicit provider integration is completed.',
        ],
      },
      {
        provider: 'AZURE_OPENAI',
        label: 'Azure OpenAI',
        executionMode: 'external',
        executionSupported: false,
        notes: [
          'Governed enterprise provider abstraction reserved.',
          'Execution remains fail-closed until explicit provider integration is completed.',
        ],
      },
      {
        provider: 'ANTHROPIC',
        label: 'Anthropic',
        executionMode: 'external',
        executionSupported: false,
        notes: [
          'Governed provider abstraction reserved.',
          'Execution remains fail-closed until explicit provider integration is completed.',
        ],
      },
      {
        provider: 'GOOGLE_GEMINI',
        label: 'Google Gemini',
        executionMode: 'external',
        executionSupported: false,
        notes: [
          'Governed provider abstraction reserved.',
          'Execution remains fail-closed until explicit provider integration is completed.',
        ],
      },
      {
        provider: 'AWS_BEDROCK',
        label: 'AWS Bedrock',
        executionMode: 'external',
        executionSupported: false,
        notes: [
          'Governed provider abstraction reserved.',
          'Execution remains fail-closed until explicit provider integration is completed.',
        ],
      },
      {
        provider: 'INTERNAL_RULES',
        label: 'Internal Rules Engine',
        executionMode: 'internal',
        executionSupported: true,
        notes: [
          'Safe governed internal execution path.',
          'Designed for deterministic heuristics, review-first recommendations, and no external data transfer.',
        ],
      },
      {
        provider: 'OCR_ONLY',
        label: 'OCR Only',
        executionMode: 'internal',
        executionSupported: true,
        notes: [
          'Reserved for future OCR-governed extraction bridge.',
          'Should be combined with document intelligence policy controls.',
        ],
      },
    ];
  }

  static async listTenantProviderConfigs(db: AIDbClient, tenantId: string) {
    return db.aiProviderConfig.findMany({
      where: { tenantId },
      orderBy: [{ provider: 'asc' }],
    });
  }

  static async upsertProviderConfig(db: AIDbClient, input: AIProviderConfigInput) {
    const existing = await db.aiProviderConfig.findFirst({
      where: {
        tenantId: input.tenantId,
        provider: input.provider,
      },
    });

    const payload = {
      tenantId: input.tenantId,
      provider: input.provider,
      isEnabled: input.isEnabled,
      defaultModel: input.defaultModel?.trim() || null,
      endpointUrl: input.endpointUrl?.trim() || null,
      apiKeyRef: input.apiKeyRef?.trim() || null,
      humanReviewRequired: input.humanReviewRequired ?? true,
      redactionRequired: input.redactionRequired ?? true,
      usageCapDaily: input.usageCapDaily ?? null,
      usageCapMonthly: input.usageCapMonthly ?? null,
      allowedScopes: input.allowedScopes ?? [],
      blockedScopes: input.blockedScopes ?? [],
      metadata: input.metadata ?? {},
    };

    if (existing) {
      return db.aiProviderConfig.update({
        where: { id: existing.id },
        data: payload,
      });
    }

    return db.aiProviderConfig.create({
      data: payload,
    });
  }

  static async resolveProviderForScope(
    db: AIDbClient,
    params: {
      tenantId: string;
      scope: AIScope;
      preferredProvider?: AIProvider | null;
    },
  ) {
    const catalog = this.getProviderCatalog();
    const configs = await this.listTenantProviderConfigs(db, params.tenantId);

    const orderedConfigs = params.preferredProvider
      ? [
          ...configs.filter((item: any) => item.provider === params.preferredProvider),
          ...configs.filter((item: any) => item.provider !== params.preferredProvider),
        ]
      : configs;

    for (const config of orderedConfigs) {
      if (!config.isEnabled) continue;

      const allowedScopes = normalizeScopeArray(config.allowedScopes);
      const blockedScopes = normalizeScopeArray(config.blockedScopes);

      if (blockedScopes.includes(params.scope)) continue;
      if (allowedScopes.length > 0 && !allowedScopes.includes(params.scope)) continue;

      const providerMeta = catalog.find((item) => item.provider === config.provider);
      if (!providerMeta) continue;

      return {
        config,
        providerMeta,
      };
    }

    return null;
  }
}

export default AIProviderRegistry;