import { Router } from 'express';
import db from '../lib/prisma';

const router = Router();

// GET /api/staff - Fetch the 11-person team
router.get('/', async (req, res) => {
  try {
    const staff = await db.user.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch world-class team" });
  }
});

export default router;