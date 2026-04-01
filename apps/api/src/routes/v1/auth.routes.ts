import { Router } from 'express';
import { AppError } from '../../utils/AppError';

const router = Router();

router.post('/login', (req, res, next) => {
  try {
    const { identifier } = req.body ?? {};
    if (!identifier) throw new AppError('identifier is required', { statusCode: 400, code: 'INVALID_INPUT' });
    const token = `dev-token:${identifier}`;
    res.json({ token, tokenType: 'Bearer' });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (_req, res) => {
  res.status(204).send();
});

export default router;