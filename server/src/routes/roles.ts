import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();
const prisma = new PrismaClient();

// Get all roles
router.get('/', authenticateToken, async (req, res) => {
  try {
    const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
    res.json(roles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get role by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const role = await prisma.role.findUnique({ where: { id: req.params.id } });
    if (!role) return res.status(404).json({ error: 'Rol bulunamadı' });
    res.json(role);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create role
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    const role = await prisma.role.create({
      data: { name, description, permissions: permissions || [] }
    });
    res.json(role);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update role
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    const role = await prisma.role.update({
      where: { id: req.params.id },
      data: { 
        name, 
        description, 
        permissions: permissions || [] 
      }
    });
    res.json(role);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete role
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.role.delete({ where: { id: req.params.id } });
    res.json({ message: 'Rol silindi' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

