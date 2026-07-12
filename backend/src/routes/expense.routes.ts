import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/expenses
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, vehicleId, page = '1', limit = '10', sortBy = 'date', sortOrder = 'desc',
            startDate, endDate } = req.query;
    
    const where: any = {};
    if (category) where.category = String(category);
    if (vehicleId) where.vehicleId = String(vehicleId);
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(String(startDate));
      if (endDate) where.date.lte = new Date(String(endDate));
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where, skip, take: Number(limit),
        orderBy: { [String(sortBy)]: sortOrder },
        include: {
          vehicle: { select: { id: true, registrationNumber: true } },
        },
      }),
      prisma.expense.count({ where }),
    ]);

    res.json({ data: expenses, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/expenses
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, amount, description, vehicleId, driverId, tripId, date, receiptUrl } = req.body;
    if (!category || !amount) {
      res.status(400).json({ error: 'Category and amount are required' }); return;
    }

    const expense = await prisma.expense.create({
      data: {
        category, amount: Number(amount), description,
        vehicleId, tripId, date: date ? new Date(date) : new Date(), receiptUrl,
      },
      include: { vehicle: true },
    });

    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'created', entityType: 'expense', entityId: expense.id,
              details: JSON.stringify({ category, amount }) },
    });

    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/expenses/summary
router.get('/summary/breakdown', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const expenses = await prisma.expense.findMany();
    
    const byCategory: Record<string, number> = {};
    const monthlyBreakdown: Record<string, Record<string, number>> = {};
    
    expenses.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
      
      const month = new Date(e.date).toISOString().substring(0, 7);
      if (!monthlyBreakdown[month]) monthlyBreakdown[month] = {};
      monthlyBreakdown[month][e.category] = (monthlyBreakdown[month][e.category] || 0) + e.amount;
    });

    const total = Object.values(byCategory).reduce((sum, v) => sum + v, 0);

    res.json({
      total,
      byCategory: Object.entries(byCategory).map(([category, amount]) => ({
        category, amount, percentage: total > 0 ? (amount / total * 100).toFixed(1) : 0,
      })),
      monthlyBreakdown: Object.entries(monthlyBreakdown)
        .map(([month, cats]) => ({ month, ...cats, total: Object.values(cats).reduce((s, v) => s + v, 0) }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.expense.delete({ where: { id: req.params.id } });
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
