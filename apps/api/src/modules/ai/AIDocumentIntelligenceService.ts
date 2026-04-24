// apps/api/src/modules/ai/AIDocumentIntelligenceService.ts

import type { AIExecutionResult } from './ai.types';

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function detectDocumentType(fileName?: string | null, text?: string | null): string {
  const haystack = `${fileName ?? ''} ${text ?? ''}`.toLowerCase();

  if (haystack.includes('agreement') || haystack.includes('contract')) return 'CONTRACT';
  if (haystack.includes('invoice')) return 'INVOICE';
  if (haystack.includes('affidavit')) return 'AFFIDAVIT';
  if (haystack.includes('pleading')) return 'PLEADING';
  if (haystack.includes('letter')) return 'LETTER';
  return 'GENERAL_DOCUMENT';
}

function extractRiskFlags(text: string): string[] {
  const flags: string[] = [];
  const lower = text.toLowerCase();

  if (lower.includes('without prejudice')) flags.push('WITHOUT_PREJUDICE_LANGUAGE_DETECTED');
  if (lower.includes('termination')) flags.push('TERMINATION_LANGUAGE_DETECTED');
  if (lower.includes('penalty')) flags.push('PENALTY_LANGUAGE_DETECTED');
  if (lower.includes('indemnity')) flags.push('INDEMNITY_LANGUAGE_DETECTED');
  if (!/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/.test(text) && !/\b\d{4}-\d{2}-\d{2}\b/.test(text)) {
    flags.push('NO_EXPLICIT_DATE_DETECTED');
  }

  return flags;
}

export class AIDocumentIntelligenceService {
  static analyze(payload: Record<string, unknown>): AIExecutionResult {
    const contentText = String(payload.contentText ?? '').trim();
    const title = String(payload.title ?? payload.fileName ?? 'Document Analysis').trim();
    const fileName = payload.fileName ? String(payload.fileName) : null;
    const mimeType = payload.mimeType ? String(payload.mimeType) : null;
    const pageCount = payload.pageCount ? Number(payload.pageCount) : null;
    const tags = Array.isArray(payload.tags) ? payload.tags.map((item) => String(item)) : [];
    const typeGuess = detectDocumentType(fileName, contentText);
    const count = wordCount(contentText);
    const riskFlags = extractRiskFlags(contentText);

    return {
      title,
      summary: `Analyzed ${typeGuess} with ${count} words${pageCount ? ` across ${pageCount} page(s)` : ''}.`,
      output: {
        fileName,
        mimeType,
        pageCount,
        tags,
        documentType: typeGuess,
        wordCount: count,
        summaryPreview: contentText.slice(0, 600),
        riskFlags,
      },
      recommendations: [
        {
          category: 'document-intelligence',
          title: 'Review extracted document signals',
          summary: 'Validate the detected document type, risk flags, and missing metadata before relying on the output operationally.',
          recommendation: {
            verifyDocumentType: true,
            verifyDatesAndParties: true,
            humanReviewRequired: true,
          },
          confidence: 0.74,
        },
      ],
      requiresHumanReview: true,
      reviewReason: 'Document intelligence outputs should be confirmed by a human reviewer before operational reliance.',
    };
  }

  static reviewContract(payload: Record<string, unknown>): AIExecutionResult {
    const base = this.analyze(payload);
    const text = String(payload.contentText ?? '').toLowerCase();

    const contractAlerts = [
      text.includes('indemnity') ? 'INDEMNITY_CLAUSE_PRESENT' : null,
      text.includes('termination') ? 'TERMINATION_CLAUSE_PRESENT' : null,
      text.includes('governing law') ? 'GOVERNING_LAW_PRESENT' : 'GOVERNING_LAW_NOT_DETECTED',
      text.includes('liability') ? 'LIABILITY_LANGUAGE_PRESENT' : null,
    ].filter(Boolean);

    return {
      ...base,
      title: String(payload.title ?? payload.fileName ?? 'Contract Review').trim(),
      summary: `Contract review completed with ${contractAlerts.length} contract-specific alert(s).`,
      output: {
        ...base.output,
        contractAlerts,
      },
      recommendations: [
        ...(base.recommendations ?? []),
        {
          category: 'contract-review',
          title: 'Perform clause validation',
          summary: 'Review indemnity, termination, liability, governing law, and signature coverage before final approval.',
          recommendation: {
            checkIndemnity: true,
            checkTermination: true,
            checkLiability: true,
            checkGoverningLaw: true,
            confirmExecutionBlocks: true,
          },
          confidence: 0.7,
        },
      ],
      requiresHumanReview: true,
      reviewReason: 'Contract review must remain human-reviewed before legal reliance.',
    };
  }
}

export default AIDocumentIntelligenceService;