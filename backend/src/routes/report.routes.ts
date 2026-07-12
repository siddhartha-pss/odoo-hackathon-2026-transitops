import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/reports/vehicle-roi
router.get('/vehicle-roi', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: {
        trips: { where: { status: 'completed' }, select: { revenue: true, actualCost: true, estimatedCost: true } },
        expenses: { select: { amount: true } },
      },
    });

    const report = vehicles.map(v => {
      const revenue = v.trips.reduce((sum, t) => sum + t.revenue, 0);
      const tripCosts = v.trips.reduce((sum, t) => sum + (t.actualCost || t.estimatedCost), 0);
      const otherExpenses = v.expenses.reduce((sum, e) => sum + e.amount, 0);
      const totalCost = v.acquisitionCost + tripCosts + otherExpenses;
      const profit = revenue - tripCosts - otherExpenses;
      const roi = totalCost > 0 ? ((profit / totalCost) * 100) : 0;

      return {
        id: v.id, registrationNumber: v.registrationNumber, model: v.model,
        acquisitionCost: v.acquisitionCost, revenue, tripCosts, otherExpenses,
        totalCost, profit, roi: Number(roi.toFixed(1)), tripsCompleted: v.trips.length,
      };
    });

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reports/fleet-utilization
router.get('/fleet-utilization', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: { _count: { select: { trips: true, maintenance: true } } },
    });

    const report = vehicles.map(v => ({
      id: v.id, registrationNumber: v.registrationNumber, model: v.model,
      status: v.currentStatus, totalTrips: v._count.trips, totalMaintenance: v._count.maintenance,
      odometer: v.currentOdometer,
    }));

    const statusBreakdown = {
      active: vehicles.filter(v => v.currentStatus === 'active').length,
      available: vehicles.filter(v => v.currentStatus === 'available').length,
      inShop: vehicles.filter(v => v.currentStatus === 'in_shop').length,
      retired: vehicles.filter(v => v.currentStatus === 'retired').length,
    };

    res.json({ vehicles: report, statusBreakdown, total: vehicles.length });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reports/driver-performance
router.get('/driver-performance', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const drivers = await prisma.driver.findMany({
      include: {
        trips: { where: { status: 'completed' }, select: { actualDistance: true, estimatedDistance: true, actualFuel: true, estimatedFuel: true } },
        _count: { select: { trips: true } },
      },
      orderBy: { performanceRating: 'desc' },
    });

    const report = drivers.map(d => ({
      id: d.id, name: d.name, photo: d.photo,
      safetyScore: d.safetyScore, performanceRating: d.performanceRating,
      totalTrips: d.totalTrips, totalDistance: d.totalDistance,
      completedTrips: d.trips.length, status: d.currentStatus,
      fuelEfficiency: d.trips.length > 0
        ? (d.trips.reduce((s, t) => s + (t.actualDistance || t.estimatedDistance), 0) /
           Math.max(d.trips.reduce((s, t) => s + (t.actualFuel || t.estimatedFuel), 0), 1)).toFixed(1)
        : '0',
    }));

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reports/operational-cost
router.get('/operational-cost', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const expenses = await prisma.expense.findMany({ orderBy: { date: 'desc' } });
    
    const monthly: Record<string, Record<string, number>> = {};
    expenses.forEach(e => {
      const month = new Date(e.date).toISOString().substring(0, 7);
      if (!monthly[month]) monthly[month] = {};
      monthly[month][e.category] = (monthly[month][e.category] || 0) + e.amount;
    });

    res.json({
      monthly: Object.entries(monthly)
        .map(([month, cats]) => ({ month, ...cats, total: Object.values(cats).reduce((s, v) => s + v, 0) }))
        .sort((a, b) => a.month.localeCompare(b.month)),
      total: expenses.reduce((s, e) => s + e.amount, 0),
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reports/export/:type
router.get('/export/:type', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type } = req.params;
    const { reportType = 'fleet-utilization' } = req.query;

    // Fetch data based on report type
    let data: any[] = [];
    
    if (reportType === 'fleet-utilization') {
      data = await prisma.vehicle.findMany({
        select: { registrationNumber: true, model: true, manufacturer: true, type: true, currentStatus: true, currentOdometer: true },
      });
    } else if (reportType === 'driver-performance') {
      data = await prisma.driver.findMany({
        select: { name: true, licenseNumber: true, safetyScore: true, performanceRating: true, totalTrips: true, currentStatus: true },
      });
    } else if (reportType === 'expenses') {
      data = await prisma.expense.findMany({
        select: { category: true, amount: true, description: true, date: true },
        orderBy: { date: 'desc' },
      });
    }

    if (type === 'csv') {
      if (data.length === 0) { res.status(404).json({ error: 'No data to export' }); return; }
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).join(','));
      const csv = [headers, ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${reportType}-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } else if (type === 'json') {
      res.setHeader('Content-Disposition', `attachment; filename=${reportType}-${new Date().toISOString().split('T')[0]}.json`);
      res.json(data);
    } else {
      res.status(400).json({ error: 'Supported export types: csv, json' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
