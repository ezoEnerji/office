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
        ? req.body.attachments.filter((url: string) => url && typeof url === 'string' && !url.startsWith('blob:') && url.trim() !== '') 
        : [],
      // Boş string'leri null'a çevir
      paymentTerms: req.body.paymentTerms && typeof req.body.paymentTerms === 'string' && req.body.paymentTerms.trim() !== '' ? req.body.paymentTerms.trim() : null,
      description: req.body.description && typeof req.body.description === 'string' && req.body.description.trim() !== '' ? req.body.description.trim() : null
    };

    console.log('Contract create data:', JSON.stringify(data, null, 2));
    const contract = await prisma.contract.create({ data });
    res.json(contract);
  } catch (error: any) {
    console.error('Contract create hatası:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
    res.status(400).json({ 
      error: error.message || 'Sözleşme oluşturulamadı',
      details: error.meta || error.code || 'Bilinmeyen hata'
    });
  }
});

// Update contract
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    // Zorunlu alanları kontrol et
    if (req.body.code && !req.body.code.trim()) {
      return res.status(400).json({ error: 'Kod boş olamaz' });
    }
    if (req.body.name && !req.body.name.trim()) {
      return res.status(400).json({ error: 'Ad boş olamaz' });
    }

    const data: any = {
      code: req.body.code ? req.body.code.trim() : undefined,
      name: req.body.name ? req.body.name.trim() : undefined,
      type: req.body.type,
      status: req.body.status,
      projectId: req.body.projectId,
      companyId: req.body.companyId,
      entityId: req.body.entityId,
      amount: req.body.amount !== undefined ? Number(req.body.amount) : undefined,
      currency: req.body.currency,
      isVatIncluded: req.body.isVatIncluded !== undefined ? Boolean(req.body.isVatIncluded) : undefined,
      attachments: req.body.attachments && Array.isArray(req.body.attachments) 
        ? req.body.attachments.filter((url: string) => url && typeof url === 'string' && !url.startsWith('blob:') && url.trim() !== '') 
        : undefined,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      // Boş string'leri null'a çevir
      paymentTerms: req.body.paymentTerms && typeof req.body.paymentTerms === 'string' && req.body.paymentTerms.trim() !== '' ? req.body.paymentTerms.trim() : null,
      description: req.body.description && typeof req.body.description === 'string' && req.body.description.trim() !== '' ? req.body.description.trim() : null
    };
    
    // undefined değerleri kaldır (Prisma bunları güncellemez)
    Object.keys(data).forEach(key => {
      if (data[key] === undefined) {
        delete data[key];
      }
    });
    
    console.log('Contract update data:', JSON.stringify(data, null, 2));
    const contract = await prisma.contract.update({
      where: { id: req.params.id },
      data
    });
    res.json(contract);
  } catch (error: any) {
    console.error('Contract update hatası:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
    res.status(400).json({ 
      error: error.message || 'Sözleşme güncellenemedi',
      details: error.meta || error.code || 'Bilinmeyen hata'
    });
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

