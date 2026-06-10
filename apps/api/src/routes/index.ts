// apps/api/src/routes/index.ts

import { Router } from 'express';
import bcrypt from 'bcryptjs';

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

import type { Request, Response, NextFunction } from 'express';
import { requirePermissions } from '../middleware/rbac';
import { PERMISSIONS } from '../config/permissions';
import { logAdminAction } from '../utils/audit-logger';
import { AuditAction, AuditSeverity } from '../types/audit';

// ── Users (listing for dropdowns + self-update) ──────────────────────────────

router.get('/users', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? 100)) || 100, 200);
    const users = await req.db.user.findMany({
      where: { tenantId: req.tenantId, deletedAt: null },
      select: { id: true, name: true, email: true, tenantRole: true, systemRole: true, status: true },
      orderBy: { name: 'asc' },
      take: limit,
    });
    res.json({ data: users.map((u) => ({ ...u, role: u.tenantRole ?? u.systemRole })) });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── Global search — fans out across matters, clients, tasks (tenant-scoped) ────
router.get('/search', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q ?? '').trim();
    const limit = Math.min(parseInt(String(req.query.limit ?? 10)) || 10, 25);
    if (!q) { res.json({ data: [] }); return; }

    const ci = { contains: q, mode: 'insensitive' as const };
    const per = Math.max(2, Math.ceil(limit / 3));

    const [matters, clients, tasks] = await Promise.all([
      req.db.matter.findMany({
        where: { tenantId: req.tenantId, OR: [{ title: ci }, { matterCode: ci }, { caseNumber: ci }] },
        select: { id: true, title: true, matterCode: true },
        take: per,
      }).catch(() => []),
      req.db.client.findMany({
        where: { tenantId: req.tenantId, OR: [{ name: ci }, { clientCode: ci }, { kraPin: ci }] },
        select: { id: true, name: true, clientCode: true },
        take: per,
      }).catch(() => []),
      req.db.matterTask.findMany({
        where: { tenantId: req.tenantId, title: ci },
        select: { id: true, title: true },
        take: per,
      }).catch(() => []),
    ]);

    const data = [
      ...(matters as any[]).map((m) => ({
        type: 'matter', id: m.id, label: m.title,
        reference: m.matterCode ?? undefined, href: `/app/matters/${m.id}`,
      })),
      ...(clients as any[]).map((c) => ({
        type: 'client', id: c.id, label: c.name,
        reference: c.clientCode ?? undefined, href: `/app/clients/${c.id}`,
      })),
      ...(tasks as any[]).map((t) => ({
        type: 'task', id: t.id, label: t.title, href: `/app/tasks/${t.id}`,
      })),
    ].slice(0, limit);

    res.json({ data });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.patch('/users/me', async (req: Request, res: Response) => {
  try {
    const { name, phone } = req.body;
    const userId = req.user?.sub;
    if (!userId) { res.status(401).json({ error: 'Not authenticated' }); return; }
    const updated = await req.db.user.update({
      where: { id: userId },
      data: {
        ...(name  ? { name:  name.trim()  } : {}),
        ...(phone ? { phone: phone.trim() } : {}),
      },
      select: { id: true, name: true, email: true, phone: true },
    });
    res.json({ success: true, data: updated });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── Roles (tenant-scoped, for user-management dropdowns) ─────────────────────
router.get('/roles', requirePermissions(PERMISSIONS.admin.manageUsers), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roles = await req.db.role.findMany({
      where: { tenantId: req.tenantId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: roles });
  } catch (e) { next(e); }
});

// ── Create user — "Invite User" (Option A: admin-set temporary password, F-21) ──
router.post('/users', requirePermissions(PERMISSIONS.admin.manageUsers), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, roleName } = (req.body ?? {}) as {
      name?: string; email?: string; password?: string; roleName?: string;
    };
    if (!name?.trim() || !email?.trim() || !password || !roleName?.trim()) {
      res.status(400).json({ success: false, error: 'name, email, password and roleName are required' });
      return;
    }
    if (!req.tenantId) { res.status(400).json({ success: false, error: 'Tenant context required' }); return; }
    const normEmail = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normEmail)) {
      res.status(400).json({ success: false, error: 'Invalid email format' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
      return;
    }

    const existing = await req.db.user.findFirst({
      where: { tenantId: req.tenantId, email: normEmail }, select: { id: true },
    });
    if (existing) { res.status(400).json({ success: false, error: 'User with this email already exists' }); return; }

    const role = await req.db.role.findFirst({
      where: { tenantId: req.tenantId, name: roleName.trim() }, select: { id: true, name: true },
    });
    if (!role) { res.status(400).json({ success: false, error: `Role '${roleName}' not found` }); return; }

    const passwordHash = await bcrypt.hash(password, 12);
    const created = await req.db.user.create({
      data: {
        tenantId: req.tenantId,
        name: name.trim(),
        email: normEmail,
        passwordHash,
        status: 'ACTIVE',
        tenantRole: 'ADVOCATE',
        roles: { connect: [{ id: role.id }] },
      },
      select: { id: true, name: true, email: true },
    });

    // Audit (best-effort — never blocks user creation).
    void logAdminAction({
      actor: req.user ? { id: req.user.sub, role: req.user.role ?? 'UNKNOWN' } : { id: 'system', role: 'SYSTEM' },
      tenantId: req.tenantId,
      action: AuditAction.CREATE,
      severity: AuditSeverity.INFO,
      entityType: 'User',
      entityId: created.id,
      req,
      requestId: req.id,
      after: { email: created.email, roleName: role.name },
    }).catch(() => {});

    res.status(201).json({ success: true, data: { id: created.id, name: created.name, email: created.email, role: role.name } });
  } catch (e) { next(e); }
});

// ── Time Capture / WIP Entries ────────────────────────────────────────────────

router.get('/time-capture/wip', requirePermissions(PERMISSIONS.matter.createTimeEntry), async (req: Request, res: Response) => {
  try {
    const { status, source, limit = '30', skip = '0' } = req.query as Record<string, string>;
    const events = await req.db.passiveCaptureEvent.findMany({
      where: {
        tenantId: req.tenantId,
        userId:   req.user?.sub,
        ...(status ? { status: status === 'PENDING_APPROVAL' ? 'PENDING_REVIEW' : status } : {}),
        ...(source ? { activityType: source } : {}),
      },
      include: {
        matter: { select: { id: true, title: true, matterCode: true } },
        user:   { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit) || 30, 100),
      skip: parseInt(skip) || 0,
    });
    const shaped = events.map((e: any) => ({
      ...e,
      description: e.suggestedDescription ?? e.activityType,
      source:      e.activityType,
      status:      e.status === 'PENDING_REVIEW' ? 'PENDING_APPROVAL' : e.status,
      capturedAt:  e.activityAt,
      approvedBy:  null,
    }));
    res.json({ data: shaped });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post('/time-capture/wip', requirePermissions(PERMISSIONS.matter.createTimeEntry), async (req: Request, res: Response) => {
  try {
    const { source = 'MANUAL', description, durationMinutes, matterId } = req.body;
    const event = await req.db.passiveCaptureEvent.create({
      data: {
        tenantId:            req.tenantId!,
        userId:              req.user?.sub!,
        matterId:            matterId || null,
        activityType:        source,
        activitySource:      `manual:${Date.now()}`,
        activityAt:          new Date(),
        durationMinutes:     parseInt(durationMinutes) || 0,
        suggestedDescription: description,
        status:              'PENDING_REVIEW',
      },
    });
    res.status(201).json({ success: true, data: event });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.patch('/time-capture/wip/:id/approve', requirePermissions(PERMISSIONS.matter.approveTimeEntry), async (req: Request, res: Response) => {
  try {
    await req.db.passiveCaptureEvent.updateMany({
      where: { tenantId: req.tenantId, id: req.params.id, status: 'PENDING_REVIEW' },
      data:  { status: 'APPROVED' },
    });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.patch('/time-capture/wip/:id/reject', requirePermissions(PERMISSIONS.matter.approveTimeEntry), async (req: Request, res: Response) => {
  try {
    await req.db.passiveCaptureEvent.updateMany({
      where: { tenantId: req.tenantId, id: req.params.id, status: 'PENDING_REVIEW' },
      data:  { status: 'DISCARDED' },
    });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

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
    res.json({ data: result });
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




