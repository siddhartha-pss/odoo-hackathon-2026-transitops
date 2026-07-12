import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/maintenance
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, status, type, vehicleId, page = '1', limit = '10', sortBy = 'scheduledDate', sortOrder = 'desc' } = req.query;
    
    const where: any = {};
    if (search) where.description = { contains: String(search) };
    if (status) where.status = String(status);
    if (type) where.type = String(type);
    if (vehicleId) where.vehicleId = String(vehicleId);

    const skip = (Number(page) - 1) * Number(limit);
    const [records, total] = await Promise.all([
      prisma.maintenance.findMany({
        where, skip, take: Number(limit),
        orderBy: { [String(sortBy)]: sortOrder },
        include: { vehicle: { select: { id: true, registrationNumber: true, model: true } } },
      }),
      prisma.maintenance.count({ where }),
    ]);

    res.json({ data: records, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/maintenance/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const record = await prisma.maintenance.findUnique({
      where: { id: req.params.id },
      include: { vehicle: true },
    });
    if (!record) { res.status(404).json({ error: 'Maintenance record not found' }); return; }
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/maintenance
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { vehicleId, type, description, scheduledDate, garageName, cost, priority } = req.body;
    if (!vehicleId || !description || !scheduledDate) {
      res.status(400).json({ error: 'Vehicle, description, and scheduled date are required' }); return;
    }

    const record = await prisma.maintenance.create({
      data: {
        vehicleId, type: type || 'preventive', description,
        scheduledDate: new Date(scheduledDate), garageName,
        cost: Number(cost) || 0, priority: priority || 'medium',
      },
      include: { vehicle: true },
    });

    // If starting immediately, change vehicle status to in_shop
    if (req.body.startNow) {
      await prisma.$transaction([
        prisma.maintenance.update({ where: { id: record.id }, data: { status: 'in_progress' } }),
        prisma.vehicle.update({ where: { id: vehicleId }, data: { currentStatus: 'in_shop' } }),
      ]);
    }

    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'created', entityType: 'maintenance', entityId: record.id,
              details: JSON.stringify({ vehicleId, type, description }) },
    });

    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/maintenance/:id/start
router.patch('/:id/start', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const record = await prisma.maintenance.findUnique({ where: { id } });
    if (!record) { res.status(404).json({ error: 'Record not found' }); return; }

    const [updated] = await prisma.$transaction([
      prisma.maintenance.update({ where: { id }, data: { status: 'in_progress' }, include: { vehicle: true } }),
      prisma.vehicle.update({ where: { id: record.vehicleId }, data: { currentStatus: 'in_shop' } }),
    ]);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/maintenance/:id/complete
router.patch('/:id/complete', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { cost, partsReplaced, invoiceUrl } = req.body;
    const record = await prisma.maintenance.findUnique({ where: { id } });
    if (!record) { res.status(404).json({ error: 'Record not found' }); return; }

    const [updated] = await prisma.$transaction([
      prisma.maintenance.update({
        where: { id },
        data: {
          status: 'completed', completedDate: new Date(),
          ...(cost !== undefined && { cost: Number(cost) }),
          ...(partsReplaced && { partsReplaced }),
          ...(invoiceUrl && { invoiceUrl }),
        },
        include: { vehicle: true },
      }),
      prisma.vehicle.update({ where: { id: record.vehicleId }, data: { currentStatus: 'available' } }),
    ]);

    // Create expense for maintenance cost
    if (cost || record.cost) {
      await prisma.expense.create({
        data: {
          category: 'maintenance', amount: Number(cost) || record.cost,
          description: `Maintenance: ${record.description}`, vehicleId: record.vehicleId,
          date: new Date(),
        },
      });
    }

    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'completed', entityType: 'maintenance', entityId: id,
              details: JSON.stringify({ cost: cost || record.cost }) },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/maintenance/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data: any = { ...req.body };
    ['scheduledDate', 'completedDate'].forEach(f => { if (data[f]) data[f] = new Date(data[f]); });
    if (data.cost !== undefined) data.cost = Number(data.cost);

    const updated = await prisma.maintenance.update({ where: { id }, data, include: { vehicle: true } });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/maintenance/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.maintenance.delete({ where: { id: req.params.id } });
    res.json({ message: 'Maintenance record deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/maintenance/calendar/events
router.get('/calendar/events', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const records = await prisma.maintenance.findMany({
      where: { status: { in: ['scheduled', 'in_progress'] } },
      include: { vehicle: { select: { registrationNumber: true, model: true } } },
      orderBy: { scheduledDate: 'asc' },
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
