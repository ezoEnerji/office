import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all users
router.get('/', authenticateToken, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { role: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users.map(u => ({ ...u, password: undefined })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { role: true }
    });
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    res.json({ ...user, password: undefined });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create user
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, email, password, title, roleId, avatar } = req.body;
    const hashedPassword = await bcrypt.hash(password || '123', 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, title, roleId, avatar },
      include: { role: true }
    });
    res.json({ ...user, password: undefined });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update user
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, email, title, roleId, avatar } = req.body;
    const updateData: any = { name, email, title, roleId, avatar };
    
    if (req.body.password) {
      updateData.password = await bcrypt.hash(req.body.password, 10);
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      include: { role: true }
    });
    res.json({ ...user, password: undefined });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete user
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'Kullanıcı silindi' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

