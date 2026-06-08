// apps/api/src/routes/index.ts

import { Router } from 'express';

import financeRoutes from '../modules/finance/finance.routes';
import trustRoutes from '../modules/trust/trust.routes';
import billingRoutes from '../modules/billing/billing.routes';
import paymentRoutes from '../modules/payments/payment.routes';
import payrollRoutes from '../modules/payroll/payroll.routes';
import hrRoutes from '../modules/hr/hr.routes';
import procurementRoutes from '../modules/procurement/procurement.routes';
import vendorRoutes from '../modules/vendor/vendor.routes';
import clientRoutes from '../modules/client/client.routes';
import matterRoutes from '../modules/matter/matter.routes';
import documentRoutes from '../modules/document/document.routes';
import calendarRoutes from '../modules/calendar/calendar.routes';
import taskRoutes from '../modules/task/task.routes';
import integrationRoutes from '../modules/integrations/integrations.routes';
import receptionRoutes from '../modules/reception/reception.routes';
import courtRoutes from '../modules/court/court.routes';
import aiRoutes from '../modules/ai/ai.routes';
import complianceRoutes from '../modules/compliance/compliance.routes';
import notificationRoutes from '../modules/notifications/notification.routes';
import queueRoutes from '../modules/queues/queue.routes';
import analyticsRoutes from '../modules/analytics/analytics.routes';
import approvalRoutes from '../modules/approval/approval.routes';
import reportingRoutes from '../modules/reporting/reporting.routes';
import platformRoutes from '../modules/platform/platform.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    scope: 'api-v1',
    status: 'available',
    service: 'global-wakili-api',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

router.use('/finance', financeRoutes);
router.use('/trust', trustRoutes);
router.use('/billing', billingRoutes);
router.use('/payments', paymentRoutes);
router.use('/payroll', payrollRoutes);
router.use('/hr', hrRoutes);
router.use('/procurement', procurementRoutes);
router.use('/vendors', vendorRoutes);
router.use('/vendor', vendorRoutes);
router.use('/clients', clientRoutes);
router.use('/matters', matterRoutes);
router.use('/tasks', taskRoutes);
router.use('/task', taskRoutes);
router.use('/reception', receptionRoutes);
router.use('/frontdesk', receptionRoutes);
router.use('/front-desk', receptionRoutes);
router.use('/express', receptionRoutes);
router.use('/court', courtRoutes);
router.use('/courts', courtRoutes);
router.use('/filing', courtRoutes);
router.use('/filings', courtRoutes);
router.use('/litigation', courtRoutes);
router.use('/compliance', complianceRoutes);
router.use('/aml', complianceRoutes);
router.use('/documents', documentRoutes);
router.use('/calendar', calendarRoutes);
router.use('/notifications', notificationRoutes);
router.use('/notification', notificationRoutes);
router.use('/queues', queueRoutes);
router.use('/queue', queueRoutes);
router.use('/jobs', queueRoutes);
router.use('/integrations', integrationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/approvals', approvalRoutes);
router.use('/approval', approvalRoutes);
router.use('/reporting', reportingRoutes);
router.use('/human-resources', hrRoutes);
router.use('/ai', aiRoutes);
router.use('/platform', platformRoutes);

// ── Firm Settings: Custom Labels (per module, per tenant) ─────────────────────
// Labels stored in PlatformGlobalSetting with key `labels:definitions:{MODULE}`

import type { Request, Response } from 'express';
import { requirePermissions } from '../middleware/rbac';
import { PERMISSIONS } from '../config/permissions';

type LabelDefinition = { id: string; name: string; color: string; module: string };

const LABEL_MODULES = ['TASK', 'MATTER', 'CLIENT', 'DOCUMENT', 'COURT'] as const;

async function getLabelDefs(db: any, tenantId: string, mod: string): Promise<LabelDefinition[]> {
  const setting = await db.platformGlobalSetting.findFirst({
    where: { key: `labels:definitions:${mod}`, targetTenantId: tenantId },
    select: { currentValue: true },
  });
  return (setting?.currentValue as LabelDefinition[]) ?? [];
}

router.get('/settings/labels', requirePermissions(PERMISSIONS.platform.viewSettings), async (req: Request, res: Response) => {
  try {
    const mod = req.query.module ? String(req.query.module).toUpperCase() : null;
    const modules = mod ? [mod] : LABEL_MODULES;
    const result: Record<string, LabelDefinition[]> = {};
    for (const m of modules) result[m] = await getLabelDefs(req.db, req.tenantId!, m);
    res.json({ success: true, data: result });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post('/settings/labels', requirePermissions(PERMISSIONS.platform.viewSettings), async (req: Request, res: Response) => {
  try {
    const { module: mod, name, color = '#6366f1' } = req.body;
    if (!mod || !name) { res.status(400).json({ error: 'module and name are required' }); return; }
    const moduleKey = String(mod).toUpperCase();
    if (!(LABEL_MODULES as readonly string[]).includes(moduleKey)) {
      res.status(400).json({ error: `module must be one of ${LABEL_MODULES.join(', ')}` }); return;
    }

    const existing = await getLabelDefs(req.db, req.tenantId!, moduleKey);
    const newLabel: LabelDefinition = { id: Date.now().toString(36), name: String(name).trim(), color: String(color), module: moduleKey };
    const updated = [...existing, newLabel];

    const record = await req.db.platformGlobalSetting.findFirst({
      where: { key: `labels:definitions:${moduleKey}`, targetTenantId: req.tenantId! },
      select: { id: true },
    });
    if (record) {
      await req.db.platformGlobalSetting.update({ where: { id: record.id }, data: { currentValue: updated } });
    } else {
      await req.db.platformGlobalSetting.create({ data: { key: `labels:definitions:${moduleKey}`, name: `${moduleKey} Labels`, scope: 'TENANT', targetTenantId: req.tenantId!, currentValue: updated } });
    }
    res.status(201).json({ success: true, data: newLabel });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete('/settings/labels/:labelId', requirePermissions(PERMISSIONS.platform.viewSettings), async (req: Request, res: Response) => {
  try {
    const { module: mod } = req.query;
    if (!mod) { res.status(400).json({ error: 'module query param is required' }); return; }
    const moduleKey = String(mod).toUpperCase();
    const existing = await getLabelDefs(req.db, req.tenantId!, moduleKey);
    const updated  = existing.filter((l) => l.id !== req.params.labelId);
    const record   = await req.db.platformGlobalSetting.findFirst({ where: { key: `labels:definitions:${moduleKey}`, targetTenantId: req.tenantId! }, select: { id: true } });
    if (record) await req.db.platformGlobalSetting.update({ where: { id: record.id }, data: { currentValue: updated } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

export default router;




