import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// ========== BANK BRANCHES ==========

// Get all branches for a company
router.get('/branches/:companyId', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.params;
    const branches = await prisma.bankBranch.findMany({
      where: { companyId },
      orderBy: { name: 'asc' }
    });
    res.json(branches);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single branch
router.get('/branches/branch/:id', authenticateToken, async (req, res) => {
  try {
    const branch = await prisma.bankBranch.findUnique({
      where: { id: req.params.id }
    });
    if (!branch) {
      return res.status(404).json({ error: 'Şube bulunamadı' });
    }
    res.json(branch);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create branch
router.post('/branches', authenticateToken, async (req, res) => {
  try {
    const branch = await prisma.bankBranch.create({
      data: req.body
    });
    res.json(branch);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update branch
router.put('/branches/:id', authenticateToken, async (req, res) => {
  try {
    const branch = await prisma.bankBranch.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(branch);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete branch
router.delete('/branches/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.bankBranch.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ========== BANK ACCOUNTS ==========

// Get all accounts for a company
router.get('/accounts/:companyId', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.params;
    const accounts = await prisma.bankAccount.findMany({
      where: { companyId },
      include: { branch: true },
      orderBy: { accountName: 'asc' }
    });
    res.json(accounts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single account
router.get('/accounts/account/:id', authenticateToken, async (req, res) => {
  try {
    const account = await prisma.bankAccount.findUnique({
      where: { id: req.params.id },
      include: { branch: true }
    });
    if (!account) {
      return res.status(404).json({ error: 'Hesap bulunamadı' });
    }
    res.json(account);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create account
router.post('/accounts', authenticateToken, async (req, res) => {
  try {
    const account = await prisma.bankAccount.create({
      data: req.body,
      include: { branch: true }
    });
    res.json(account);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update account
router.put('/accounts/:id', authenticateToken, async (req, res) => {
  try {
    const account = await prisma.bankAccount.update({
      where: { id: req.params.id },
      data: req.body,
      include: { branch: true }
    });
    res.json(account);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete account
router.delete('/accounts/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.bankAccount.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ========== BANK CARDS ==========

// Get all cards for a company
router.get('/cards/:companyId', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.params;
    const cards = await prisma.bankCard.findMany({
      where: { companyId },
      include: { account: { include: { branch: true } } },
      orderBy: { cardName: 'asc' }
    });
    res.json(cards);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single card
router.get('/cards/card/:id', authenticateToken, async (req, res) => {
  try {
    const card = await prisma.bankCard.findUnique({
      where: { id: req.params.id },
      include: { account: { include: { branch: true } } }
    });
    if (!card) {
      return res.status(404).json({ error: 'Kart bulunamadı' });
    }
    res.json(card);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create card
router.post('/cards', authenticateToken, async (req, res) => {
  try {
    const card = await prisma.bankCard.create({
      data: req.body,
      include: { account: { include: { branch: true } } }
    });
    res.json(card);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update card
router.put('/cards/:id', authenticateToken, async (req, res) => {
  try {
    const card = await prisma.bankCard.update({
      where: { id: req.params.id },
      data: req.body,
      include: { account: { include: { branch: true } } }
    });
    res.json(card);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete card
router.delete('/cards/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.bankCard.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

