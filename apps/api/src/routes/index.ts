// apps/api/src/routes/index.ts

import { Router } from 'express';

import financeRoutes from '../modules/finance/finance.routes';
import trustRoutes from '../modules/trust/trust.routes';
import billingRoutes from '../modules/billing/billing.routes';
import paymentRoutes from '../modules/payments/payment.routes';
import payrollRoutes from '../modules/payroll/payroll.routes';
import hrRoutes from '../modules/hr/hr.routes';
import procurementRoutes from '../modules/procurement/procurement.routes';
import clientRoutes from '../modules/client/client.routes';
import matterRoutes from '../modules/matter/matter.routes';
import documentRoutes from '../modules/document/document.routes';
import calendarRoutes from '../modules/calendar/calendar.routes';
import taskRoutes from '../modules/task/task.routes';
import integrationRoutes from '../modules/integrations/integrations.routes';
import dashboardRoutes from '../modules/dashboards/dashboard.routes';
import receptionRoutes from '../modules/reception/reception.routes';
import courtRoutes from '../modules/court/court.routes';
import aiRoutes from '../modules/ai/ai.routes';
import complianceRoutes from '../modules/compliance/compliance.routes';

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
router.use('/integrations', integrationRoutes);
router.use('/dashboards', dashboardRoutes);
router.use('/ai', aiRoutes);

export default router;