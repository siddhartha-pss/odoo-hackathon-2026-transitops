import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/fuel
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { vehicleId, page = '1', limit = '10', sortBy = 'date', sortOrder = 'desc' } = req.query;
    
    const where: any = {};
    if (vehicleId) where.vehicleId = String(vehicleId);

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      prisma.fuelLog.findMany({
        where, skip, take: Number(limit),
        orderBy: { [String(sortBy)]: sortOrder },
        include: {
          vehicle: { select: { id: true, registrationNumber: true, model: true } },
          driver: { select: { id: true, name: true } },
        },
      }),
      prisma.fuelLog.count({ where }),
    ]);

    res.json({ data: logs, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/fuel
router.post('/', authenticate, requireRole('fleet_manager', 'financial_analyst', 'dispatcher'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { vehicleId, driverId, tripId, quantity, costPerUnit, odometer, fuelType, station, date } = req.body;
    if (!vehicleId || !quantity || !costPerUnit || !odometer) {
      res.status(400).json({ error: 'Vehicle, quantity, cost per unit, and odometer are required' }); return;
    }

    const log = await prisma.fuelLog.create({
      data: {
        vehicleId, driverId, tripId,
        date: date ? new Date(date) : new Date(),
        quantity: Number(quantity), costPerUnit: Number(costPerUnit),
        totalCost: Number(quantity) * Number(costPerUnit),
        odometer: Number(odometer), fuelType: fuelType || 'Diesel', station,
      },
      include: { vehicle: true, driver: true },
    });

    // Update vehicle odometer
    await prisma.vehicle.update({ where: { id: vehicleId }, data: { currentOdometer: Number(odometer) } });

    // Create expense
    await prisma.expense.create({
      data: {
        category: 'fuel', amount: log.totalCost,
        description: `Fuel: ${quantity}L at ₹${costPerUnit}/L`,
        vehicleId, date: log.date,
      },
    });

    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'created', entityType: 'fuel_log', entityId: log.id,
              details: JSON.stringify({ vehicleId, quantity, totalCost: log.totalCost }) },
    });

    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/fuel/analytics
router.get('/analytics/summary', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const logs = await prisma.fuelLog.findMany({
      include: { vehicle: { select: { registrationNumber: true, model: true } } },
      orderBy: { date: 'desc' },
    });

    const totalCost = logs.reduce((sum, l) => sum + l.totalCost, 0);
    const totalQuantity = logs.reduce((sum, l) => sum + l.quantity, 0);
    const avgCostPerUnit = logs.length > 0 ? totalCost / totalQuantity : 0;

    // Group by vehicle
    const byVehicle: Record<string, { totalCost: number; totalQuantity: number; count: number; registration: string }> = {};
    logs.forEach(l => {
      if (!byVehicle[l.vehicleId]) {
        byVehicle[l.vehicleId] = { totalCost: 0, totalQuantity: 0, count: 0, registration: l.vehicle.registrationNumber };
      }
      byVehicle[l.vehicleId].totalCost += l.totalCost;
      byVehicle[l.vehicleId].totalQuantity += l.quantity;
      byVehicle[l.vehicleId].count++;
    });

    // Monthly trends
    const monthlyTrends: Record<string, { cost: number; quantity: number }> = {};
    logs.forEach(l => {
      const month = new Date(l.date).toISOString().substring(0, 7);
      if (!monthlyTrends[month]) monthlyTrends[month] = { cost: 0, quantity: 0 };
      monthlyTrends[month].cost += l.totalCost;
      monthlyTrends[month].quantity += l.quantity;
    });

    res.json({
      totalCost, totalQuantity, avgCostPerUnit,
      byVehicle: Object.entries(byVehicle).map(([id, data]) => ({ vehicleId: id, ...data })),
      monthlyTrends: Object.entries(monthlyTrends).map(([month, data]) => ({ month, ...data })).sort((a, b) => a.month.localeCompare(b.month)),
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/fuel/:id
router.delete('/:id', authenticate, requireRole('fleet_manager', 'financial_analyst'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.fuelLog.delete({ where: { id: req.params.id } });
    res.json({ message: 'Fuel log deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
