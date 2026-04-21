// apps/api/src/modules/dashboards/dashboard.routes.ts

import { Router, type Request, type Response } from 'express';

const router = Router();

const plannedDashboardScopes = [
  'executive',
  'finance',
  'trust',
  'billing',
  'payments',
  'matter',
  'client',
  'document',
  'calendar',
  'procurement',
  'payroll',
  'compliance',
  'operations',
  'integrations',
  'ai',
] as const;

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'dashboards',
    status: 'mounted',
    service: 'global-wakili-api',
    lifecycle: 'dashboard-hub-mounted-pending-final-aggregation-services',
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'dashboards',
    status: 'available',
    message:
      'Dashboard hub is mounted. This module will aggregate cross-module KPIs and role-based dashboard views across Global Wakili.',
    plannedScopes: plannedDashboardScopes,
    architectureNotes: [
      'Module-level dashboards may continue to exist inside their own modules.',
      'This dashboards module will aggregate executive, operational, compliance, finance, trust, billing, payments, matter, procurement, payroll, document, calendar, integrations, and AI metrics.',
      'Final implementation should avoid duplicating business logic already owned by module services.',
      'Final implementation should expose role-based dashboard views and tenant-scoped metrics only.',
      'Future real-time dashboard updates should integrate with the WebSocket/event layer.',
    ],
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

router.get('/:scope/health', (req: Request, res: Response) => {
  const scope = req.params.scope;

  if (!plannedDashboardScopes.includes(scope as any)) {
    return res.status(404).json({
      success: false,
      module: 'dashboards',
      error: 'Unknown dashboard scope',
      code: 'UNKNOWN_DASHBOARD_SCOPE',
      scope,
      allowedScopes: plannedDashboardScopes,
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(200).json({
    success: true,
    module: 'dashboards',
    scope,
    status: 'scope-reserved',
    message: `The ${scope} dashboard scope is reserved and will be wired during dashboard module finalization.`,
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

router.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    module: 'dashboards',
    error: 'Dashboards route not found',
    code: 'DASHBOARDS_ROUTE_NOT_FOUND',
    path: req.originalUrl,
    plannedScopes: plannedDashboardScopes,
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

export default router;