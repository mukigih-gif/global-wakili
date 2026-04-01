import { Router } from 'express';
import { AppError } from '../../utils/AppError';

const router = Router();

router.get('/:id', (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) throw new AppError('id is required', { statusCode: 400, code: 'INVALID_INPUT' });
    res.json({ id, email: `${id}@example.com`, name: 'Dev User' });
  } catch (err) {
    next(err);
  }
});

router.post('/', (req, res, next) => {
  try {
    const { email } = req.body ?? {};
    if (!email) throw new AppError('email is required', { statusCode: 400, code: 'INVALID_INPUT' });
    res.status(201).json({ id: `user_${Date.now()}`, email, name: req.body.name ?? null });
  } catch (err) {
    next(err);
  }
});

export default router;