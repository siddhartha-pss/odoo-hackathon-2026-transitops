import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Helper to generate trip number
const generateTripNumber = (): string => {
  const prefix = 'TRP';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

// GET /api/trips
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, status, page = '1', limit = '10', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const where: any = {};
    if (search) {
      where.OR = [
        { tripNumber: { contains: String(search) } },
        { pickup: { contains: String(search) } },
        { destination: { contains: String(search) } },
      ];
    }
    if (status) where.status = String(status);

    const skip = (Number(page) - 1) * Number(limit);
    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where, skip, take: Number(limit),
        orderBy: { [String(sortBy)]: sortOrder },
        include: {
          vehicle: { select: { id: true, registrationNumber: true, model: true, type: true } },
          driver: { select: { id: true, name: true, phone: true, photo: true } },
        },
      }),
      prisma.trip.count({ where }),
    ]);

    res.json({
      data: trips,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/trips/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: {
        vehicle: true,
        driver: true,
        fuelLogs: { orderBy: { date: 'desc' } },
        expenses: { orderBy: { date: 'desc' } },
      },
    });
    if (!trip) { res.status(404).json({ error: 'Trip not found' }); return; }
    res.json(trip);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/trips - Create trip with full business rule enforcement
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { vehicleId, driverId, pickup, destination, cargoWeight, cargoType,
            estimatedDistance, estimatedFuel, estimatedCost, scheduledAt, revenue } = req.body;

    if (!vehicleId || !driverId || !pickup || !destination) {
      res.status(400).json({ error: 'Vehicle, driver, pickup, and destination are required' });
      return;
    }

    // Business Rule: Check vehicle availability
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) { res.status(404).json({ error: 'Vehicle not found' }); return; }
    if (vehicle.currentStatus === 'in_shop') {
      res.status(400).json({ error: 'Vehicle is currently in shop and cannot be assigned' }); return;
    }
    if (vehicle.currentStatus === 'retired') {
      res.status(400).json({ error: 'Retired vehicle cannot be assigned' }); return;
    }

    // Business Rule: Check if vehicle is already on a trip
    const vehicleOnTrip = await prisma.trip.count({
      where: { vehicleId, status: { in: ['dispatched', 'in_progress'] } },
    });
    if (vehicleOnTrip > 0) {
      res.status(400).json({ error: 'Vehicle is already assigned to an active trip' }); return;
    }

    // Business Rule: Check driver availability
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) { res.status(404).json({ error: 'Driver not found' }); return; }
    if (driver.currentStatus === 'suspended') {
      res.status(400).json({ error: 'Suspended driver cannot drive' }); return;
    }
    if (new Date(driver.licenseExpiry) < new Date()) {
      res.status(400).json({ error: 'Driver license has expired' }); return;
    }

    // Business Rule: Check if driver is already on a trip
    const driverOnTrip = await prisma.trip.count({
      where: { driverId, status: { in: ['dispatched', 'in_progress'] } },
    });
    if (driverOnTrip > 0) {
      res.status(400).json({ error: 'Driver is already assigned to an active trip' }); return;
    }

    // Business Rule: Cargo cannot exceed capacity
    if (cargoWeight && Number(cargoWeight) > vehicle.capacity) {
      res.status(400).json({ error: `Cargo weight (${cargoWeight}) exceeds vehicle capacity (${vehicle.capacity})` }); return;
    }

    const trip = await prisma.trip.create({
      data: {
        tripNumber: generateTripNumber(),
        vehicleId, driverId, pickup, destination,
        cargoWeight: Number(cargoWeight) || 0,
        cargoType: cargoType || 'General',
        estimatedDistance: Number(estimatedDistance) || 0,
        estimatedFuel: Number(estimatedFuel) || 0,
        estimatedCost: Number(estimatedCost) || 0,
        revenue: Number(revenue) || 0,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: 'draft',
      },
      include: { vehicle: true, driver: true },
    });

    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'created', entityType: 'trip', entityId: trip.id,
              details: JSON.stringify({ tripNumber: trip.tripNumber, pickup, destination }) },
    });

    res.status(201).json(trip);
  } catch (error) {
    console.error('Error creating trip:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/trips/:id/dispatch
router.patch('/:id/dispatch', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const trip = await prisma.trip.findUnique({ where: { id }, include: { vehicle: true, driver: true } });
    if (!trip) { res.status(404).json({ error: 'Trip not found' }); return; }
    if (trip.status !== 'draft') { res.status(400).json({ error: 'Only draft trips can be dispatched' }); return; }

    // Update trip, vehicle, and driver status atomically
    const [updatedTrip] = await prisma.$transaction([
      prisma.trip.update({
        where: { id },
        data: { status: 'dispatched', dispatchedAt: new Date() },
        include: { vehicle: true, driver: true },
      }),
      prisma.vehicle.update({ where: { id: trip.vehicleId }, data: { currentStatus: 'active' } }),
      prisma.driver.update({ where: { id: trip.driverId }, data: { currentStatus: 'on_trip' } }),
    ]);

    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'dispatched', entityType: 'trip', entityId: id,
              details: JSON.stringify({ tripNumber: trip.tripNumber }) },
    });

    res.json(updatedTrip);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/trips/:id/start
router.patch('/:id/start', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) { res.status(404).json({ error: 'Trip not found' }); return; }
    if (trip.status !== 'dispatched') { res.status(400).json({ error: 'Only dispatched trips can be started' }); return; }

    const updatedTrip = await prisma.trip.update({
      where: { id },
      data: { status: 'in_progress', startedAt: new Date() },
      include: { vehicle: true, driver: true },
    });

    res.json(updatedTrip);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/trips/:id/complete
router.patch('/:id/complete', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { actualDistance, actualFuel, actualCost } = req.body;
    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) { res.status(404).json({ error: 'Trip not found' }); return; }
    if (!['dispatched', 'in_progress'].includes(trip.status)) {
      res.status(400).json({ error: 'Only dispatched or in-progress trips can be completed' }); return;
    }

    const [updatedTrip] = await prisma.$transaction([
      prisma.trip.update({
        where: { id },
        data: {
          status: 'completed', completedAt: new Date(),
          actualDistance: actualDistance ? Number(actualDistance) : trip.estimatedDistance,
          actualFuel: actualFuel ? Number(actualFuel) : trip.estimatedFuel,
          actualCost: actualCost ? Number(actualCost) : trip.estimatedCost,
        },
        include: { vehicle: true, driver: true },
      }),
      prisma.vehicle.update({ where: { id: trip.vehicleId }, data: { currentStatus: 'available' } }),
      prisma.driver.update({
        where: { id: trip.driverId },
        data: {
          currentStatus: 'available',
          totalTrips: { increment: 1 },
          totalDistance: { increment: actualDistance ? Number(actualDistance) : trip.estimatedDistance },
        },
      }),
    ]);

    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'completed', entityType: 'trip', entityId: id,
              details: JSON.stringify({ tripNumber: trip.tripNumber }) },
    });

    res.json(updatedTrip);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/trips/:id/cancel
router.patch('/:id/cancel', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) { res.status(404).json({ error: 'Trip not found' }); return; }
    if (trip.status === 'completed' || trip.status === 'cancelled') {
      res.status(400).json({ error: 'Trip is already completed or cancelled' }); return;
    }

    const [updatedTrip] = await prisma.$transaction([
      prisma.trip.update({
        where: { id },
        data: { status: 'cancelled', cancelledAt: new Date(), cancelReason: reason },
        include: { vehicle: true, driver: true },
      }),
      prisma.vehicle.update({ where: { id: trip.vehicleId }, data: { currentStatus: 'available' } }),
      prisma.driver.update({ where: { id: trip.driverId }, data: { currentStatus: 'available' } }),
    ]);

    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'cancelled', entityType: 'trip', entityId: id,
              details: JSON.stringify({ tripNumber: trip.tripNumber, reason }) },
    });

    res.json(updatedTrip);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/trips/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) { res.status(404).json({ error: 'Trip not found' }); return; }
    if (trip.status !== 'draft') { res.status(400).json({ error: 'Only draft trips can be edited' }); return; }

    const data: any = { ...req.body };
    ['scheduledAt'].forEach(f => { if (data[f]) data[f] = new Date(data[f]); });
    ['cargoWeight', 'estimatedDistance', 'estimatedFuel', 'estimatedCost', 'revenue'].forEach(f => {
      if (data[f] !== undefined) data[f] = Number(data[f]);
    });
    delete data.status; // Don't allow direct status changes

    const updated = await prisma.trip.update({ where: { id }, data, include: { vehicle: true, driver: true } });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
