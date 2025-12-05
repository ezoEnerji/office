import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all invoices
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { companyId, projectId, entityId, invoiceType, status, startDate, endDate } = req.query;
    const where: any = {};
    
    if (companyId) where.companyId = companyId;
    if (projectId) where.projectId = projectId;
    if (entityId) where.entityId = entityId;
    if (invoiceType) where.invoiceType = invoiceType;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = new Date(startDate as string);
      if (endDate) where.invoiceDate.lte = new Date(endDate as string);
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        project: true,
        company: true,
        entity: true,
        contract: true,
        payments: {
          include: {
            bankAccount: true,
            bankCard: true
          }
        }
      },
      orderBy: { invoiceDate: 'desc' }
    });
    res.json(invoices);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get invoice by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        project: true,
        company: true,
        entity: true,
        contract: true,
        payments: {
          include: {
            bankAccount: true,
            bankCard: true
          }
        }
      }
    });
    if (!invoice) return res.status(404).json({ error: 'Fatura bulunamadı' });
    res.json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create invoice
router.post('/', authenticateToken, async (req, res) => {
  try {
    const data: any = {
      ...req.body,
      invoiceDate: new Date(req.body.invoiceDate),
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
      taxes: req.body.taxes && Array.isArray(req.body.taxes) && req.body.taxes.length > 0 ? req.body.taxes : null,
      projectId: req.body.projectId && req.body.projectId.trim() !== '' ? req.body.projectId : null,
      contractId: req.body.contractId && req.body.contractId.trim() !== '' ? req.body.contractId : null,
      documentUrl: req.body.documentUrl && req.body.documentUrl.trim() !== '' ? req.body.documentUrl : null
    };
    
    const invoice = await prisma.invoice.create({ data });
    res.json(invoice);
  } catch (error: any) {
    console.error('Invoice create hatası:', error);
    res.status(400).json({ error: error.message || 'Fatura oluşturulamadı' });
  }
});

// Update invoice
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const data: any = {
      ...req.body,
      invoiceDate: req.body.invoiceDate ? new Date(req.body.invoiceDate) : undefined,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
      taxes: req.body.taxes && req.body.taxes.length > 0 ? req.body.taxes : null,
      projectId: req.body.projectId && req.body.projectId.trim() !== '' ? req.body.projectId : null,
      contractId: req.body.contractId && req.body.contractId.trim() !== '' ? req.body.contractId : null,
      documentUrl: req.body.documentUrl && req.body.documentUrl.trim() !== '' ? req.body.documentUrl : null
    };
    
    // undefined değerleri kaldır
    Object.keys(data).forEach(key => {
      if (data[key] === undefined) {
        delete data[key];
      }
    });
    
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data
    });
    res.json(invoice);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete invoice
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.invoice.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get payments for an invoice
router.get('/:id/payments', authenticateToken, async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { invoiceId: req.params.id },
      include: {
        bankAccount: true,
        bankCard: true
      },
      orderBy: { paymentDate: 'desc' }
    });
    res.json(payments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

