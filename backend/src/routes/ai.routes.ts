import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/ai/fleet-health
router.get('/fleet-health', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: {
        maintenance: { orderBy: { scheduledDate: 'desc' }, take: 5 },
        fuelLogs: { orderBy: { date: 'desc' }, take: 10 },
        _count: { select: { trips: true, maintenance: true } },
      },
    });

    const now = new Date();
    const healthScores = vehicles.map(v => {
      let score = 100;
      const issues: string[] = [];

      // Age factor (-5 per year over 3 years)
      const ageYears = (now.getTime() - new Date(v.acquisitionDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (ageYears > 3) { score -= (ageYears - 3) * 5; issues.push(`Vehicle is ${ageYears.toFixed(1)} years old`); }

      // Mileage factor
      if (v.currentOdometer > 200000) { score -= 15; issues.push('High mileage (>200K km)'); }
      else if (v.currentOdometer > 100000) { score -= 8; issues.push('Moderate mileage (>100K km)'); }

      // Document expiry
      if (v.insuranceExpiry && new Date(v.insuranceExpiry) < now) { score -= 20; issues.push('Insurance expired'); }
      if (v.fitnessExpiry && new Date(v.fitnessExpiry) < now) { score -= 20; issues.push('Fitness certificate expired'); }
      if (v.pollutionExpiry && new Date(v.pollutionExpiry) < now) { score -= 15; issues.push('Pollution certificate expired'); }

      // In-shop penalty
      if (v.currentStatus === 'in_shop') { score -= 10; issues.push('Currently in shop'); }

      // Recent maintenance issues
      const recentMaintenance = v.maintenance.filter(m => m.type === 'corrective').length;
      if (recentMaintenance >= 3) { score -= 15; issues.push('Frequent corrective maintenance'); }

      return {
        vehicleId: v.id, registrationNumber: v.registrationNumber, model: v.model,
        status: v.currentStatus,
        healthScore: Math.max(0, Math.min(100, Math.round(score))),
        issues,
        grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D',
      };
    });

    const overallHealth = healthScores.length > 0
      ? Math.round(healthScores.reduce((sum, h) => sum + h.healthScore, 0) / healthScores.length)
      : 0;

    res.json({ overallHealth, vehicles: healthScores.sort((a, b) => a.healthScore - b.healthScore) });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/ai/maintenance-prediction
router.get('/maintenance-prediction', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: {
        maintenance: { orderBy: { completedDate: 'desc' }, take: 5, where: { status: 'completed' } },
        fuelLogs: { orderBy: { date: 'desc' }, take: 5 },
      },
    });

    const predictions = vehicles.map(v => {
      const lastService = v.maintenance[0];
      const kmSinceService = lastService
        ? v.currentOdometer - (v.fuelLogs[v.fuelLogs.length - 1]?.odometer || 0)
        : v.currentOdometer;
      
      const daysSinceService = lastService?.completedDate
        ? Math.floor((Date.now() - new Date(lastService.completedDate).getTime()) / (24 * 60 * 60 * 1000))
        : 365;

      // Predict next service
      const serviceIntervalKm = 10000;
      const serviceIntervalDays = 90;
      
      const kmUntilService = Math.max(0, serviceIntervalKm - kmSinceService);
      const daysUntilService = Math.max(0, serviceIntervalDays - daysSinceService);

      const urgency = kmUntilService < 1000 || daysUntilService < 7 ? 'critical'
        : kmUntilService < 3000 || daysUntilService < 30 ? 'high'
        : kmUntilService < 5000 || daysUntilService < 60 ? 'medium' : 'low';

      const predictedDate = new Date();
      predictedDate.setDate(predictedDate.getDate() + daysUntilService);

      return {
        vehicleId: v.id, registrationNumber: v.registrationNumber, model: v.model,
        kmSinceService: Math.round(kmSinceService), daysSinceService,
        kmUntilService: Math.round(kmUntilService), daysUntilService,
        predictedDate: predictedDate.toISOString().split('T')[0],
        urgency,
        recommendation: urgency === 'critical' ? 'Schedule maintenance immediately'
          : urgency === 'high' ? 'Schedule maintenance this week'
          : urgency === 'medium' ? 'Plan maintenance in the next month'
          : 'No immediate action needed',
      };
    });

    res.json(predictions.sort((a, b) => {
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return (urgencyOrder[a.urgency as keyof typeof urgencyOrder] || 3) - (urgencyOrder[b.urgency as keyof typeof urgencyOrder] || 3);
    }));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/ai/smart-dispatch
router.get('/smart-dispatch', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { cargoWeight, cargoType } = req.query;
    const weight = Number(cargoWeight) || 0;

    // Get available vehicles
    const vehicles = await prisma.vehicle.findMany({
      where: {
        currentStatus: 'available',
        capacity: { gte: weight },
      },
      include: {
        fuelLogs: { orderBy: { date: 'desc' }, take: 5 },
        maintenance: { orderBy: { completedDate: 'desc' }, take: 3, where: { status: 'completed' } },
        _count: { select: { trips: true } },
      },
    });

    // Get available drivers
    const drivers = await prisma.driver.findMany({
      where: {
        currentStatus: 'available',
        licenseExpiry: { gt: new Date() },
      },
      include: {
        _count: { select: { trips: true } },
      },
    });

    // Score vehicles
    const scoredVehicles = vehicles.map(v => {
      let score = 50;
      // Fuel efficiency bonus
      if (v.fuelLogs.length > 0) {
        const avgEfficiency = v.fuelLogs.reduce((s, f) => s + f.odometer / Math.max(f.quantity, 1), 0) / v.fuelLogs.length;
        score += Math.min(avgEfficiency / 2, 20);
      }
      // Lower mileage bonus
      if (v.currentOdometer < 50000) score += 15;
      else if (v.currentOdometer < 100000) score += 10;
      // Recent maintenance bonus
      if (v.maintenance.length > 0) score += 10;
      // Capacity match (closer to weight = better efficiency)
      const capacityRatio = weight > 0 ? weight / v.capacity : 0.5;
      score += capacityRatio * 10;

      return { ...v, score: Math.round(score) };
    }).sort((a, b) => b.score - a.score);

    // Score drivers
    const scoredDrivers = drivers.map(d => {
      let score = 50;
      score += d.safetyScore * 0.3;
      score += d.performanceRating * 5;
      score += Math.min(d.totalTrips * 0.5, 15);
      return { ...d, score: Math.round(score) };
    }).sort((a, b) => b.score - a.score);

    res.json({
      recommendedVehicles: scoredVehicles.slice(0, 5).map(v => ({
        id: v.id, registrationNumber: v.registrationNumber, model: v.model,
        type: v.type, capacity: v.capacity, score: v.score,
        reason: v.score > 70 ? 'Best match for this trip' : 'Good option available',
      })),
      recommendedDrivers: scoredDrivers.slice(0, 5).map(d => ({
        id: d.id, name: d.name, safetyScore: d.safetyScore,
        performanceRating: d.performanceRating, totalTrips: d.totalTrips, score: d.score,
        reason: d.score > 70 ? 'Top performer recommended' : 'Available and qualified',
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/ai/risk-detection
router.get('/risk-detection', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const risks: any[] = [];

    // Expiring licenses
    const expiringLicenses = await prisma.driver.findMany({
      where: { licenseExpiry: { lte: thirtyDays } },
      select: { id: true, name: true, licenseNumber: true, licenseExpiry: true },
    });
    expiringLicenses.forEach(d => {
      const daysLeft = Math.ceil((new Date(d.licenseExpiry).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      risks.push({
        type: 'license_expiry', severity: daysLeft <= 0 ? 'critical' : daysLeft <= 7 ? 'high' : 'medium',
        entity: 'driver', entityId: d.id, title: `License expiring: ${d.name}`,
        description: daysLeft <= 0 ? `License expired ${Math.abs(daysLeft)} days ago` : `License expires in ${daysLeft} days`,
      });
    });

    // Expiring insurance
    const expiringInsurance = await prisma.vehicle.findMany({
      where: { insuranceExpiry: { lte: thirtyDays } },
      select: { id: true, registrationNumber: true, insuranceExpiry: true },
    });
    expiringInsurance.forEach(v => {
      const daysLeft = Math.ceil((new Date(v.insuranceExpiry!).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      risks.push({
        type: 'insurance_expiry', severity: daysLeft <= 0 ? 'critical' : daysLeft <= 7 ? 'high' : 'medium',
        entity: 'vehicle', entityId: v.id, title: `Insurance expiring: ${v.registrationNumber}`,
        description: daysLeft <= 0 ? `Insurance expired ${Math.abs(daysLeft)} days ago` : `Insurance expires in ${daysLeft} days`,
      });
    });

    // Low safety scores
    const lowSafety = await prisma.driver.findMany({
      where: { safetyScore: { lt: 60 } },
      select: { id: true, name: true, safetyScore: true },
    });
    lowSafety.forEach(d => {
      risks.push({
        type: 'low_safety', severity: d.safetyScore < 40 ? 'critical' : 'high',
        entity: 'driver', entityId: d.id, title: `Low safety score: ${d.name}`,
        description: `Safety score is ${d.safetyScore}/100`,
      });
    });

    // Overdue maintenance
    const overdueMaintenance = await prisma.maintenance.findMany({
      where: { status: 'scheduled', scheduledDate: { lt: now } },
      include: { vehicle: { select: { registrationNumber: true } } },
    });
    overdueMaintenance.forEach(m => {
      risks.push({
        type: 'overdue_maintenance', severity: 'high',
        entity: 'vehicle', entityId: m.vehicleId, title: `Overdue maintenance: ${m.vehicle.registrationNumber}`,
        description: m.description,
      });
    });

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    risks.sort((a, b) => (severityOrder[a.severity as keyof typeof severityOrder] || 3) - (severityOrder[b.severity as keyof typeof severityOrder] || 3));

    res.json({ risks, totalRisks: risks.length, criticalCount: risks.filter(r => r.severity === 'critical').length });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/ai/fuel-prediction
router.get('/fuel-prediction', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: {
        fuelLogs: { orderBy: { date: 'asc' }, take: 20 },
      },
    });

    const predictions = vehicles.filter(v => v.fuelLogs.length >= 3).map(v => {
      const logs = v.fuelLogs;
      const avgConsumption = logs.reduce((s, l) => s + l.quantity, 0) / logs.length;
      const avgCost = logs.reduce((s, l) => s + l.totalCost, 0) / logs.length;
      
      // Simple linear trend
      const trend = logs.length >= 2
        ? (logs[logs.length - 1].quantity - logs[0].quantity) / logs.length
        : 0;

      const nextMonthPrediction = avgConsumption + trend * 4;
      const nextMonthCost = nextMonthPrediction * (logs[logs.length - 1]?.costPerUnit || 100);

      return {
        vehicleId: v.id, registrationNumber: v.registrationNumber, model: v.model,
        avgMonthlyConsumption: Math.round(avgConsumption),
        avgMonthlyCost: Math.round(avgCost),
        predictedNextMonthConsumption: Math.round(Math.max(0, nextMonthPrediction)),
        predictedNextMonthCost: Math.round(Math.max(0, nextMonthCost)),
        trend: trend > 0.5 ? 'increasing' : trend < -0.5 ? 'decreasing' : 'stable',
      };
    });

    res.json(predictions);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
