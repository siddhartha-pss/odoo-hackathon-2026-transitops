import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { authenticate, AuthRequest, generateToken } from '../middleware/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Account is deactivated' });
      return;
    }

    const token = generateToken(user.id);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'login',
        entityType: 'user',
        entityId: user.id,
        details: JSON.stringify({ email: user.email }),
      },
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, email: true, name: true, role: true, avatar: true,
        createdAt: true, updatedAt: true,
      },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    
    // Always return success to prevent email enumeration
    res.json({ message: 'If the email exists, a password reset link has been sent.' });

    if (user) {
      // In production, send email. For hackathon, create notification
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'Password Reset Requested',
          message: 'A password reset was requested for your account. For this demo, use password: password123',
          type: 'info',
        },
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, avatar } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { ...(name && { name }), ...(avatar && { avatar }) },
      select: { id: true, email: true, name: true, role: true, avatar: true },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
