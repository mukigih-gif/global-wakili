import { createHash } from 'crypto';
import {
  AlertFrequency,
  AmlReportType,
  AmlStatus,
  AuditAction,
  AuditSeverity,
  BIConnectorType,
  DashboardVisibility,
  Prisma,
  PrismaClient,
  ReportDeliveryChannel,
  ReportDefinitionType,
  ReportExportFormat,
  ReportExportStatus,
  ReportRunStatus,
  ReportSourceLayer,
  ScheduleFrequency,
  TenantRole,
} from '@prisma/client';

/*
 * 16_reporting.seed.ts — Per-tenant reporting, dashboard, audit & compliance layer
 * (CLAUDE.md §12).
 *
 * Comprehensive seed (standing directive — NO deferment, 2026-06-29):
 *   Reporting : ReportDefinition, ScheduledReport, ReportRun, ReportExport,
 *               DashboardDefinition, DashboardWidget.
 *   Audit     : AuditLog (real hash-chained entries), AuditLogArchive (the audit
 *               report), AuditAlert.
 *   Compliance: ComplianceReport (AML).
 *   BI        : BIConnectorConfig.
 *
 * Schema realities handled:
 *   - "SavedReport" = ReportDefinition; "ReportSchedule" = ScheduledReport.
 *   - There is NO AuditReport model. The requested audit report is BOTH:
 *       (a) a ReportRun on a COMPLIANCE ReportDefinition (audit-log-summary),
 *           snapshotting the live AuditLog, and
 *       (b) an AuditLogArchive (the formal archive referencing real entries).
 *   - Prior seed layers used raw prisma and did NOT emit AuditLog rows, so we
 *     seed real, hash-chained AuditLog entries here (the data the audit report
 *     summarizes). Hash replicates audit-hash.ts exactly:
 *       hash[n] = sha256( stableSerialize(payload[n]) + ':' + hash[n-1] )
 *     chained from the tenant's current head (max sequenceNumber). The 14-field
 *     payload mirrors audit-logger.ts so strict recompute also verifies.
 *   - AuditLog/AuditAlert are security-domain models seeded here (no deferment)
 *     to back the audit report; the security layer (19) may extend them.
 *
 * Snapshots reflect real seeded data (AccountBalance/COA, AuditLog, matter/trust/
 * payroll counts).
 *
 * DEMO/FIXTURE data — run only under the master demo-data gate.
 *
 * Policy:
 * - Idempotent: ReportDefinition/DashboardDefinition upsert(tenantId,key);
 *   DashboardWidget upsert(dashboardDefinitionId,key); BIConnectorConfig
 *   upsert(tenantId,name); ScheduledReport (tenantId,name); ReportRun
 *   (tenantId,reportDefinitionId,startedAt); ReportExport (tenantId,reportRunId);
 *   AuditLog (tenantId,correlationId); AuditLogArchive (tenantId,archiveLocation);
 *   AuditAlert (tenantId,triggerRule); ComplianceReport (tenantId,referenceNumber).
 * - Tenant-scoped. No schema changes, no destructive operations.
 */

type SeedPrisma = PrismaClient;

type ReportDefSeed = { key: string; name: string; description: string; type: ReportDefinitionType; sourceLayer: ReportSourceLayer };
type WidgetSeed = { key: string; title: string; widgetType: string; dataSource: string };
type AuditEventSeed = { action: AuditAction; severity: AuditSeverity; entityType: string; entityKey: 'matter' | 'client' | 'trustTxn' | 'payroll' | 'admin'; reason: string };

export type ReportingSeedResult = {
  status: 'reporting_seed_complete';
  tenantId: string;
  reportDefinitions: number;
  scheduledReports: number;
  reportRuns: number;
  reportExports: number;
  dashboardDefinitions: number;
  dashboardWidgets: number;
  auditLogs: number;
  auditLogArchives: number;
  auditAlerts: number;
  complianceReports: number;
  biConnectorConfigs: number;
};

const GENESIS_HASH = '0'.repeat(64);

const REPORT_DEFS: ReportDefSeed[] = [
  { key: 'trial-balance', name: 'Trial Balance', description: 'General ledger trial balance across all accounts.', type: ReportDefinitionType.FINANCIAL, sourceLayer: ReportSourceLayer.SNAPSHOT },
  { key: 'matter-profitability', name: 'Matter Profitability Summary', description: 'Profitability by matter (fees vs. cost).', type: ReportDefinitionType.OPERATIONAL, sourceLayer: ReportSourceLayer.HYBRID },
  { key: 'trust-statement', name: 'Trust Account Statement', description: 'Client trust account movements and balances.', type: ReportDefinitionType.TRUST, sourceLayer: ReportSourceLayer.SNAPSHOT },
  { key: 'aged-debtors', name: 'Aged Debtors', description: 'Outstanding client invoices by ageing bucket.', type: ReportDefinitionType.FINANCIAL, sourceLayer: ReportSourceLayer.DIRECT_QUERY },
  { key: 'audit-log-summary', name: 'Audit Log Summary', description: 'Summary snapshot of the tamper-evident audit log.', type: ReportDefinitionType.COMPLIANCE, sourceLayer: ReportSourceLayer.SNAPSHOT },
];

const WIDGETS: WidgetSeed[] = [
  { key: 'matter-count', title: 'Active Matters', widgetType: 'metric', dataSource: 'matters' },
  { key: 'trust-balance', title: 'Trust Balance', widgetType: 'metric', dataSource: 'trust' },
  { key: 'outstanding-invoices', title: 'Outstanding Invoices', widgetType: 'metric', dataSource: 'billing' },
  { key: 'payroll-summary', title: 'Payroll Summary', widgetType: 'metric', dataSource: 'payroll' },
];

const AUDIT_EVENTS: AuditEventSeed[] = [
  { action: AuditAction.CREATE, severity: AuditSeverity.INFO, entityType: 'Matter', entityKey: 'matter', reason: 'Matter created (seed)' },
  { action: AuditAction.UPDATE, severity: AuditSeverity.INFO, entityType: 'Matter', entityKey: 'matter', reason: 'Matter status updated (seed)' },
  { action: AuditAction.CREATE, severity: AuditSeverity.INFO, entityType: 'Client', entityKey: 'client', reason: 'Client onboarded (seed)' },
  { action: AuditAction.CREATE, severity: AuditSeverity.HIGH, entityType: 'TrustTransaction', entityKey: 'trustTxn', reason: 'Trust deposit recorded (seed)' },
  { action: AuditAction.CREATE, severity: AuditSeverity.HIGH, entityType: 'PayrollBatch', entityKey: 'payroll', reason: 'Payroll batch posted (seed)' },
  { action: AuditAction.UPDATE, severity: AuditSeverity.MEDIUM, entityType: 'User', entityKey: 'admin', reason: 'User profile updated (seed)' },
];

const SCHEDULE_NAME = 'Monthly Trial Balance';
const BI_CONNECTOR_NAME = 'Power BI Workspace';
const AUDIT_ALERT_RULE = 'CRITICAL_SEVERITY_EVENT';

/* Canonical, deterministic serialization — verbatim from audit-hash.ts /
 * audit-chain.ts (sorted keys), so seeded hashes match the real verifier. */
function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const sorted = Object.keys(obj).sort();
  return `{${sorted.map((k) => `${JSON.stringify(k)}:${stableSerialize(obj[k])}`).join(',')}}`;
}

function computeAuditHash(payload: Record<string, unknown>, previousHash: string): string {
  return createHash('sha256').update(`${stableSerialize(payload)}:${previousHash}`, 'utf8').digest('hex');
}

async function resolveAdminId(prisma: SeedPrisma, tenantId: string): Promise<string> {
  const admin =
    (await prisma.user.findFirst({ where: { tenantId, tenantRole: TenantRole.FIRM_ADMIN }, select: { id: true } })) ??
    (await prisma.user.findFirst({ where: { tenantId, status: 'ACTIVE' }, select: { id: true } }));
  if (!admin) {
    throw new Error(`seedReporting: no user for tenant ${tenantId}. Run 02_users first.`);
  }
  return admin.id;
}

async function buildTrialBalanceSnapshot(prisma: SeedPrisma, tenantId: string, periodLabel: string): Promise<{ summary: Prisma.InputJsonObject; rowCount: number }> {
  const balances = await prisma.accountBalance.findMany({
    where: { tenantId },
    select: { debitBalance: true, creditBalance: true, account: { select: { code: true, name: true } } },
  });
  let totalDebit = new Prisma.Decimal(0);
  let totalCredit = new Prisma.Decimal(0);
  const accounts = balances.map((b) => {
    totalDebit = totalDebit.plus(b.debitBalance);
    totalCredit = totalCredit.plus(b.creditBalance);
    return { code: b.account.code, name: b.account.name, debit: b.debitBalance.toString(), credit: b.creditBalance.toString() };
  });
  const summary: Prisma.InputJsonObject = {
    report: 'Trial Balance',
    period: periodLabel,
    accountCount: accounts.length,
    totalDebit: totalDebit.toFixed(2),
    totalCredit: totalCredit.toFixed(2),
    balanced: totalDebit.equals(totalCredit),
    accounts: accounts.slice(0, 12),
  };
  return { summary, rowCount: accounts.length };
}

/* Seeds real, hash-chained AuditLog entries (the data the audit report
 * summarizes). Chains from the tenant's current head; idempotent by
 * correlationId. Returns the ordered seeded entry ids + their hashes. */
async function seedAuditEntries(
  prisma: SeedPrisma,
  tenantId: string,
  adminId: string,
  refs: { matter: string | null; client: string | null; trustTxn: string | null; payroll: string | null },
  baseDate: Date,
): Promise<{ ids: string[]; hashes: string[]; correlationIds: string[] }> {
  const head = await prisma.auditLog.findFirst({ where: { tenantId }, orderBy: { sequenceNumber: 'desc' }, select: { hash: true } });
  let previousHash = head?.hash ?? GENESIS_HASH;

  const ids: string[] = [];
  const hashes: string[] = [];
  const correlationIds: string[] = [];

  for (let i = 0; i < AUDIT_EVENTS.length; i++) {
    const ev = AUDIT_EVENTS[i]!;
    const correlationId = `seed-audit-${tenantId.slice(-6)}-${i}`;
    correlationIds.push(correlationId);

    const existing = await prisma.auditLog.findFirst({ where: { tenantId, correlationId }, select: { id: true, hash: true } });
    if (existing) {
      ids.push(existing.id);
      hashes.push(existing.hash);
      previousHash = existing.hash; // keep the chain consistent for later new entries
      continue;
    }

    const entityId =
      ev.entityKey === 'admin'
        ? adminId
        : (ev.entityKey === 'matter' ? refs.matter : ev.entityKey === 'client' ? refs.client : ev.entityKey === 'trustTxn' ? refs.trustTxn : refs.payroll) ?? tenantId;

    const afterData: Prisma.InputJsonObject = {
      event: ev.reason,
      requestId: 'seed',
      actorRole: 'SYSTEM',
      timestamp: new Date(baseDate.getTime() + i * 60_000).toISOString(),
    };

    // Exact 14-field payload from audit-logger.ts (beforeData null, not stored).
    const payload: Record<string, unknown> = {
      tenantId,
      userId: adminId,
      action: ev.action,
      severity: ev.severity,
      entityType: ev.entityType,
      entityId,
      beforeData: null,
      afterData,
      changedFields: [],
      success: true,
      failureReason: null,
      correlationId,
      reason: ev.reason,
      ipAddress: null,
      userAgent: 'seed',
    };

    const hash = computeAuditHash(payload, previousHash);

    const created = await prisma.auditLog.create({
      data: {
        tenantId,
        userId: adminId,
        action: ev.action,
        severity: ev.severity,
        entityType: ev.entityType,
        entityId,
        afterData,
        changedFields: [],
        hash,
        previousHash,
        success: true,
        correlationId,
        reason: ev.reason,
        userAgent: 'seed',
      },
      select: { id: true },
    });

    ids.push(created.id);
    hashes.push(hash);
    previousHash = hash;
  }

  return { ids, hashes, correlationIds };
}

export async function seedReporting(prisma: PrismaClient, tenantId: string): Promise<ReportingSeedResult> {
  if (!tenantId || tenantId.trim().length === 0) {
    throw new Error('seedReporting requires a tenantId.');
  }

  const adminId = await resolveAdminId(prisma, tenantId);
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const thisMonthStart = new Date(Date.UTC(y, m, 1, 6, 0, 0));
  const lastMonthStart = new Date(Date.UTC(y, m - 1, 1, 6, 0, 0));
  const nextMonthStart = new Date(Date.UTC(y, m + 1, 1, 6, 0, 0));
  const auditRunStart = new Date(Date.UTC(y, m, 2, 6, 0, 0));
  const plus5 = (d: Date) => new Date(d.getTime() + 5 * 60_000);
  const label = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

  // 0. Resolve entities for audit events, then seed hash-chained AuditLog entries.
  const [matter, client, trustTxn, payrollBatch] = await Promise.all([
    prisma.matter.findFirst({ where: { tenantId }, select: { id: true } }),
    prisma.client.findFirst({ where: { tenantId }, select: { id: true } }),
    prisma.trustTransaction.findFirst({ where: { tenantId }, select: { id: true } }),
    prisma.payrollBatch.findFirst({ where: { tenantId }, select: { id: true } }),
  ]);
  const audit = await seedAuditEntries(
    prisma,
    tenantId,
    adminId,
    { matter: matter?.id ?? null, client: client?.id ?? null, trustTxn: trustTxn?.id ?? null, payroll: payrollBatch?.id ?? null },
    new Date(Date.UTC(y, m, 1, 8, 0, 0)),
  );

  // 1. Report definitions (4 business + 1 audit-summary).
  const defIdByKey = new Map<string, string>();
  for (const def of REPORT_DEFS) {
    const record = await prisma.reportDefinition.upsert({
      where: { tenantId_key: { tenantId, key: def.key } },
      update: { name: def.name, description: def.description, type: def.type, sourceLayer: def.sourceLayer, defaultFormat: ReportExportFormat.PDF, isActive: true },
      create: {
        tenantId,
        key: def.key,
        name: def.name,
        description: def.description,
        type: def.type,
        sourceLayer: def.sourceLayer,
        defaultFormat: ReportExportFormat.PDF,
        isSystem: true,
        isActive: true,
        config: { seeded: true },
      },
      select: { id: true },
    });
    defIdByKey.set(def.key, record.id);
  }
  const trialBalanceDefId = defIdByKey.get('trial-balance')!;
  const auditDefId = defIdByKey.get('audit-log-summary')!;

  // 2. Scheduled report — monthly Trial Balance, 1st of month 06:00.
  const existingSchedule = await prisma.scheduledReport.findFirst({ where: { tenantId, name: SCHEDULE_NAME }, select: { id: true } });
  if (!existingSchedule) {
    await prisma.scheduledReport.create({
      data: {
        tenantId,
        reportDefinitionId: trialBalanceDefId,
        name: SCHEDULE_NAME,
        frequency: ScheduleFrequency.MONTHLY,
        cronExpression: '0 6 1 * *',
        timezone: 'Africa/Nairobi',
        format: ReportExportFormat.PDF,
        deliveryChannel: ReportDeliveryChannel.EMAIL,
        isEnabled: true,
        recipients: ['firm-admin'],
        nextRunAt: nextMonthStart,
        lastRunAt: thisMonthStart,
        createdByUserId: adminId,
      },
    });
  }

  // 3. Report runs (+ 4. one PDF export each). Audit snapshot now includes seeded entries.
  const tbThis = await buildTrialBalanceSnapshot(prisma, tenantId, label(thisMonthStart));
  const tbLast = await buildTrialBalanceSnapshot(prisma, tenantId, label(lastMonthStart));
  const auditTotal = await prisma.auditLog.count({ where: { tenantId } });
  const auditSummary: Prisma.InputJsonObject = {
    report: 'Audit Log Summary',
    totalEntries: auditTotal,
    seededEntries: audit.ids.length,
    chainHead: audit.hashes[audit.hashes.length - 1] ?? null,
  };

  const runSeeds: { defId: string; startedAt: Date; summary: Prisma.InputJsonObject; rowCount: number; snapshotRefType: string; fileBase: string }[] = [
    { defId: trialBalanceDefId, startedAt: lastMonthStart, summary: tbLast.summary, rowCount: tbLast.rowCount, snapshotRefType: 'ChartOfAccount', fileBase: `trial-balance-${label(lastMonthStart)}` },
    { defId: trialBalanceDefId, startedAt: thisMonthStart, summary: tbThis.summary, rowCount: tbThis.rowCount, snapshotRefType: 'ChartOfAccount', fileBase: `trial-balance-${label(thisMonthStart)}` },
    { defId: auditDefId, startedAt: auditRunStart, summary: auditSummary, rowCount: auditTotal, snapshotRefType: 'AuditLog', fileBase: `audit-log-summary-${label(auditRunStart)}` },
  ];

  let reportExports = 0;
  for (const run of runSeeds) {
    let runId: string;
    const existingRun = await prisma.reportRun.findFirst({ where: { tenantId, reportDefinitionId: run.defId, startedAt: run.startedAt }, select: { id: true } });
    if (existingRun) {
      runId = existingRun.id;
    } else {
      const created = await prisma.reportRun.create({
        data: {
          tenantId,
          reportDefinitionId: run.defId,
          status: ReportRunStatus.SUCCEEDED,
          sourceLayer: ReportSourceLayer.SNAPSHOT,
          triggeredByUserId: adminId,
          parameters: { period: run.summary.period ?? null },
          resultSummary: run.summary,
          snapshotRefType: run.snapshotRefType,
          snapshotRefId: tenantId,
          rowCount: run.rowCount,
          startedAt: run.startedAt,
          completedAt: plus5(run.startedAt),
        },
        select: { id: true },
      });
      runId = created.id;
    }

    const existingExport = await prisma.reportExport.findFirst({ where: { tenantId, reportRunId: runId }, select: { id: true } });
    if (!existingExport) {
      await prisma.reportExport.create({
        data: {
          tenantId,
          reportDefinitionId: run.defId,
          reportRunId: runId,
          status: ReportExportStatus.READY,
          format: ReportExportFormat.PDF,
          deliveryChannel: ReportDeliveryChannel.DOWNLOAD,
          fileName: `${run.fileBase}.pdf`,
          mimeType: 'application/pdf',
          storageKey: `reports/${tenantId.slice(-6)}/${run.fileBase}.pdf`,
          checksum: `seed-checksum-${run.fileBase}`,
          byteSize: 24576,
          downloadUrl: `https://seed.local/exports/${run.fileBase}.pdf`,
          expiresAt: new Date(plus5(run.startedAt).getTime() + 30 * 24 * 3600_000),
          deliveredAt: plus5(run.startedAt),
        },
      });
    }
    reportExports += 1;
  }

  // 5. AuditLogArchive — the formal audit report (references the seeded entries).
  const archiveLocation = `archive/${tenantId.slice(-6)}/audit-${label(thisMonthStart)}.json.gz`;
  const existingArchive = await prisma.auditLogArchive.findFirst({ where: { tenantId, archiveLocation }, select: { id: true } });
  if (!existingArchive) {
    const archiveChecksum = createHash('sha256').update(audit.hashes.join('|'), 'utf8').digest('hex');
    await prisma.auditLogArchive.create({
      data: {
        tenantId,
        originalAuditLogIds: audit.ids,
        archivedAt: thisMonthStart,
        archiveLocation,
        archiveChecksum,
      },
    });
  }

  // 6. AuditAlert — critical-severity alert rule.
  const existingAlert = await prisma.auditAlert.findFirst({ where: { tenantId, triggerRule: AUDIT_ALERT_RULE }, select: { id: true } });
  if (!existingAlert) {
    await prisma.auditAlert.create({
      data: {
        tenantId,
        triggerRule: AUDIT_ALERT_RULE,
        isActive: true,
        alertFrequency: AlertFrequency.INSTANT,
        emailRecipients: [],
      },
    });
  }

  // 7. ComplianceReport — AML review snapshot (no deferment).
  const amlReference = `AML-${tenantId.slice(-6)}-${label(thisMonthStart)}`;
  const existingCompliance = await prisma.complianceReport.findFirst({ where: { tenantId, referenceNumber: amlReference }, select: { id: true } });
  if (!existingCompliance) {
    await prisma.complianceReport.create({
      data: {
        tenantId,
        reportType: AmlReportType.AML_REVIEW,
        status: AmlStatus.DRAFT,
        periodStart: thisMonthStart,
        periodEnd: nextMonthStart,
        referenceNumber: amlReference,
        payload: { summary: 'Periodic AML review (seed).', flaggedClients: 0, reviewedClients: client ? 1 : 0 },
        createdById: adminId,
      },
    });
  }

  // 8. BIConnectorConfig — Power BI connector (disabled, simulated; no deferment).
  await prisma.bIConnectorConfig.upsert({
    where: { tenantId_name: { tenantId, name: BI_CONNECTOR_NAME } },
    update: { connectorType: BIConnectorType.POWER_BI, isEnabled: false },
    create: {
      tenantId,
      name: BI_CONNECTOR_NAME,
      connectorType: BIConnectorType.POWER_BI,
      isEnabled: false,
      config: { simulated: true },
    },
  });

  // 9. Dashboard definition + widgets (values reflect real seeded data).
  const dashboard = await prisma.dashboardDefinition.upsert({
    where: { tenantId_key: { tenantId, key: 'firm-overview' } },
    update: { name: 'Firm Overview', visibility: DashboardVisibility.TENANT, isActive: true },
    create: {
      tenantId,
      key: 'firm-overview',
      name: 'Firm Overview',
      description: 'Headline operational metrics for the firm.',
      visibility: DashboardVisibility.TENANT,
      isSystem: true,
      isActive: true,
      layout: { columns: 4 },
    },
    select: { id: true },
  });

  const [matterCount, trustAgg, invoiceCount, payrollCount] = await Promise.all([
    prisma.matter.count({ where: { tenantId } }),
    prisma.trustAccount.aggregate({ where: { tenantId }, _sum: { currentBalance: true } }),
    prisma.invoice.count({ where: { tenantId } }),
    prisma.payrollBatch.count({ where: { tenantId } }),
  ]);
  const widgetValue: Record<string, string | number> = {
    'matter-count': matterCount,
    'trust-balance': (trustAgg._sum.currentBalance ?? new Prisma.Decimal(0)).toString(),
    'outstanding-invoices': invoiceCount,
    'payroll-summary': payrollCount,
  };

  for (const w of WIDGETS) {
    await prisma.dashboardWidget.upsert({
      where: { dashboardDefinitionId_key: { dashboardDefinitionId: dashboard.id, key: w.key } },
      update: { title: w.title, widgetType: w.widgetType, dataSource: w.dataSource, isActive: true },
      create: {
        tenantId,
        dashboardDefinitionId: dashboard.id,
        key: w.key,
        title: w.title,
        widgetType: w.widgetType,
        dataSource: w.dataSource,
        config: { metric: w.key, value: widgetValue[w.key], unit: w.dataSource === 'trust' ? 'KES' : 'count' },
        refreshIntervalSec: 300,
        isActive: true,
      },
    });
  }

  // Final counts via queries (idempotent-safe).
  const defIds = [...defIdByKey.values()];
  const [
    reportDefinitions,
    scheduledReports,
    reportRuns,
    reportExportsCount,
    dashboardDefinitions,
    dashboardWidgets,
    auditLogs,
    auditLogArchives,
    auditAlerts,
    complianceReports,
    biConnectorConfigs,
  ] = await Promise.all([
    prisma.reportDefinition.count({ where: { tenantId, key: { in: REPORT_DEFS.map((d) => d.key) } } }),
    prisma.scheduledReport.count({ where: { tenantId, name: SCHEDULE_NAME } }),
    prisma.reportRun.count({ where: { tenantId, reportDefinitionId: { in: defIds } } }),
    prisma.reportExport.count({ where: { tenantId, reportDefinitionId: { in: defIds } } }),
    prisma.dashboardDefinition.count({ where: { tenantId, key: 'firm-overview' } }),
    prisma.dashboardWidget.count({ where: { tenantId, dashboardDefinitionId: dashboard.id } }),
    prisma.auditLog.count({ where: { tenantId, correlationId: { in: audit.correlationIds } } }),
    prisma.auditLogArchive.count({ where: { tenantId, archiveLocation } }),
    prisma.auditAlert.count({ where: { tenantId, triggerRule: AUDIT_ALERT_RULE } }),
    prisma.complianceReport.count({ where: { tenantId, referenceNumber: amlReference } }),
    prisma.bIConnectorConfig.count({ where: { tenantId, name: BI_CONNECTOR_NAME } }),
  ]);

  return {
    status: 'reporting_seed_complete',
    tenantId,
    reportDefinitions,
    scheduledReports,
    reportRuns,
    reportExports: reportExportsCount,
    dashboardDefinitions,
    dashboardWidgets,
    auditLogs,
    auditLogArchives,
    auditAlerts,
    complianceReports,
    biConnectorConfigs,
  };
}
