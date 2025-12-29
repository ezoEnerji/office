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
    const {
      paymentType, paymentDate, amount, currency, paymentMethod,
      invoiceId, bankAccountId, bankCardId, description, referenceNumber, status, documentUrl
    } = req.body;
    
    const data: any = {
      paymentType: paymentType || 'outgoing', // incoming = gelen ödeme, outgoing = giden ödeme
      paymentDate: new Date(paymentDate),
      amount: amount ? Number(amount) : 0,
      currency: currency || 'TRY',
      paymentMethod: paymentMethod || 'transfer',
      invoiceId: invoiceId && invoiceId.trim() !== '' ? invoiceId : null,
      bankAccountId: bankAccountId && bankAccountId.trim() !== '' ? bankAccountId : null,
      bankCardId: bankCardId && bankCardId.trim() !== '' ? bankCardId : null,
      description: description && description.trim() !== '' ? description.trim() : null,
      referenceNumber: referenceNumber && referenceNumber.trim() !== '' ? referenceNumber.trim() : null,
      status: status || 'completed',
      documentUrl: documentUrl && documentUrl.trim() !== '' ? documentUrl : null
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
    const {
      id, // exclude from update data
      paymentType, paymentDate, amount, currency, paymentMethod,
      invoiceId, bankAccountId, bankCardId, description, referenceNumber, status, documentUrl
    } = req.body;
    
    const data: any = {
      paymentType,
      paymentDate: paymentDate ? new Date(paymentDate) : undefined,
      amount: amount !== undefined ? Number(amount) : undefined,
      currency,
      paymentMethod,
      invoiceId: invoiceId && invoiceId.trim() !== '' ? invoiceId : null,
      bankAccountId: bankAccountId && bankAccountId.trim() !== '' ? bankAccountId : null,
      bankCardId: bankCardId && bankCardId.trim() !== '' ? bankCardId : null,
      description: description !== undefined ? (description.trim() !== '' ? description.trim() : null) : undefined,
      referenceNumber: referenceNumber !== undefined ? (referenceNumber.trim() !== '' ? referenceNumber.trim() : null) : undefined,
      status,
      documentUrl: documentUrl !== undefined ? (documentUrl.trim() !== '' ? documentUrl : null) : undefined
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

