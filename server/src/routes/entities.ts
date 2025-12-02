import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all entities
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type, status } = req.query;
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    
    const entities = await prisma.entity.findMany({ 
      where,
      orderBy: { name: 'asc' } 
    });
    res.json(entities);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get entity by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const entity = await prisma.entity.findUnique({ where: { id: req.params.id } });
    if (!entity) return res.status(404).json({ error: 'Cari hesap bulunamadı' });
    res.json(entity);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create entity
router.post('/', authenticateToken, async (req, res) => {
  try {
    const entity = await prisma.entity.create({ data: req.body });
    res.json(entity);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update entity
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const entity = await prisma.entity.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(entity);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete entity
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.entity.delete({ where: { id: req.params.id } });
    res.json({ message: 'Cari hesap silindi' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

