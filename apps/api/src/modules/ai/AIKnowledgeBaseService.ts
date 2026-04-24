// apps/api/src/modules/ai/AIKnowledgeBaseService.ts

import type { AIExecutionResult } from './ai.types';

type SourceItem = {
  title: string;
  content: string;
  reference?: string | null;
};

function normalizeSources(payload: Record<string, unknown>): SourceItem[] {
  if (!Array.isArray(payload.sources)) return [];

  return payload.sources.map((item) => ({
    title: String((item as any).title ?? 'Untitled Source'),
    content: String((item as any).content ?? ''),
    reference: (item as any).reference ? String((item as any).reference) : null,
  }));
}

export class AIKnowledgeBaseService {
  static query(payload: Record<string, unknown>): AIExecutionResult {
    const query = String(payload.query ?? '').trim();
    const sources = normalizeSources(payload);
    const matched = sources.filter(
      (item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.content.toLowerCase().includes(query.toLowerCase()),
    );

    return {
      title: 'Knowledge Base Answer',
      summary: `Answered query against ${sources.length} source(s), with ${matched.length} directly matched source(s).`,
      output: {
        query,
        sourceCount: sources.length,
        matchedSources: matched.slice(0, 10),
        answer:
          matched.length > 0
            ? 'Relevant supporting material was found in the provided sources.'
            : 'No direct match was found in the provided sources; human review of source material is recommended.',
      },
      recommendations: [
        {
          category: 'knowledge-base',
          title: 'Verify cited source support',
          summary: 'Knowledge answers should be confirmed against the cited source material before reliance.',
          recommendation: {
            verifyAgainstSources: true,
            citeMatchedSourcesOnly: true,
          },
          confidence: matched.length > 0 ? 0.72 : 0.45,
        },
      ],
      requiresHumanReview: true,
      reviewReason: 'Knowledge support outputs should be checked against source materials before legal reliance.',
    };
  }

  static research(payload: Record<string, unknown>): AIExecutionResult {
    const base = this.query(payload);

    return {
      ...base,
      title: 'Legal Research Assist',
      summary: `Research assist prepared from ${base.output.sourceCount as number} supplied source(s).`,
      output: {
        ...base.output,
        researchMode: true,
      },
    };
  }

  static clientIntakeAssist(payload: Record<string, unknown>): AIExecutionResult {
    const clientName = payload.clientName ? String(payload.clientName) : 'Client';
    const clientType = payload.clientType ? String(payload.clientType) : 'UNKNOWN';
    const notes = String(payload.notes ?? '').trim();
    const questions = Array.isArray(payload.questions)
      ? payload.questions.map((item) => String(item))
      : [];

    return {
      title: `${clientName} Intake Assistant`,
      summary: 'Structured client intake preparation generated for human review.',
      output: {
        clientName,
        clientType,
        notesPreview: notes.slice(0, 1000),
        questions,
        suggestedNextSteps: [
          'Confirm identity and KYC baseline.',
          'Confirm matter type and urgency.',
          'Check conflict screening requirements.',
          'Determine whether enhanced due diligence is required.',
        ],
      },
      recommendations: [
        {
          category: 'client-intake-assistant',
          title: 'Validate intake completeness',
          summary: 'Intake assistance should be reviewed before client onboarding or matter opening.',
          recommendation: {
            runConflictCheck: true,
            confirmKYCRequirements: true,
            confirmUrgency: true,
          },
          confidence: 0.77,
        },
      ],
      requiresHumanReview: true,
      reviewReason: 'Client intake assistance must remain human-reviewed before operational use.',
    };
  }
}

export default AIKnowledgeBaseService;