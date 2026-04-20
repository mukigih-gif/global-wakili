import { existsSync } from 'node:fs';
import path from 'node:path';
import { Router, type Request, type Response } from 'express';

type ModuleStatus = 'ACTIVE' | 'EXPANSION' | 'PENDING';

type ModuleRouteDefinition = {
  key: string;
  mountPath: string;
  relativeRoutePath: string;
  status: ModuleStatus;
  exportNames?: string[];
};

const router = Router();

/**
 * Safe by default:
 * - "safe": only ACTIVE modules are loaded; EXPANSION/PENDING modules use placeholders.
 * - "all": load every route file that exists; useful when doing module-by-module final testing.
 *
 * Set in .env only when ready:
 * API_ROUTE_LOAD_MODE=all
 */
const ROUTE_LOAD_MODE = process.env.API_ROUTE_LOAD_MODE ?? 'safe';

const moduleRoutes: ModuleRouteDefinition[] = [
  {
    key: 'finance',
    mountPath: '/finance',
    relativeRoutePath: '../modules/finance/finance.routes',
    status: 'EXPANSION',
    exportNames: ['financeRoutes'],
  },
  {
    key: 'trust',
    mountPath: '/trust',
    relativeRoutePath: '../modules/trust/trust.routes',
    status: 'EXPANSION',
    exportNames: ['trustRoutes'],
  },
  {
    key: 'billing',
    mountPath: '/billing',
    relativeRoutePath: '../modules/billing/billing.routes',
    status: 'PENDING',
    exportNames: ['billingRoutes'],
  },
  {
    key: 'payments',
    mountPath: '/payments',
    relativeRoutePath: '../modules/payments/payment.routes',
    status: 'PENDING',
    exportNames: ['paymentRoutes', 'paymentsRoutes'],
  },
  {
    key: 'payroll',
    mountPath: '/payroll',
    relativeRoutePath: '../modules/payroll/payroll.routes',
    status: 'PENDING',
    exportNames: ['payrollRoutes'],
  },
  {
    key: 'procurement',
    mountPath: '/procurement',
    relativeRoutePath: '../modules/procurement/procurement.routes',
    status: 'EXPANSION',
    exportNames: ['procurementRoutes'],
  },
  {
    key: 'client',
    mountPath: '/clients',
    relativeRoutePath: '../modules/client/client.routes',
    status: 'EXPANSION',
    exportNames: ['clientRoutes'],
  },
  {
    key: 'matter',
    mountPath: '/matters',
    relativeRoutePath: '../modules/matter/matter.routes',
    status: 'EXPANSION',
    exportNames: ['matterRoutes'],
  },
  {
    key: 'document',
    mountPath: '/documents',
    relativeRoutePath: '../modules/document/document.routes',
    status: 'EXPANSION',
    exportNames: ['documentRoutes'],
  },
  {
    key: 'calendar',
    mountPath: '/calendar',
    relativeRoutePath: '../modules/calendar/calendar.routes',
    status: 'EXPANSION',
    exportNames: ['calendarRoutes'],
  },
  {
    key: 'integrations',
    mountPath: '/integrations',
    relativeRoutePath: '../modules/integrations/integrations.routes',
    status: 'PENDING',
    exportNames: ['integrationRoutes', 'integrationsRoutes'],
  },
  {
    key: 'dashboards',
    mountPath: '/dashboards',
    relativeRoutePath: '../modules/dashboards/dashboard.routes',
    status: 'PENDING',
    exportNames: ['dashboardRoutes', 'dashboardsRoutes'],
  },
  {
    key: 'ai',
    mountPath: '/ai',
    relativeRoutePath: '../modules/ai/ai.routes',
    status: 'PENDING',
    exportNames: ['aiRoutes'],
  },
  {
    key: 'admin',
    mountPath: '/admin',
    relativeRoutePath: '../modules/admin/admin.routes',
    status: 'PENDING',
    exportNames: ['adminRoutes'],
  },
  {
    key: 'reports',
    mountPath: '/reports',
    relativeRoutePath: '../modules/reports/reports.routes',
    status: 'PENDING',
    exportNames: ['reportsRoutes'],
  },
  {
    key: 'portal',
    mountPath: '/portal',
    relativeRoutePath: '../modules/portal/portal.routes',
    status: 'PENDING',
    exportNames: ['portalRoutes'],
  },
];

function resolveRouteFile(relativeRoutePath: string): string | null {
  const basePath = path.resolve(__dirname, relativeRoutePath);

  const candidates = [
    `${basePath}.ts`,
    `${basePath}.js`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.js'),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function pendingModuleRoutes(definition: ModuleRouteDefinition, reason?: string): Router {
  const pending = Router();

  pending.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      module: definition.key,
      status: 'mounted',
      implementationStatus: definition.status,
      routeLoadMode: ROUTE_LOAD_MODE,
      reason,
    });
  });

  pending.get('/', (_req: Request, res: Response) => {
    res.status(501).json({
      success: false,
      module: definition.key,
      code:
        definition.status === 'PENDING'
          ? 'MODULE_PENDING_IMPLEMENTATION'
          : 'MODULE_PENDING_EXPANSION',
      message:
        definition.status === 'PENDING'
          ? `${definition.key} module is mounted but not yet implemented.`
          : `${definition.key} module is mounted but still pending expansion/final verification.`,
      routeLoadMode: ROUTE_LOAD_MODE,
      reason,
    });
  });

  pending.use((_req: Request, res: Response) => {
    res.status(501).json({
      success: false,
      module: definition.key,
      code:
        definition.status === 'PENDING'
          ? 'MODULE_PENDING_IMPLEMENTATION'
          : 'MODULE_PENDING_EXPANSION',
      message: `${definition.key} endpoint is not available in current route load mode.`,
      routeLoadMode: ROUTE_LOAD_MODE,
      reason,
    });
  });

  return pending;
}

function shouldLoadRealRoute(definition: ModuleRouteDefinition): boolean {
  if (ROUTE_LOAD_MODE === 'all') {
    return true;
  }

  return definition.status === 'ACTIVE';
}

function loadRouteModule(definition: ModuleRouteDefinition): Router {
  const resolvedFile = resolveRouteFile(definition.relativeRoutePath);

  if (!shouldLoadRealRoute(definition)) {
    return pendingModuleRoutes(
      definition,
      `Real route loading skipped because API_ROUTE_LOAD_MODE=${ROUTE_LOAD_MODE}`,
    );
  }

  if (!resolvedFile) {
    if (definition.status === 'ACTIVE') {
      throw new Error(
        `Required active route module is missing: ${definition.relativeRoutePath}`,
      );
    }

    return pendingModuleRoutes(definition, 'Route file not present');
  }

  try {
    const loaded = require(resolvedFile);

    const candidates = [
      loaded.default,
      loaded.router,
      ...(definition.exportNames ?? []).map((name) => loaded[name]),
    ];

    const route = candidates.find((candidate) => typeof candidate === 'function');

    if (!route) {
      throw new Error(
        `Route module ${definition.relativeRoutePath} exists but does not export an Express router.`,
      );
    }

    return route as Router;
  } catch (error) {
    /**
     * In safe mode, do not let expansion/pending modules block API boot.
     * In all mode, throw loudly so module-finalization errors are visible.
     */
    if (ROUTE_LOAD_MODE !== 'all' && definition.status !== 'ACTIVE') {
      const message =
        error instanceof Error
          ? error.message
          : `Failed to load ${definition.key} route module`;

      return pendingModuleRoutes(definition, message);
    }

    throw error;
  }
}

for (const definition of moduleRoutes) {
  router.use(definition.mountPath, loadRouteModule(definition));
}

router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    scope: 'api-v1',
    status: 'available',
    routeLoadMode: ROUTE_LOAD_MODE,
    modules: moduleRoutes.map((module) => ({
      key: module.key,
      mountPath: module.mountPath,
      status: module.status,
      routeFilePresent: Boolean(resolveRouteFile(module.relativeRoutePath)),
      realRouteLoaded: shouldLoadRealRoute(module),
    })),
  });
});

export default router;