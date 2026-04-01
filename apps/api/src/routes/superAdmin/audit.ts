import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { tenantId, actorId, action, limit = 100 } = req.query;
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (actorId) where.actorId = actorId;
    if (action) where.action = action;
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit)
    });
    res.json({ data: logs });
  } catch (err) {
    next(err);
  }
});

export default router;