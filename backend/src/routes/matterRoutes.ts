import { Router } from 'express';
import { MatterController } from '../controllers/MatterController';

const router = Router();

// Route for E-Filing automation
router.post('/sync-efiling', MatterController.syncEfiling);

// Route for Dashboard analytics
router.get('/analytics/stages', MatterController.getStageStats);

export default router;