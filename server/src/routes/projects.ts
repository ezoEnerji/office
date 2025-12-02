import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all projects
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { companyId, status, search } = req.query;
    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { code: { contains: search as string } }
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      include: { company: true, customer: true, manager: { include: { role: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get project by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { company: true, customer: true, manager: { include: { role: true } } }
    });
    if (!project) return res.status(404).json({ error: 'Proje bulunamadı' });
    res.json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create project
router.post('/', authenticateToken, async (req, res) => {
  try {
    const data = {
      ...req.body,
      tags: req.body.tags || [],
      startDate: new Date(req.body.startDate),
      endDate: req.body.endDate ? new Date(req.body.endDate) : null
    };
    const project = await prisma.project.create({ data });
    res.json(project);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update project
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const data = {
      ...req.body,
      tags: req.body.tags ? req.body.tags : undefined,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined
    };
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data
    });
    res.json(project);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete project
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ message: 'Proje silindi' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

