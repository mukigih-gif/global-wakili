import { Router } from 'express';
import { AppError } from '../../utils/AppError';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ data: [], meta: { total: 0 } });
});

router.post('/', (req, res, next) => {
  try {
    const { name, targetAmount } = req.body ?? {};
    if (!name || targetAmount == null) throw new AppError('name and targetAmount are required', { statusCode: 400, code: 'INVALID_INPUT' });
    res.status(201).json({
      id: `plan_${Date.now()}`,
      name,
      targetAmount,
      currentAmount: 0,
      currency: req.body.currency ?? 'USD'
    });
  } catch (err) {
    next(err);
  }
});

export default router;