// apps/api/src/modules/ai/ai.routes.ts

import { Router, type Request, type Response } from 'express';

const router = Router();

const plannedAiScopes = [
  'legal-research',
  'document-analysis',
  'contract-review',
  'matter-risk',
  'deadline-intelligence',
  'billing-insights',
  'trust-compliance-alerts',
  'client-intake-assistant',
  'drafting-assistant',
  'knowledge-base',
] as const;

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'ai',
    status: 'mounted',
    service: 'global-wakili-api',
    lifecycle: 'ai-hub-mounted-pending-final-module-generation',
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'ai',
    status: 'available',
    message:
      'AI hub route is mounted. Full legal AI, document intelligence, matter risk, drafting, research, and compliance workflows are pending final module generation.',
    plannedScopes: plannedAiScopes,
    architectureNotes: [
      'AI workflows must remain tenant-scoped and permission-controlled.',
      'Legal AI outputs should be auditable and marked as assistant-generated.',
      'Sensitive client/matter data must not be sent to external providers without policy controls.',
      'Final AI services should integrate with document, matter, calendar, billing, trust, and compliance modules.',
      'Future implementation should support provider abstraction, usage logs, prompt audit, and human review workflows.',
    ],
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

router.get('/:scope/health', (req: Request, res: Response) => {
  const scope = req.params.scope;

  if (!plannedAiScopes.includes(scope as any)) {
    return res.status(404).json({
      success: false,
      module: 'ai',
      error: 'Unknown AI scope',
      code: 'UNKNOWN_AI_SCOPE',
      scope,
      allowedScopes: plannedAiScopes,
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(200).json({
    success: true,
    module: 'ai',
    scope,
    status: 'scope-reserved',
    message: `The ${scope} AI scope is reserved and will be wired during AI module finalization.`,
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

router.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    module: 'ai',
    error: 'AI route not found',
    code: 'AI_ROUTE_NOT_FOUND',
    path: req.originalUrl,
    plannedScopes: plannedAiScopes,
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

export default router;