import { Router, type Request, type Response, type NextFunction, type RequestHandler } from 'express';

import * as financeController from './finance.controller';

const router = Router();

type ControllerMap = Record<string, unknown>;

function controllerHandler(name: string): RequestHandler {
  const handler = (financeController as ControllerMap)[name];

  if (typeof handler === 'function') {
    return handler as RequestHandler;
  }

  return (_req: Request, res: Response) => {
    res.status(501).json({
      success: false,
      module: 'finance',
      code: 'FINANCE_HANDLER_NOT_IMPLEMENTED',
      message: `Finance handler "${name}" is not implemented or not exported from finance.controller.ts`,
    });
  };
}

function asyncBoundary(handler: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'finance',
    status: 'available',
  });
});

router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'finance',
    message: 'Finance module route mounted successfully',
  });
});

/**
 * Accounts / COA
 */
router.get('/accounts', asyncBoundary(controllerHandler('listAccounts')));
router.post('/accounts', asyncBoundary(controllerHandler('createAccount')));
router.get('/accounts/:id', asyncBoundary(controllerHandler('getAccount')));
router.patch('/accounts/:id', asyncBoundary(controllerHandler('updateAccount')));

/**
 * Journals
 */
router.get('/journals', asyncBoundary(controllerHandler('listJournals')));
router.post('/journals', asyncBoundary(controllerHandler('postJournal')));
router.get('/journals/:id', asyncBoundary(controllerHandler('getJournal')));

/**
 * Reports
 */
router.get('/trial-balance', asyncBoundary(controllerHandler('getTrialBalance')));
router.get('/balance-sheet', asyncBoundary(controllerHandler('getBalanceSheet')));
router.get('/cashflow', asyncBoundary(controllerHandler('getCashflowStatement')));
router.get('/statements', asyncBoundary(controllerHandler('getStatement')));
router.get('/dashboard', asyncBoundary(controllerHandler('getFinanceDashboard')));

/**
 * Period close / exports
 */
router.post('/period-close', asyncBoundary(controllerHandler('closePeriod')));
router.post('/reports/export', asyncBoundary(controllerHandler('exportReport')));

router.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    module: 'finance',
    error: 'Finance route not found',
    code: 'FINANCE_ROUTE_NOT_FOUND',
  });
});

export default router;