import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/audit
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { entityType, action, page = '1', limit = '20' } = req.query;
    const where: any = {};
    if (entityType) where.entityType = String(entityType);
    if (action) where.action = String(action);

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where, skip, take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ data: logs, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
