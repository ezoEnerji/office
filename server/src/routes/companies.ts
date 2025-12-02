import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all companies
router.get('/', authenticateToken, async (req, res) => {
  try {
    const companies = await prisma.company.findMany({ orderBy: { name: 'asc' } });
    res.json(companies);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get company by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const company = await prisma.company.findUnique({ where: { id: req.params.id } });
    if (!company) return res.status(404).json({ error: 'Şirket bulunamadı' });
    res.json(company);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create company
router.post('/', authenticateToken, async (req, res) => {
  try {
    const company = await prisma.company.create({ data: req.body });
    res.json(company);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update company
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const company = await prisma.company.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(company);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete company
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.company.delete({ where: { id: req.params.id } });
    res.json({ message: 'Şirket silindi' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

