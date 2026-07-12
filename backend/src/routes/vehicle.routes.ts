import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/vehicles - List all vehicles with search, filter, pagination
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, status, type, manufacturer, page = '1', limit = '10', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const where: any = {};
    if (search) {
      where.OR = [
        { registrationNumber: { contains: String(search) } },
        { model: { contains: String(search) } },
        { manufacturer: { contains: String(search) } },
      ];
    }
    if (status) where.currentStatus = String(status);
    if (type) where.type = String(type);
    if (manufacturer) where.manufacturer = String(manufacturer);

    const skip = (Number(page) - 1) * Number(limit);
    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [String(sortBy)]: sortOrder },
        include: {
          _count: { select: { trips: true, maintenance: true, fuelLogs: true } },
        },
      }),
      prisma.vehicle.count({ where }),
    ]);

    res.json({
      data: vehicles,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/vehicles/:id - Get single vehicle
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      include: {
        trips: { orderBy: { createdAt: 'desc' }, take: 10, include: { driver: { select: { name: true } } } },
        maintenance: { orderBy: { scheduledDate: 'desc' }, take: 10 },
        fuelLogs: { orderBy: { date: 'desc' }, take: 10 },
        documents: true,
        expenses: { orderBy: { date: 'desc' }, take: 10 },
        _count: { select: { trips: true, maintenance: true, fuelLogs: true, expenses: true } },
      },
    });

    if (!vehicle) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }

    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/vehicles - Create vehicle
router.post('/', authenticate, requireRole('fleet_manager'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { registrationNumber, model, manufacturer, type, capacity, currentOdometer,
            acquisitionCost, acquisitionDate, insuranceExpiry, fitnessExpiry, rcExpiry, 
            pollutionExpiry, imageUrl } = req.body;

    // Validate required fields
    if (!registrationNumber || !model || !manufacturer) {
      res.status(400).json({ error: 'Registration number, model, and manufacturer are required' });
      return;
    }

    // Check unique registration number
    const existing = await prisma.vehicle.findUnique({ where: { registrationNumber } });
    if (existing) {
      res.status(409).json({ error: 'Vehicle with this registration number already exists' });
      return;
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        registrationNumber,
        model,
        manufacturer,
        type: type || 'Truck',
        capacity: Number(capacity) || 0,
        currentOdometer: Number(currentOdometer) || 0,
        acquisitionCost: Number(acquisitionCost) || 0,
        acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : new Date(),
        insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
        fitnessExpiry: fitnessExpiry ? new Date(fitnessExpiry) : null,
        rcExpiry: rcExpiry ? new Date(rcExpiry) : null,
        pollutionExpiry: pollutionExpiry ? new Date(pollutionExpiry) : null,
        imageUrl,
        qrCode: `QR-${registrationNumber}-${Date.now()}`,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'created',
        entityType: 'vehicle',
        entityId: vehicle.id,
        details: JSON.stringify({ registrationNumber }),
      },
    });

    res.status(201).json(vehicle);
  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/vehicles/:id - Update vehicle
router.put('/:id', authenticate, requireRole('fleet_manager'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.vehicle.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }

    // Check unique registration number if changing
    if (req.body.registrationNumber && req.body.registrationNumber !== existing.registrationNumber) {
      const dup = await prisma.vehicle.findUnique({ where: { registrationNumber: req.body.registrationNumber } });
      if (dup) {
        res.status(409).json({ error: 'Registration number already in use' });
        return;
      }
    }

    const data: any = { ...req.body };
    // Convert date strings
    ['insuranceExpiry', 'fitnessExpiry', 'rcExpiry', 'pollutionExpiry', 'acquisitionDate'].forEach(field => {
      if (data[field]) data[field] = new Date(data[field]);
    });
    // Convert numbers
    ['capacity', 'currentOdometer', 'acquisitionCost'].forEach(field => {
      if (data[field] !== undefined) data[field] = Number(data[field]);
    });

    const vehicle = await prisma.vehicle.update({ where: { id }, data });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'updated',
        entityType: 'vehicle',
        entityId: id,
        details: JSON.stringify({ fields: Object.keys(req.body) }),
      },
    });

    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/vehicles/:id
router.delete('/:id', authenticate, requireRole('fleet_manager'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }

    // Check if vehicle has active trips
    const activeTrips = await prisma.trip.count({
      where: { vehicleId: id, status: { in: ['dispatched', 'in_progress'] } },
    });
    if (activeTrips > 0) {
      res.status(400).json({ error: 'Cannot delete vehicle with active trips' });
      return;
    }

    await prisma.vehicle.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'deleted',
        entityType: 'vehicle',
        entityId: id,
        details: JSON.stringify({ registrationNumber: vehicle.registrationNumber }),
      },
    });

    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/vehicles/:id/status
router.patch('/:id/status', authenticate, requireRole('fleet_manager'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'available', 'in_shop', 'retired'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: { currentStatus: status },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'status_changed',
        entityType: 'vehicle',
        entityId: id,
        details: JSON.stringify({ newStatus: status }),
      },
    });

    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
