// apps/api/src/modules/ai/AIDeadlineIntelligenceService.ts

import type { AIExecutionResult } from './ai.types';

export class AIDeadlineIntelligenceService {
  static analyze(payload: Record<string, unknown>): AIExecutionResult {
    const now = Date.now();
    const deadlines = Array.isArray(payload.deadlines)
      ? payload.deadlines.map((item) => ({
          title: String((item as any).title ?? 'Untitled Deadline'),
          date: new Date(String((item as any).date)),
          owner: (item as any).owner ? String((item as any).owner) : null,
          source: (item as any).source ? String((item as any).source) : null,
          severity: (item as any).severity ? String((item as any).severity) : null,
        }))
      : [];

    const overdue = deadlines.filter((item) => item.date.getTime() < now);
    const upcoming7Days = deadlines.filter((item) => {
      const diff = item.date.getTime() - now;
      return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
    });

    return {
      title: 'Deadline Intelligence',
      summary: `Processed ${deadlines.length} deadline(s), with ${overdue.length} overdue and ${upcoming7Days.length} due within 7 days.`,
      output: {
        totalDeadlines: deadlines.length,
        overdueCount: overdue.length,
        upcoming7DaysCount: upcoming7Days.length,
        overdue,
        upcoming7Days,
      },
      recommendations: [
        {
          category: 'deadline-intelligence',
          title: 'Prioritize overdue and near-term deadlines',
          summary: 'Immediate triage is required for overdue deadlines and items due in the next week.',
          recommendation: {
            immediateEscalation: overdue.length > 0,
            notifyOwners: upcoming7Days.length > 0,
          },
          confidence: 0.88,
        },
      ],
      requiresHumanReview: overdue.length > 0,
      reviewReason:
        overdue.length > 0
          ? 'Overdue deadlines should be human-reviewed and escalated immediately.'
          : null,
    };
  }
}

export default AIDeadlineIntelligenceService;