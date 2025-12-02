import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all contracts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { projectId, type, status } = req.query;
    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (type) where.type = type;
    if (status) where.status = status;

    const contracts = await prisma.contract.findMany({
      where,
      include: { project: true, company: true, entity: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(contracts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get contract by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id: req.params.id },
      include: { project: true, company: true, entity: true }
    });
    if (!contract) return res.status(404).json({ error: 'Sözleşme bulunamadı' });
    res.json(contract);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create contract
router.post('/', authenticateToken, async (req, res) => {
  try {
    const data = {
      ...req.body,
      attachments: req.body.attachments || [],
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate)
    };
    const contract = await prisma.contract.create({ data });
    res.json(contract);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update contract
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const data = {
      ...req.body,
      attachments: req.body.attachments ? req.body.attachments : undefined,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined
    };
    const contract = await prisma.contract.update({
      where: { id: req.params.id },
      data
    });
    res.json(contract);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete contract
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.contract.delete({ where: { id: req.params.id } });
    res.json({ message: 'Sözleşme silindi' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

