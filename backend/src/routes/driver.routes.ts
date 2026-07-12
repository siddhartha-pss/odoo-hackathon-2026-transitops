import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/drivers
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, status, page = '1', limit = '10', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: String(search) } },
        { licenseNumber: { contains: String(search) } },
        { phone: { contains: String(search) } },
      ];
    }
    if (status) where.currentStatus = String(status);

    const skip = (Number(page) - 1) * Number(limit);
    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where, skip, take: Number(limit),
        orderBy: { [String(sortBy)]: sortOrder },
        include: { _count: { select: { trips: true } } },
      }),
      prisma.driver.count({ where }),
    ]);

    res.json({
      data: drivers,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/drivers/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.params.id },
      include: {
        trips: { orderBy: { createdAt: 'desc' }, take: 10, include: { vehicle: { select: { registrationNumber: true, model: true } } } },
        documents: true,
        _count: { select: { trips: true } },
      },
    });
    if (!driver) { res.status(404).json({ error: 'Driver not found' }); return; }
    res.json(driver);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/drivers
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, phone, emergencyContact, photo, licenseNumber, licenseCategory,
            licenseExpiry, medicalCertExpiry } = req.body;

    if (!name || !phone || !licenseNumber || !licenseExpiry) {
      res.status(400).json({ error: 'Name, phone, license number, and license expiry are required' });
      return;
    }

    const existing = await prisma.driver.findUnique({ where: { licenseNumber } });
    if (existing) {
      res.status(409).json({ error: 'Driver with this license number already exists' });
      return;
    }

    const driver = await prisma.driver.create({
      data: {
        name, phone, emergencyContact, photo, licenseNumber,
        licenseCategory: licenseCategory || 'HMV',
        licenseExpiry: new Date(licenseExpiry),
        medicalCertExpiry: medicalCertExpiry ? new Date(medicalCertExpiry) : null,
      },
    });

    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'created', entityType: 'driver', entityId: driver.id,
              details: JSON.stringify({ name, licenseNumber }) },
    });

    res.status(201).json(driver);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/drivers/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.driver.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ error: 'Driver not found' }); return; }

    if (req.body.licenseNumber && req.body.licenseNumber !== existing.licenseNumber) {
      const dup = await prisma.driver.findUnique({ where: { licenseNumber: req.body.licenseNumber } });
      if (dup) { res.status(409).json({ error: 'License number already in use' }); return; }
    }

    const data: any = { ...req.body };
    ['licenseExpiry', 'medicalCertExpiry'].forEach(f => { if (data[f]) data[f] = new Date(data[f]); });
    ['safetyScore', 'performanceRating', 'totalTrips', 'totalDistance'].forEach(f => {
      if (data[f] !== undefined) data[f] = Number(data[f]);
    });

    const driver = await prisma.driver.update({ where: { id }, data });

    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'updated', entityType: 'driver', entityId: id,
              details: JSON.stringify({ fields: Object.keys(req.body) }) },
    });

    res.json(driver);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/drivers/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const driver = await prisma.driver.findUnique({ where: { id } });
    if (!driver) { res.status(404).json({ error: 'Driver not found' }); return; }

    const activeTrips = await prisma.trip.count({
      where: { driverId: id, status: { in: ['dispatched', 'in_progress'] } },
    });
    if (activeTrips > 0) { res.status(400).json({ error: 'Cannot delete driver with active trips' }); return; }

    await prisma.driver.delete({ where: { id } });

    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'deleted', entityType: 'driver', entityId: id,
              details: JSON.stringify({ name: driver.name }) },
    });

    res.json({ message: 'Driver deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/drivers/available/list
router.get('/available/list', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const drivers = await prisma.driver.findMany({
      where: {
        currentStatus: 'available',
        licenseExpiry: { gt: new Date() },
      },
      select: { id: true, name: true, licenseNumber: true, safetyScore: true, performanceRating: true },
    });
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
