import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all transactions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { projectId, contractId, type, startDate, endDate } = req.query;
    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (contractId) where.contractId = contractId;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { project: true, contract: true, entity: true, uploader: { include: { role: true } } },
      orderBy: { date: 'desc' }
    });
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get transaction by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: { project: true, contract: true, entity: true, uploader: true }
    });
    if (!transaction) return res.status(404).json({ error: 'İşlem bulunamadı' });
    res.json(transaction);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create transaction
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const data = {
      ...req.body,
      taxes: req.body.taxes ? req.body.taxes : null,
      date: new Date(req.body.date),
      uploaderId: userId || req.body.uploaderId
    };
    const transaction = await prisma.transaction.create({ data });
    res.json(transaction);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update transaction
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const data = {
      ...req.body,
      taxes: req.body.taxes ? req.body.taxes : undefined,
      date: req.body.date ? new Date(req.body.date) : undefined
    };
    const transaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data
    });
    res.json(transaction);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete transaction
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.transaction.delete({ where: { id: req.params.id } });
    res.json({ message: 'İşlem silindi' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

