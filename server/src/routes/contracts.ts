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
    // Zorunlu alanları kontrol et
    if (!req.body.code || !req.body.name || !req.body.projectId || !req.body.companyId || !req.body.entityId) {
      return res.status(400).json({ error: 'Kod, ad, proje, şirket ve cari seçimi zorunludur' });
    }

    if (!req.body.startDate || !req.body.endDate) {
      return res.status(400).json({ error: 'Başlangıç ve bitiş tarihi zorunludur' });
    }

    const data: any = {
      code: req.body.code.trim(),
      name: req.body.name.trim(),
      type: req.body.type || 'subcontractor_agreement',
      status: req.body.status || 'draft',
      projectId: req.body.projectId,
      companyId: req.body.companyId,
      entityId: req.body.entityId,
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
      amount: req.body.amount ? Number(req.body.amount) : 0,
      currency: req.body.currency || 'TRY',
      isVatIncluded: req.body.isVatIncluded !== undefined ? Boolean(req.body.isVatIncluded) : false,
      attachments: req.body.attachments && Array.isArray(req.body.attachments) && req.body.attachments.length > 0 
        ? req.body.attachments.filter((url: string) => url && typeof url === 'string' && !url.startsWith('blob:')) 
        : [],
      // Boş string'leri null'a çevir
      paymentTerms: req.body.paymentTerms && typeof req.body.paymentTerms === 'string' && req.body.paymentTerms.trim() !== '' ? req.body.paymentTerms.trim() : null,
      description: req.body.description && typeof req.body.description === 'string' && req.body.description.trim() !== '' ? req.body.description.trim() : null
    };

    const contract = await prisma.contract.create({ data });
    res.json(contract);
  } catch (error: any) {
    console.error('Contract create hatası:', error);
    res.status(400).json({ error: error.message || 'Sözleşme oluşturulamadı' });
  }
});

// Update contract
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const data: any = {
      ...req.body,
      attachments: req.body.attachments && Array.isArray(req.body.attachments) && req.body.attachments.length > 0 ? req.body.attachments : undefined,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      // Boş string'leri null'a çevir
      paymentTerms: req.body.paymentTerms && req.body.paymentTerms.trim() !== '' ? req.body.paymentTerms : null,
      description: req.body.description && req.body.description.trim() !== '' ? req.body.description : null
    };
    
    // undefined değerleri kaldır (Prisma bunları güncellemez)
    Object.keys(data).forEach(key => {
      if (data[key] === undefined) {
        delete data[key];
      }
    });
    
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

