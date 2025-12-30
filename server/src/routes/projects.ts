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
    const data: any = {
      name: req.body.name,
      code: req.body.code,
      companyId: req.body.companyId,
      customerId: req.body.customerId || null,
      managerId: req.body.managerId || null,
      status: req.body.status,
      priority: req.body.priority,
      description: req.body.description || null,
      location: req.body.location || null,
      agreementCurrency: req.body.agreementCurrency,
      budget: req.body.budget !== undefined ? Number(req.body.budget) : undefined,
      progress: req.body.progress !== undefined ? Number(req.body.progress) : undefined,
      tags: req.body.tags ? req.body.tags : undefined,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : null
    };
    
    // undefined değerleri kaldır
    Object.keys(data).forEach(key => {
      if (data[key] === undefined) {
        delete data[key];
      }
    });
    
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data
    });
    res.json(project);
  } catch (error: any) {
    console.error('Project update hatası:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete project (with cascade delete of all related records)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const projectId = req.params.id;
    
    // Proje var mı kontrol et
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Proje bulunamadı' });
    }
    
    console.log(`Proje siliniyor: ${project.name} (${projectId})`);
    
    // 1. Bu projenin faturalarına bağlı ödemeleri sil
    const projectInvoices = await prisma.invoice.findMany({
      where: { projectId },
      select: { id: true }
    });
    const invoiceIds = projectInvoices.map(inv => inv.id);
    
    if (invoiceIds.length > 0) {
      // Önce ödemelere bağlı transaction'ları sil
      const payments = await prisma.payment.findMany({
        where: { invoiceId: { in: invoiceIds } },
        select: { transactionId: true }
      });
      const paymentTransactionIds = payments
        .map(p => p.transactionId)
        .filter((id): id is string => id !== null);
      
      // Ödemeleri sil
      const deletedPayments = await prisma.payment.deleteMany({
        where: { invoiceId: { in: invoiceIds } }
      });
      console.log(`- ${deletedPayments.count} ödeme silindi`);
      
      // Ödeme transaction'larını sil
      if (paymentTransactionIds.length > 0) {
        await prisma.transaction.deleteMany({
          where: { id: { in: paymentTransactionIds } }
        });
      }
    }
    
    // 2. Bu projenin tüm transaction'larını sil
    const deletedTransactions = await prisma.transaction.deleteMany({
      where: { projectId }
    });
    console.log(`- ${deletedTransactions.count} işlem silindi`);
    
    // 3. Bu projenin tüm faturalarını sil
    const deletedInvoices = await prisma.invoice.deleteMany({
      where: { projectId }
    });
    console.log(`- ${deletedInvoices.count} fatura silindi`);
    
    // 4. Bu projenin tüm sözleşmelerini sil
    const deletedContracts = await prisma.contract.deleteMany({
      where: { projectId }
    });
    console.log(`- ${deletedContracts.count} sözleşme silindi`);
    
    // 5. Bu projeye bağlı belgeleri sil
    const deletedDocuments = await prisma.document.deleteMany({
      where: { relatedId: projectId }
    });
    console.log(`- ${deletedDocuments.count} belge silindi`);
    
    // 6. Son olarak projeyi sil
    await prisma.project.delete({ where: { id: projectId } });
    console.log(`Proje başarıyla silindi: ${project.name}`);
    
    res.json({ 
      message: 'Proje ve tüm bağlı veriler silindi',
      deleted: {
        payments: invoiceIds.length > 0 ? 'silindi' : 0,
        transactions: deletedTransactions.count,
        invoices: deletedInvoices.count,
        contracts: deletedContracts.count,
        documents: deletedDocuments.count
      }
    });
  } catch (error: any) {
    console.error('Proje silme hatası:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;

