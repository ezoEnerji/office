import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Ödemeyi fatura para birimine çevir (kur dönüşümü ile)
const convertPaymentToInvoiceCurrency = (
  paymentAmount: number,
  paymentCurrency: string,
  paymentExchangeRate: number,
  invoiceCurrency: string
): number => {
  // Aynı para birimiyse dönüşüm gerekmez
  if (paymentCurrency === invoiceCurrency) {
    return paymentAmount;
  }
  
  // exchangeRate her zaman: payment currency / TRY veya TRY / agreement currency şeklinde
  // Örnek: 30,000 TRY ödeme, kur 34, fatura USD ise:
  // 30,000 / 34 = 882.35 USD
  
  // Ödeme TRY ise, fatura döviz → böl
  if (paymentCurrency === 'TRY') {
    return paymentAmount / paymentExchangeRate;
  }
  
  // Fatura TRY ise, ödeme döviz → çarp
  if (invoiceCurrency === 'TRY') {
    return paymentAmount * paymentExchangeRate;
  }
  
  // Her ikisi de döviz ama farklı para birimleri
  // Bu durumda exchangeRate genellikle payment currency / TRY olarak saklanır
  // Önce TRY'ye çevir, sonra fatura para birimine (ama invoice rate yok, bu sınırlı bir durum)
  // En iyi yaklaşım: ödeme tutarını doğrudan exchangeRate ile dönüştür
  return paymentAmount / paymentExchangeRate;
};

// Fatura için toplam ödenen tutarı hesapla (kur dönüşümü ile)
const calculateTotalPaidForInvoice = (
  payments: { amount: number; currency: string; exchangeRate: number; status: string }[],
  invoiceCurrency: string
): number => {
  return payments.reduce((sum, p) => {
    if (p.status !== 'completed') return sum;
    const convertedAmount = convertPaymentToInvoiceCurrency(
      p.amount,
      p.currency,
      p.exchangeRate || 1,
      invoiceCurrency
    );
    return sum + convertedAmount;
  }, 0);
};

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
      paymentType, paymentDate, amount, currency, exchangeRate, paymentMethod,
      invoiceId, bankAccountId, bankCardId, description, referenceNumber, status, documentUrl
    } = req.body;
    
    const userId = (req as any).user?.id;
    
    // Fatura bilgilerini al (projectId ve entityId için)
    let invoice: any = null;
    if (invoiceId && invoiceId.trim() !== '') {
      invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { project: true, entity: true, contract: true }
      });
    }
    
    const paymentData: any = {
      paymentType: paymentType || 'outgoing',
      paymentDate: new Date(paymentDate),
      amount: amount ? Number(amount) : 0,
      currency: currency || 'TRY',
      exchangeRate: exchangeRate ? Number(exchangeRate) : 1,
      paymentMethod: paymentMethod || 'transfer',
      invoiceId: invoiceId && invoiceId.trim() !== '' ? invoiceId : null,
      bankAccountId: bankAccountId && bankAccountId.trim() !== '' ? bankAccountId : null,
      bankCardId: bankCardId && bankCardId.trim() !== '' ? bankCardId : null,
      description: description && description.trim() !== '' ? description.trim() : null,
      referenceNumber: referenceNumber && referenceNumber.trim() !== '' ? referenceNumber.trim() : null,
      status: status || 'completed',
      documentUrl: documentUrl && documentUrl.trim() !== '' ? documentUrl : null
    };
    
    // Otomatik Transaction oluştur (eğer fatura ve proje varsa)
    let transactionId: string | null = null;
    console.log('Transaction oluşturma kontrol:', { 
      hasInvoice: !!invoice, 
      projectId: invoice?.projectId, 
      userId,
      paymentType 
    });
    
    if (invoice?.projectId && userId) {
      try {
        const transactionType = paymentType === 'incoming' ? 'income' : 'expense';
        const transactionDesc = `[Otomatik] ${paymentType === 'incoming' ? 'Gelen Ödeme' : 'Giden Ödeme'} - ${invoice.invoiceNumber || 'Fatura'}${referenceNumber ? ` (Ref: ${referenceNumber})` : ''}`;
        
        console.log('Transaction oluşturuluyor:', {
          projectId: invoice.projectId,
          type: transactionType,
          amount: amount ? Number(amount) : 0,
          currency: currency || 'TRY',
          exchangeRate: exchangeRate ? Number(exchangeRate) : 1,
          uploaderId: userId
        });
        
        const transaction = await prisma.transaction.create({
          data: {
            projectId: invoice.projectId,
            type: transactionType,
            amount: amount ? Number(amount) : 0,
            currency: currency || 'TRY',
            exchangeRate: exchangeRate ? Number(exchangeRate) : 1,
            date: new Date(paymentDate),
            description: transactionDesc,
            category: transactionType === 'income' ? 'Ödeme Girişi' : 'Ödeme Çıkışı',
            invoiceNumber: invoice.invoiceNumber || null,
            contractId: invoice.contractId || null,
            entityId: invoice.entityId || null,
            invoiceId: invoiceId,
            bankAccountId: bankAccountId && bankAccountId.trim() !== '' ? bankAccountId : null,
            bankCardId: bankCardId && bankCardId.trim() !== '' ? bankCardId : null,
            documentUrl: documentUrl && documentUrl.trim() !== '' ? documentUrl : null,
            isVatIncluded: false,
            isAutoGenerated: true,
            totalAmount: amount ? Number(amount) : 0,
            uploaderId: userId
          }
        });
        transactionId = transaction.id;
        console.log('Transaction başarıyla oluşturuldu:', transactionId);
      } catch (txError: any) {
        console.error('Transaction oluşturma hatası:', txError.message, txError);
        // Transaction oluşturulamazsa bile payment'ı oluşturmaya devam et
      }
    } else {
      console.log('Transaction oluşturulmadı - eksik bilgi:', { 
        hasProjectId: !!invoice?.projectId, 
        hasUserId: !!userId 
      });
    }
    
    // Transaction ID'yi Payment'a ekle
    paymentData.transactionId = transactionId;
    
    const payment = await prisma.payment.create({ data: paymentData });
    
    // Eğer faturaya bağlıysa, fatura durumunu güncelle
    if (payment.invoiceId) {
      const invoiceWithPayments = await prisma.invoice.findUnique({
        where: { id: payment.invoiceId },
        include: { payments: true }
      });
      
      if (invoiceWithPayments) {
        // Kur dönüşümü ile toplam ödenen tutarı hesapla
        const totalPaid = calculateTotalPaidForInvoice(
          invoiceWithPayments.payments,
          invoiceWithPayments.currency
        );
        let newStatus = invoiceWithPayments.status;
        
        // %1 tolerans ile karşılaştır (kur yuvarlama hataları için)
        const tolerance = invoiceWithPayments.totalAmount * 0.01;
        if (totalPaid >= invoiceWithPayments.totalAmount - tolerance) {
          newStatus = 'paid';
        } else if (invoiceWithPayments.status === 'draft' && totalPaid > 0) {
          newStatus = 'issued';
        } else if (invoiceWithPayments.dueDate && new Date() > new Date(invoiceWithPayments.dueDate) && newStatus !== 'paid') {
          newStatus = 'overdue';
        }
        
        await prisma.invoice.update({
          where: { id: invoiceWithPayments.id },
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
      paymentType, paymentDate, amount, currency, exchangeRate, paymentMethod,
      invoiceId, bankAccountId, bankCardId, description, referenceNumber, status, documentUrl
    } = req.body;
    
    // Mevcut payment'ı al (transactionId için)
    const existingPayment = await prisma.payment.findUnique({
      where: { id: req.params.id }
    });
    
    const data: any = {
      paymentType,
      paymentDate: paymentDate ? new Date(paymentDate) : undefined,
      amount: amount !== undefined ? Number(amount) : undefined,
      currency,
      exchangeRate: exchangeRate !== undefined ? Number(exchangeRate) : undefined,
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
    
    // Bağlı Transaction'ı güncelle (varsa)
    if (existingPayment?.transactionId) {
      const transactionType = (paymentType || existingPayment.paymentType) === 'incoming' ? 'income' : 'expense';
      
      // Fatura bilgilerini al
      let invoice: any = null;
      const finalInvoiceId = invoiceId !== undefined ? invoiceId : existingPayment.invoiceId;
      if (finalInvoiceId && finalInvoiceId.trim() !== '') {
        invoice = await prisma.invoice.findUnique({
          where: { id: finalInvoiceId }
        });
      }
      
      const transactionDesc = `[Otomatik] ${transactionType === 'income' ? 'Gelen Ödeme' : 'Giden Ödeme'} - ${invoice?.invoiceNumber || 'Fatura'}${referenceNumber ? ` (Ref: ${referenceNumber})` : ''}`;
      
      const transactionUpdateData: any = {
        type: transactionType,
        amount: amount !== undefined ? Number(amount) : undefined,
        currency: currency,
        exchangeRate: exchangeRate !== undefined ? Number(exchangeRate) : undefined,
        date: paymentDate ? new Date(paymentDate) : undefined,
        description: transactionDesc,
        category: transactionType === 'income' ? 'Ödeme Girişi' : 'Ödeme Çıkışı',
        invoiceNumber: invoice?.invoiceNumber || undefined,
        contractId: invoice?.contractId || undefined,
        entityId: invoice?.entityId || undefined,
        invoiceId: finalInvoiceId && finalInvoiceId.trim() !== '' ? finalInvoiceId : null,
        bankAccountId: bankAccountId !== undefined ? (bankAccountId && bankAccountId.trim() !== '' ? bankAccountId : null) : undefined,
        bankCardId: bankCardId !== undefined ? (bankCardId && bankCardId.trim() !== '' ? bankCardId : null) : undefined,
        documentUrl: documentUrl !== undefined ? (documentUrl && documentUrl.trim() !== '' ? documentUrl : null) : undefined,
        totalAmount: amount !== undefined ? Number(amount) : undefined
      };
      
      // undefined değerleri kaldır
      Object.keys(transactionUpdateData).forEach(key => {
        if (transactionUpdateData[key] === undefined) {
          delete transactionUpdateData[key];
        }
      });
      
      await prisma.transaction.update({
        where: { id: existingPayment.transactionId },
        data: transactionUpdateData
      });
    }
    
    // Fatura durumunu güncelle
    if (payment.invoiceId) {
      const invoiceWithPayments = await prisma.invoice.findUnique({
        where: { id: payment.invoiceId },
        include: { payments: true }
      });
      
      if (invoiceWithPayments) {
        // Kur dönüşümü ile toplam ödenen tutarı hesapla
        const totalPaid = calculateTotalPaidForInvoice(
          invoiceWithPayments.payments,
          invoiceWithPayments.currency
        );
        let newStatus = invoiceWithPayments.status;
        
        // %1 tolerans ile karşılaştır (kur yuvarlama hataları için)
        const tolerance = invoiceWithPayments.totalAmount * 0.01;
        if (totalPaid >= invoiceWithPayments.totalAmount - tolerance) {
          newStatus = 'paid';
        } else if (invoiceWithPayments.status === 'draft' && totalPaid > 0) {
          newStatus = 'issued';
        } else if (invoiceWithPayments.dueDate && new Date() > new Date(invoiceWithPayments.dueDate) && newStatus !== 'paid') {
          newStatus = 'overdue';
        }
        
        await prisma.invoice.update({
          where: { id: invoiceWithPayments.id },
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
    
    if (!payment) {
      return res.status(404).json({ error: 'Ödeme bulunamadı' });
    }
    
    // Önce bağlı Transaction'ı sil (varsa)
    if (payment.transactionId) {
      try {
        await prisma.transaction.delete({
          where: { id: payment.transactionId }
        });
      } catch (txError: any) {
        console.warn('Bağlı transaction silinemedi:', txError.message);
      }
    }
    
    await prisma.payment.delete({
      where: { id: req.params.id }
    });
    
    // Fatura durumunu güncelle
    if (payment.invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: payment.invoiceId },
        include: { payments: true }
      });
      
      if (invoice) {
        // Kur dönüşümü ile toplam ödenen tutarı hesapla
        const totalPaid = calculateTotalPaidForInvoice(
          invoice.payments,
          invoice.currency
        );
        let newStatus = invoice.status;
        
        // %1 tolerans ile karşılaştır (kur yuvarlama hataları için)
        const tolerance = invoice.totalAmount * 0.01;
        if (totalPaid >= invoice.totalAmount - tolerance) {
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

