import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Vehicle stats
    const [totalVehicles, activeVehicles, availableVehicles, inShopVehicles, retiredVehicles] = await Promise.all([
      prisma.vehicle.count(),
      prisma.vehicle.count({ where: { currentStatus: 'active' } }),
      prisma.vehicle.count({ where: { currentStatus: 'available' } }),
      prisma.vehicle.count({ where: { currentStatus: 'in_shop' } }),
      prisma.vehicle.count({ where: { currentStatus: 'retired' } }),
    ]);

    // Driver stats
    const [totalDrivers, availableDrivers, onTripDrivers] = await Promise.all([
      prisma.driver.count(),
      prisma.driver.count({ where: { currentStatus: 'available' } }),
      prisma.driver.count({ where: { currentStatus: 'on_trip' } }),
    ]);

    // Trip stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [tripsToday, pendingTrips, completedTrips, totalTrips] = await Promise.all([
      prisma.trip.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
      prisma.trip.count({ where: { status: 'draft' } }),
      prisma.trip.count({ where: { status: 'completed' } }),
      prisma.trip.count(),
    ]);

    // Financial stats
    const [monthlyExpenses, monthlyFuel, allExpenses, allRevenue] = await Promise.all([
      prisma.expense.findMany({ where: { date: { gte: startOfMonth } } }),
      prisma.fuelLog.findMany({ where: { date: { gte: startOfMonth } } }),
      prisma.expense.findMany(),
      prisma.trip.findMany({ where: { status: 'completed' }, select: { revenue: true } }),
    ]);

    const totalExpenses = allExpenses.reduce((sum, e) => sum + e.amount, 0);
    const monthlyExpenseTotal = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
    const fuelCost = monthlyFuel.reduce((sum, f) => sum + f.totalCost, 0);
    const totalRevenue = allRevenue.reduce((sum, t) => sum + t.revenue, 0);
    const monthlyRevenue = allRevenue.reduce((sum, t) => sum + t.revenue, 0);

    // Maintenance due
    const maintenanceDue = await prisma.maintenance.count({
      where: { status: 'scheduled', scheduledDate: { lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) } },
    });

    // Fleet utilization
    const fleetUtilization = totalVehicles > 0 ? ((activeVehicles / totalVehicles) * 100).toFixed(1) : 0;
    
    // Trip success rate
    const tripSuccessRate = totalTrips > 0 ? ((completedTrips / totalTrips) * 100).toFixed(1) : 0;

    // ROI
    const roi = totalExpenses > 0 ? (((totalRevenue - totalExpenses) / totalExpenses) * 100).toFixed(1) : 0;

    // Average fuel efficiency
    const fuelLogs = await prisma.fuelLog.findMany({ take: 100, orderBy: { date: 'desc' } });
    const avgFuelEfficiency = fuelLogs.length > 0
      ? (fuelLogs.reduce((sum, l) => sum + l.odometer, 0) / fuelLogs.reduce((sum, l) => sum + l.quantity, 0)).toFixed(1)
      : '0';

    // Upcoming license expiry (next 30 days)
    const upcomingLicenseExpiry = await prisma.driver.findMany({
      where: { licenseExpiry: { gte: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) } },
      select: { id: true, name: true, licenseNumber: true, licenseExpiry: true },
      orderBy: { licenseExpiry: 'asc' },
    });

    // Upcoming insurance expiry
    const upcomingInsuranceExpiry = await prisma.vehicle.findMany({
      where: { insuranceExpiry: { gte: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) } },
      select: { id: true, registrationNumber: true, model: true, insuranceExpiry: true },
      orderBy: { insuranceExpiry: 'asc' },
    });

    // Upcoming maintenance
    const upcomingMaintenance = await prisma.maintenance.findMany({
      where: { status: 'scheduled', scheduledDate: { gte: now } },
      include: { vehicle: { select: { registrationNumber: true, model: true } } },
      orderBy: { scheduledDate: 'asc' },
      take: 5,
    });

    // Recent activities
    const recentActivities = await prisma.auditLog.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json({
      vehicles: { total: totalVehicles, active: activeVehicles, available: availableVehicles, inShop: inShopVehicles, retired: retiredVehicles },
      drivers: { total: totalDrivers, available: availableDrivers, onTrip: onTripDrivers },
      trips: { today: tripsToday, pending: pendingTrips, completed: completedTrips, total: totalTrips },
      financial: { totalExpenses, monthlyExpenses: monthlyExpenseTotal, fuelCost, totalRevenue, monthlyRevenue, roi },
      fleet: { utilization: fleetUtilization, maintenanceDue, tripSuccessRate, avgFuelEfficiency },
      upcoming: { licenseExpiry: upcomingLicenseExpiry, insuranceExpiry: upcomingInsuranceExpiry, maintenance: upcomingMaintenance },
      recentActivities,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/dashboard/charts
router.get('/charts', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Monthly trip counts (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const trips = await prisma.trip.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, status: true, revenue: true, estimatedCost: true },
    });

    const monthlyTrips: Record<string, { total: number; completed: number; cancelled: number; revenue: number; cost: number }> = {};
    trips.forEach(t => {
      const month = new Date(t.createdAt).toISOString().substring(0, 7);
      if (!monthlyTrips[month]) monthlyTrips[month] = { total: 0, completed: 0, cancelled: 0, revenue: 0, cost: 0 };
      monthlyTrips[month].total++;
      if (t.status === 'completed') { monthlyTrips[month].completed++; monthlyTrips[month].revenue += t.revenue; }
      if (t.status === 'cancelled') monthlyTrips[month].cancelled++;
      monthlyTrips[month].cost += t.estimatedCost;
    });

    // Expense breakdown by category
    const expenses = await prisma.expense.findMany();
    const expensesByCategory: Record<string, number> = {};
    expenses.forEach(e => {
      expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
    });

    // Vehicle status distribution
    const vehicleStatusDist = await Promise.all([
      prisma.vehicle.count({ where: { currentStatus: 'active' } }),
      prisma.vehicle.count({ where: { currentStatus: 'available' } }),
      prisma.vehicle.count({ where: { currentStatus: 'in_shop' } }),
      prisma.vehicle.count({ where: { currentStatus: 'retired' } }),
    ]);

    // Driver leaderboard
    const topDrivers = await prisma.driver.findMany({
      orderBy: [{ performanceRating: 'desc' }, { safetyScore: 'desc' }],
      take: 10,
      select: { id: true, name: true, photo: true, safetyScore: true, performanceRating: true, totalTrips: true, totalDistance: true },
    });

    res.json({
      monthlyTrips: Object.entries(monthlyTrips)
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month)),
      expensesByCategory: Object.entries(expensesByCategory)
        .map(([category, amount]) => ({ category, amount })),
      vehicleStatus: [
        { status: 'Active', count: vehicleStatusDist[0], color: '#10b981' },
        { status: 'Available', count: vehicleStatusDist[1], color: '#3b82f6' },
        { status: 'In Shop', count: vehicleStatusDist[2], color: '#f59e0b' },
        { status: 'Retired', count: vehicleStatusDist[3], color: '#ef4444' },
      ],
      topDrivers,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
