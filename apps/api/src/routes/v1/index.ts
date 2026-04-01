import { Router } from 'express';
import authRouter from './auth.routes';
import usersRouter from './users.routes';
import savingsRouter from './savings.routes';
import uploadsRouter from './uploads.routes';
import adminRouter from './admin.routes';

const router = Router();

// Health and readiness endpoints
router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Mount sub-routers (each file must export a Router)
router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/savings', savingsRouter);
router.use('/uploads', uploadsRouter);
router.use('/admin', adminRouter);

export default router;