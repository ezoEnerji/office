import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all payments
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { invoiceId, bankAccountId, bankCardId, status, startDate, endDate } = req.query;
    const where: any = {};
    
    if (invoiceId) where.invoiceId = invoiceId;
    if (bankAccountId) where.bankAccountId = bankAccountId;
    if (bankCardId) where.bankCardId = bankCardId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate as string);
      if (endDate) where.paymentDate.lte = new Date(endDate as string);
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        invoice: {
          include: {
            project: true,
            entity: true
          }
        },
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

// Get payment by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: {
        invoice: {
          include: {
            project: true,
            entity: true
          }
        },
        bankAccount: true,
        bankCard: true
      }
    });
    if (!payment) return res.status(404).json({ error: 'Ödeme bulunamadı' });
    res.json(payment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create payment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const data: any = {
      ...req.body,
      paymentDate: new Date(req.body.paymentDate),
      invoiceId: req.body.invoiceId && req.body.invoiceId.trim() !== '' ? req.body.invoiceId : null,
      bankAccountId: req.body.bankAccountId && req.body.bankAccountId.trim() !== '' ? req.body.bankAccountId : null,
      bankCardId: req.body.bankCardId && req.body.bankCardId.trim() !== '' ? req.body.bankCardId : null,
      documentUrl: req.body.documentUrl && req.body.documentUrl.trim() !== '' ? req.body.documentUrl : null
    };
    
    const payment = await prisma.payment.create({ data });
    
    // Eğer faturaya bağlıysa, fatura durumunu güncelle
    if (payment.invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: payment.invoiceId },
        include: { payments: true }
      });
      
      if (invoice) {
        const totalPaid = invoice.payments.reduce((sum, p) => sum + (p.status === 'completed' ? p.amount : 0), 0);
        let newStatus = invoice.status;
        
        if (totalPaid >= invoice.totalAmount) {
          newStatus = 'paid';
        } else if (invoice.status === 'draft' && totalPaid > 0) {
          newStatus = 'issued';
        } else if (invoice.dueDate && new Date() > new Date(invoice.dueDate) && newStatus !== 'paid') {
          newStatus = 'overdue';
        }
        
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: newStatus }
        });
      }
    }
    
    res.json(payment);
  } catch (error: any) {
    console.error('Payment create hatası:', error);
    res.status(400).json({ error: error.message || 'Ödeme oluşturulamadı' });
  }
});

// Update payment
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const data: any = {
      ...req.body,
      paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : undefined,
      invoiceId: req.body.invoiceId && req.body.invoiceId.trim() !== '' ? req.body.invoiceId : null,
      bankAccountId: req.body.bankAccountId && req.body.bankAccountId.trim() !== '' ? req.body.bankAccountId : null,
      bankCardId: req.body.bankCardId && req.body.bankCardId.trim() !== '' ? req.body.bankCardId : null,
      documentUrl: req.body.documentUrl && req.body.documentUrl.trim() !== '' ? req.body.documentUrl : null
    };
    
    // undefined değerleri kaldır
    Object.keys(data).forEach(key => {
      if (data[key] === undefined) {
        delete data[key];
      }
    });
    
    const payment = await prisma.payment.update({
      where: { id: req.params.id },
      data
    });
    
    // Fatura durumunu güncelle
    if (payment.invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: payment.invoiceId },
        include: { payments: true }
      });
      
      if (invoice) {
        const totalPaid = invoice.payments.reduce((sum, p) => sum + (p.status === 'completed' ? p.amount : 0), 0);
        let newStatus = invoice.status;
        
        if (totalPaid >= invoice.totalAmount) {
          newStatus = 'paid';
        } else if (invoice.status === 'draft' && totalPaid > 0) {
          newStatus = 'issued';
        } else if (invoice.dueDate && new Date() > new Date(invoice.dueDate) && newStatus !== 'paid') {
          newStatus = 'overdue';
        }
        
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: newStatus }
        });
      }
    }
    
    res.json(payment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete payment
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id }
    });
    
    await prisma.payment.delete({
      where: { id: req.params.id }
    });
    
    // Fatura durumunu güncelle
    if (payment?.invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: payment.invoiceId },
        include: { payments: true }
      });
      
      if (invoice) {
        const totalPaid = invoice.payments.reduce((sum, p) => sum + (p.status === 'completed' ? p.amount : 0), 0);
        let newStatus = invoice.status;
        
        if (totalPaid >= invoice.totalAmount) {
          newStatus = 'paid';
        } else if (totalPaid === 0) {
          newStatus = invoice.status === 'paid' ? 'issued' : invoice.status;
        } else if (invoice.dueDate && new Date() > new Date(invoice.dueDate) && newStatus !== 'paid') {
          newStatus = 'overdue';
        }
        
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: newStatus }
        });
      }
    }
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

