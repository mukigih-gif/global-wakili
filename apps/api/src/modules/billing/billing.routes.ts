import { Router, type Request, type Response } from 'express';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'billing',
    status: 'available',
  });
});

router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'billing',
    message: 'Billing module route mounted successfully',
  });
});

router.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    module: 'billing',
    error: 'Billing route not found',
    code: 'BILLING_ROUTE_NOT_FOUND',
  });
});

export default router;