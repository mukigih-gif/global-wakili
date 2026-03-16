import { Router } from 'express';
import { CourtController } from '../controllers/CourtController';

const router = Router();

router.post('/schedule', CourtController.schedule);
router.get('/upcoming', CourtController.getUpcoming);

export default router;