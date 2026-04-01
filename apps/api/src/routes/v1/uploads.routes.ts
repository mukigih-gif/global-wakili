import { Router } from 'express';
import { AppError } from '../../utils/AppError';

const router = Router();

router.post('/init', (req, res, next) => {
  try {
    const { filename, totalSize } = req.body ?? {};
    if (!filename || totalSize == null) throw new AppError('filename and totalSize are required', { statusCode: 400, code: 'INVALID_INPUT' });
    const sessionId = `upload_${Date.now()}`;
    res.status(201).json({ sessionId, uploadUrl: `/api/v1/uploads/${sessionId}/chunk` });
  } catch (err) {
    next(err);
  }
});

router.put('/:sessionId/chunk', (_req, res) => {
  res.status(204).send();
});

router.post('/:sessionId/complete', (_req, res) => {
  res.status(200).json({ status: 'completed' });
});

export default router;