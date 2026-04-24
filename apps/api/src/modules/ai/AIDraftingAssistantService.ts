// apps/api/src/modules/ai/AIDraftingAssistantService.ts

import type { AIExecutionResult } from './ai.types';

export class AIDraftingAssistantService {
  static draft(payload: Record<string, unknown>): AIExecutionResult {
    const documentType = String(payload.documentType ?? 'DOCUMENT').trim();
    const title = String(payload.title ?? `${documentType} Draft`).trim();
    const goal = String(payload.goal ?? '').trim();
    const audience = payload.audience ? String(payload.audience) : null;
    const tone = payload.tone ? String(payload.tone) : null;
    const facts = Array.isArray(payload.facts)
      ? payload.facts.map((item) => String(item))
      : [];
    const requestedSections = Array.isArray(payload.requestedSections)
      ? payload.requestedSections.map((item) => String(item))
      : ['Background', 'Issues', 'Analysis', 'Conclusion'];

    return {
      title,
      summary: `Prepared structured drafting guidance for ${documentType}.`,
      output: {
        documentType,
        goal,
        audience,
        tone,
        facts,
        outline: requestedSections.map((section, index) => ({
          order: index + 1,
          section,
          draftingNote: `Draft ${section} with conservative, reviewable legal language aligned to the stated goal.`,
        })),
      },
      recommendations: [
        {
          category: 'drafting-assistant',
          title: 'Review draft outline before issuing',
          summary: 'Use the outline as assistant-generated drafting guidance, not final legal text.',
          recommendation: {
            humanLegalReviewRequired: true,
            verifyFactsAgainstFile: true,
            verifyJurisdictionalFit: true,
          },
          confidence: 0.76,
        },
      ],
      requiresHumanReview: true,
      reviewReason: 'Drafting outputs must always remain assistant-generated and lawyer-reviewed.',
    };
  }
}

export default AIDraftingAssistantService;