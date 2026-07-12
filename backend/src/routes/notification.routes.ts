import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/notifications
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { unreadOnly } = req.query;
    const where: any = { userId: req.user!.id };
    if (unreadOnly === 'true') where.read = false;

    const notifications = await prisma.notification.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 50,
    });

    const unreadCount = await prisma.notification.count({ where: { userId: req.user!.id, read: false } });

    res.json({ data: notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } });
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user!.id, read: false }, data: { read: true } });
    res.json({ message: 'All marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
