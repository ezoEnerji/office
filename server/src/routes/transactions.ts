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
      include: { 
        project: true, 
        contract: true, 
        entity: true, 
        uploader: { include: { role: true } },
        bankAccount: { include: { branch: true } },
        bankCard: { include: { account: { include: { branch: true } } } }
      },
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
      include: { 
        project: true, 
        contract: true, 
        entity: true, 
        uploader: true,
        bankAccount: { include: { branch: true } },
        bankCard: { include: { account: { include: { branch: true } } } },
        invoice: true
      }
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
    
    if (!userId) {
      return res.status(401).json({ error: 'Kullanıcı kimliği bulunamadı' });
    }

    const data: any = {
      ...req.body,
      taxes: req.body.taxes && Array.isArray(req.body.taxes) && req.body.taxes.length > 0 ? req.body.taxes : null,
      date: new Date(req.body.date),
      uploaderId: userId,
      // Boş string'leri null'a çevir
      contractId: req.body.contractId && typeof req.body.contractId === 'string' && req.body.contractId.trim() !== '' ? req.body.contractId : null,
      invoiceNumber: req.body.invoiceNumber && typeof req.body.invoiceNumber === 'string' && req.body.invoiceNumber.trim() !== '' ? req.body.invoiceNumber : null,
      documentUrl: req.body.documentUrl && typeof req.body.documentUrl === 'string' && req.body.documentUrl.trim() !== '' ? req.body.documentUrl : null,
      entityId: req.body.entityId && typeof req.body.entityId === 'string' && req.body.entityId.trim() !== '' ? req.body.entityId : null,
      bankAccountId: req.body.bankAccountId && typeof req.body.bankAccountId === 'string' && req.body.bankAccountId.trim() !== '' ? req.body.bankAccountId : null,
      bankCardId: req.body.bankCardId && typeof req.body.bankCardId === 'string' && req.body.bankCardId.trim() !== '' ? req.body.bankCardId : null,
      invoiceId: req.body.invoiceId && typeof req.body.invoiceId === 'string' && req.body.invoiceId.trim() !== '' ? req.body.invoiceId : null
    };
    
    const transaction = await prisma.transaction.create({ data });
    res.json(transaction);
  } catch (error: any) {
    console.error('Transaction create hatası:', error);
    res.status(400).json({ error: error.message || 'İşlem oluşturulamadı' });
  }
});

// Update transaction
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const data: any = {
      ...req.body,
      taxes: req.body.taxes && req.body.taxes.length > 0 ? req.body.taxes : null,
      date: req.body.date ? new Date(req.body.date) : undefined,
      // Boş string'leri null'a çevir
      contractId: req.body.contractId && req.body.contractId.trim() !== '' ? req.body.contractId : null,
      invoiceNumber: req.body.invoiceNumber && req.body.invoiceNumber.trim() !== '' ? req.body.invoiceNumber : null,
      documentUrl: req.body.documentUrl && req.body.documentUrl.trim() !== '' ? req.body.documentUrl : null,
      entityId: req.body.entityId && req.body.entityId.trim() !== '' ? req.body.entityId : null,
      bankAccountId: req.body.bankAccountId && req.body.bankAccountId.trim() !== '' ? req.body.bankAccountId : null,
      bankCardId: req.body.bankCardId && req.body.bankCardId.trim() !== '' ? req.body.bankCardId : null,
      invoiceId: req.body.invoiceId && req.body.invoiceId.trim() !== '' ? req.body.invoiceId : null
    };
    
    // undefined değerleri kaldır (Prisma bunları güncellemez)
    Object.keys(data).forEach(key => {
      if (data[key] === undefined) {
        delete data[key];
      }
    });
    
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

