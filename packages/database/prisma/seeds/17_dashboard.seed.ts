import {
  DashboardVisibility,
  PrismaClient,
} from '@prisma/client';

/*
 * 17_dashboard.seed.ts — Per-tenant role dashboards + user display prefs (CLAUDE.md §12).
 *
 * Faithful seed of REAL models only. Verified findings (logged as FINDING-DASH-001):
 *   - DashboardConfig / DashboardPin / RecentActivity / UserPreference are NOT
 *     models. Only DashboardDefinition + DashboardWidget exist.
 *   - The landing dashboard (app/dashboard/page.tsx) is LIVE/computed — it reads
 *     /matters/dashboard/summary + /matters/dashboard/activity (AuditLog, seeded
 *     in layer 16) and gates widgets by hardcoded frontend role arrays. It does
 *     NOT consume these dashboard tables, so this seed does not change it.
 *   - TenantRole has no HR_MANAGER → the finance/HR dashboard uses ACCOUNTANT.
 *   - User display prefs live on the User row (theme, language, smsNotifications);
 *     there are no timezone/currency/dateFormat columns.
 *
 * Seeds per tenant:
 *   - DashboardDefinition : 3 role dashboards (FIRM_ADMIN, ADVOCATE, ACCOUNTANT),
 *                           visibility ROLE. (Layer 16 seeded the TENANT-wide
 *                           'firm-overview' separately.)
 *   - DashboardWidget     : per definition, mirroring the frontend role widget
 *                           sets; metric widgets carry live values, entity widgets
 *                           reference real seeded matter/trust IDs.
 *   - User display prefs  : updateMany on active users (theme, language en-KE,
 *                           smsNotifications) — update, not create.
 *
 * DEMO/FIXTURE data — run only under the master demo-data gate.
 *
 * Policy:
 * - Idempotent: DashboardDefinition upsert(tenantId,key); DashboardWidget
 *   upsert(dashboardDefinitionId,key); user prefs updateMany (idempotent).
 * - Tenant-scoped. No schema changes, no destructive operations.
 */

type SeedPrisma = PrismaClient;

type MetricKey = 'matterCount' | 'clientCount' | 'invoiceCount' | 'payrollCount' | 'trustBalance';
type RefKey = 'matterId' | 'trustAccountId';

type WidgetSeed = {
  key: string;
  title: string;
  widgetType: string;
  dataSource: string;
  valueFrom?: MetricKey;
  refFrom?: RefKey;
};

type DashboardSeed = {
  key: string;
  role: string;
  name: string;
  description: string;
  widgets: WidgetSeed[];
};

export type DashboardSeedResult = {
  status: 'dashboard_seed_complete';
  tenantId: string;
  dashboardDefinitions: number;
  dashboardWidgets: number;
  usersUpdated: number;
};

/* Widget sets mirror the hardcoded frontend role visibility
 * (FINANCE_ROLES / LAWYER_ROLES) in app/dashboard/page.tsx. */
const DASHBOARDS: DashboardSeed[] = [
  {
    key: 'role-firm-admin',
    role: 'FIRM_ADMIN',
    name: 'Firm Admin Dashboard',
    description: 'Firm-wide operational and financial overview.',
    widgets: [
      { key: 'open-matters', title: 'Open Matters', widgetType: 'metric', dataSource: 'matters', valueFrom: 'matterCount' },
      { key: 'active-clients', title: 'Active Clients', widgetType: 'metric', dataSource: 'clients', valueFrom: 'clientCount' },
      { key: 'outstanding-invoices', title: 'Outstanding Invoices', widgetType: 'metric', dataSource: 'billing', valueFrom: 'invoiceCount' },
      { key: 'trust-balance', title: 'Trust Balance', widgetType: 'metric', dataSource: 'trust', valueFrom: 'trustBalance', refFrom: 'trustAccountId' },
      { key: 'revenue-trend', title: 'Revenue Trend', widgetType: 'chart', dataSource: 'finance' },
      { key: 'recent-activity', title: 'Recent Activity', widgetType: 'feed', dataSource: 'audit' },
    ],
  },
  {
    key: 'role-advocate',
    role: 'ADVOCATE',
    name: 'Advocate Dashboard',
    description: 'Personal matters, time and hearings.',
    widgets: [
      { key: 'my-matters', title: 'My Matters', widgetType: 'list', dataSource: 'matters', valueFrom: 'matterCount', refFrom: 'matterId' },
      { key: 'billable-hours', title: 'Billable Hours', widgetType: 'metric', dataSource: 'time' },
      { key: 'upcoming-hearings', title: 'Upcoming Hearings', widgetType: 'list', dataSource: 'calendar' },
      { key: 'pending-tasks', title: 'My Tasks', widgetType: 'metric', dataSource: 'tasks' },
      { key: 'recent-activity', title: 'Recent Activity', widgetType: 'feed', dataSource: 'audit' },
    ],
  },
  {
    key: 'role-accountant',
    role: 'ACCOUNTANT',
    name: 'Accountant Dashboard',
    description: 'Finance, billing and trust compliance.',
    widgets: [
      { key: 'trial-balance', title: 'Trial Balance', widgetType: 'report', dataSource: 'finance' },
      { key: 'outstanding-invoices', title: 'Outstanding Invoices', widgetType: 'metric', dataSource: 'billing', valueFrom: 'invoiceCount' },
      { key: 'ar-aging', title: 'AR Aging', widgetType: 'chart', dataSource: 'billing' },
      { key: 'trust-balance', title: 'Trust Balance', widgetType: 'metric', dataSource: 'trust', valueFrom: 'trustBalance', refFrom: 'trustAccountId' },
      { key: 'payroll-summary', title: 'Payroll Summary', widgetType: 'metric', dataSource: 'payroll', valueFrom: 'payrollCount' },
    ],
  },
];

export async function seedDashboard(prisma: PrismaClient, tenantId: string): Promise<DashboardSeedResult> {
  if (!tenantId || tenantId.trim().length === 0) {
    throw new Error('seedDashboard requires a tenantId.');
  }

  // Live values + real entity refs for widget config (layer 06 matters, 11 trust).
  const [matterCount, clientCount, invoiceCount, payrollCount, trustAgg, matter, trustAccount] = await Promise.all([
    prisma.matter.count({ where: { tenantId } }),
    prisma.client.count({ where: { tenantId } }),
    prisma.invoice.count({ where: { tenantId } }),
    prisma.payrollBatch.count({ where: { tenantId } }),
    prisma.trustAccount.aggregate({ where: { tenantId }, _sum: { currentBalance: true } }),
    prisma.matter.findFirst({ where: { tenantId }, select: { id: true } }),
    prisma.trustAccount.findFirst({ where: { tenantId }, select: { id: true } }),
  ]);

  const metrics: Record<MetricKey, string | number> = {
    matterCount,
    clientCount,
    invoiceCount,
    payrollCount,
    trustBalance: (trustAgg._sum.currentBalance ?? 0).toString(),
  };
  const refs: Record<RefKey, string | null> = {
    matterId: matter?.id ?? null,
    trustAccountId: trustAccount?.id ?? null,
  };

  for (const dash of DASHBOARDS) {
    const definition = await prisma.dashboardDefinition.upsert({
      where: { tenantId_key: { tenantId, key: dash.key } },
      update: { name: dash.name, description: dash.description, visibility: DashboardVisibility.ROLE, isActive: true, metadata: { role: dash.role } },
      create: {
        tenantId,
        key: dash.key,
        name: dash.name,
        description: dash.description,
        visibility: DashboardVisibility.ROLE,
        isSystem: true,
        isActive: true,
        layout: { columns: 3 },
        metadata: { role: dash.role },
      },
      select: { id: true },
    });

    let position = 0;
    for (const w of dash.widgets) {
      const config: Record<string, string | number> = { metric: w.key, dataSource: w.dataSource };
      if (w.valueFrom) {
        config.value = metrics[w.valueFrom];
        config.unit = w.dataSource === 'trust' ? 'KES' : 'count';
      }
      const refId = w.refFrom ? refs[w.refFrom] : null;
      if (refId) {
        config.refId = refId;
      }

      await prisma.dashboardWidget.upsert({
        where: { dashboardDefinitionId_key: { dashboardDefinitionId: definition.id, key: w.key } },
        update: { title: w.title, widgetType: w.widgetType, dataSource: w.dataSource, config, isActive: true },
        create: {
          tenantId,
          dashboardDefinitionId: definition.id,
          key: w.key,
          title: w.title,
          widgetType: w.widgetType,
          dataSource: w.dataSource,
          config,
          position: { order: position },
          refreshIntervalSec: 300,
          isActive: true,
        },
      });
      position += 1;
    }
  }

  // User display preferences — update existing active users (en-KE, Kenya defaults).
  const updated = await prisma.user.updateMany({
    where: { tenantId, status: 'ACTIVE' },
    data: { theme: 'light', language: 'en-KE', smsNotifications: true },
  });

  // Final counts via queries (idempotent-safe).
  const dashKeys = DASHBOARDS.map((d) => d.key);
  const [defCount, widgetCount] = await Promise.all([
    prisma.dashboardDefinition.count({ where: { tenantId, key: { in: dashKeys } } }),
    prisma.dashboardWidget.count({ where: { tenantId, dashboardDefinition: { key: { in: dashKeys } } } }),
  ]);

  return {
    status: 'dashboard_seed_complete',
    tenantId,
    dashboardDefinitions: defCount,
    dashboardWidgets: widgetCount,
    usersUpdated: updated.count,
  };
}
