// apps/api/src/modules/payroll/payroll.routes.ts

import { Router, type Request, type Response } from 'express';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'payroll',
    status: 'mounted',
    service: 'global-wakili-api',
    lifecycle: 'pending-final-module-generation',
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'payroll',
    status: 'available',
    message:
      'Payroll route is mounted. Full payroll workflows are pending final module generation.',
    pendingFiles: [
      'PayrollService.ts',
      'PayrollBatchService.ts',
      'PayrollApprovalService.ts',
      'PayslipService.ts',
      'StatutoryService.ts',
      'LeaveService.ts',
      'BenefitsService.ts',
      'CommissionService.ts',
      'P9ReportService.ts',
      'P10ReportService.ts',
      'payroll.controller.ts',
      'payroll.dashboard.ts',
    ],
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

router.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    module: 'payroll',
    error: 'Payroll route not found',
    code: 'PAYROLL_ROUTE_NOT_FOUND',
    path: req.originalUrl,
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

export default router;