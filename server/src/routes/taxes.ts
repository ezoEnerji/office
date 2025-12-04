import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all taxes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const taxes = await prisma.tax.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }]
    });
    res.json(taxes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get active taxes
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const taxes = await prisma.tax.findMany({
      where: { isActive: true },
      orderBy: [{ order: 'asc' }, { name: 'asc' }]
    });
    res.json(taxes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get tax by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const tax = await prisma.tax.findUnique({
      where: { id: req.params.id }
    });
    if (!tax) return res.status(404).json({ error: 'Vergi bulunamadı' });
    res.json(tax);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create tax
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, code, rate, calculationType, baseType, description, isActive, order } = req.body;
    
    if (!name || rate === undefined) {
      return res.status(400).json({ error: 'Vergi adı ve oranı zorunludur' });
    }

    // Get max order if not provided
    let taxOrder = order;
    if (taxOrder === undefined) {
      const maxOrder = await prisma.tax.aggregate({
        _max: { order: true }
      });
      taxOrder = (maxOrder._max.order || 0) + 1;
    }

    const tax = await prisma.tax.create({
      data: {
        name: name.trim(),
        code: code && code.trim() !== '' ? code.trim() : null,
        rate: Number(rate),
        calculationType: calculationType || 'percentage',
        baseType: baseType || 'amount',
        description: description && description.trim() !== '' ? description.trim() : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        order: taxOrder
      }
    });
    res.json(tax);
  } catch (error: any) {
    console.error('Tax create hatası:', error);
    res.status(400).json({ error: error.message || 'Vergi oluşturulamadı' });
  }
});

// Update tax
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, code, rate, calculationType, baseType, description, isActive, order } = req.body;
    
    const data: any = {};
    if (name !== undefined) data.name = name.trim();
    if (code !== undefined) data.code = code && code.trim() !== '' ? code.trim() : null;
    if (rate !== undefined) data.rate = Number(rate);
    if (calculationType !== undefined) data.calculationType = calculationType;
    if (baseType !== undefined) data.baseType = baseType;
    if (description !== undefined) data.description = description && description.trim() !== '' ? description.trim() : null;
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (order !== undefined) data.order = Number(order);

    const tax = await prisma.tax.update({
      where: { id: req.params.id },
      data
    });
    res.json(tax);
  } catch (error: any) {
    console.error('Tax update hatası:', error);
    res.status(400).json({ error: error.message || 'Vergi güncellenemedi' });
  }
});

// Delete tax
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.tax.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Vergi silindi' });
  } catch (error: any) {
    console.error('Tax delete hatası:', error);
    res.status(400).json({ error: error.message || 'Vergi silinemedi' });
  }
});

export default router;

