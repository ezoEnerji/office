import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  X,
  Search,
  FileText,
  Wallet,
  CreditCard,
  Calendar,
  DollarSign,
  Building2,
  Briefcase,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  ArrowDown,
  ArrowUp
} from 'lucide-react';
import { Invoice, Payment, Company, Project, Entity, Contract, BankAccount, BankCard, Currency, InvoiceType, InvoiceStatus, PaymentMethod, PaymentStatus } from '../types';
import { apiService } from '../services/api';
import { formatCurrency } from '../utils/helpers';

interface InvoiceManagementProps {
  companies: Company[];
  projects: Project[];
  entities: Entity[];
  contracts: Contract[];
  hasPermission: (perm: string) => boolean;
  onRefresh?: () => void;
}

type TabType = 'invoices' | 'payments';

const INVOICE_STATUS_LABELS: Record<InvoiceStatus, { label: string; color: string }> = {
  draft: { label: 'Taslak', color: 'bg-slate-100 text-slate-600' },
  issued: { label: 'Kesildi', color: 'bg-blue-100 text-blue-600' },
  paid: { label: 'Ödendi', color: 'bg-green-100 text-green-600' },
  cancelled: { label: 'İptal', color: 'bg-red-100 text-red-600' },
  overdue: { label: 'Vadesi Geçti', color: 'bg-orange-100 text-orange-600' }
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, { label: string; color: string }> = {
  pending: { label: 'Bekliyor', color: 'bg-yellow-100 text-yellow-600' },
  completed: { label: 'Tamamlandı', color: 'bg-green-100 text-green-600' },
  failed: { label: 'Başarısız', color: 'bg-red-100 text-red-600' },
  cancelled: { label: 'İptal', color: 'bg-slate-100 text-slate-600' }
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Nakit',
  transfer: 'Havale/EFT',
  card: 'Kart',
  check: 'Çek'
};

export const InvoiceManagement: React.FC<InvoiceManagementProps> = ({
  companies,
  projects,
  entities,
  contracts,
  hasPermission,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('invoices');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | PaymentStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<InvoiceType | 'all'>('all');
  
  // Data states
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankCards, setBankCards] = useState<BankCard[]>([]);
  
  // Modal states
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  
  // Invoice form
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: '',
    invoiceType: 'outgoing' as InvoiceType,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    amount: 0,
    vatAmount: 0,
    totalAmount: 0,
    currency: 'TRY' as Currency,
    status: 'draft' as InvoiceStatus,
    projectId: '',
    companyId: '',
    entityId: '',
    contractId: '',
    description: '',
    isVatIncluded: false,
    taxes: [] as any[],
    notes: ''
  });
  
  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    amount: 0,
    currency: 'TRY' as Currency,
    paymentMethod: 'transfer' as PaymentMethod,
    invoiceId: '',
    bankAccountId: '',
    bankCardId: '',
    description: '',
    referenceNumber: '',
    status: 'completed' as PaymentStatus
  });

  // Load data
  useEffect(() => {
    if (selectedCompany) {
      loadData();
      loadBankData();
    } else {
      setInvoices([]);
      setPayments([]);
    }
  }, [selectedCompany, activeTab]);

  const loadData = async () => {
    if (!selectedCompany) return;
    
    try {
      if (activeTab === 'invoices') {
        const data = await apiService.getInvoices({ companyId: selectedCompany.id });
        setInvoices(data);
      } else {
        const data = await apiService.getPayments();
        setPayments(data);
      }
    } catch (error: any) {
      alert('Veri yüklenirken hata oluştu: ' + error.message);
    }
  };

  const loadBankData = async () => {
    if (!selectedCompany) return;
    
    try {
      const [accounts, cards] = await Promise.all([
        apiService.getBankAccounts(selectedCompany.id),
        apiService.getBankCards(selectedCompany.id)
      ]);
      setBankAccounts(accounts.filter(a => a.isActive));
      setBankCards(cards.filter(c => c.isActive));
    } catch (error: any) {
      console.error('Banka verileri yüklenirken hata:', error);
    }
  };

  // Invoice handlers
  const openInvoiceModal = (invoice?: Invoice) => {
    if (invoice) {
      setEditingInvoice(invoice);
      setInvoiceForm({
        invoiceNumber: invoice.invoiceNumber,
        invoiceType: invoice.invoiceType,
        invoiceDate: invoice.invoiceDate.split('T')[0],
        dueDate: invoice.dueDate ? invoice.dueDate.split('T')[0] : '',
        amount: invoice.amount,
        vatAmount: invoice.vatAmount,
        totalAmount: invoice.totalAmount,
        currency: invoice.currency,
        status: invoice.status,
        projectId: invoice.projectId || '',
        companyId: invoice.companyId,
        entityId: invoice.entityId,
        contractId: invoice.contractId || '',
        description: invoice.description || '',
        isVatIncluded: invoice.isVatIncluded,
        taxes: invoice.taxes || [],
        notes: invoice.notes || ''
      });
    } else {
      setEditingInvoice(null);
      setInvoiceForm({
        invoiceNumber: '',
        invoiceType: 'outgoing',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        amount: 0,
        vatAmount: 0,
        totalAmount: 0,
        currency: 'TRY',
        status: 'draft',
        projectId: '',
        companyId: selectedCompany?.id || '',
        entityId: '',
        contractId: '',
        description: '',
        isVatIncluded: false,
        taxes: [],
        notes: ''
      });
    }
    setIsInvoiceModalOpen(true);
  };

  const handleSaveInvoice = async () => {
    if (!invoiceForm.invoiceNumber || !invoiceForm.companyId || !invoiceForm.entityId) {
      alert('Fatura numarası, şirket ve cari hesap zorunludur.');
      return;
    }

    try {
      const data = {
        ...invoiceForm,
        projectId: invoiceForm.projectId || null,
        contractId: invoiceForm.contractId || null,
        dueDate: invoiceForm.dueDate || null
      };
      
      if (editingInvoice) {
        await apiService.updateInvoice(editingInvoice.id, data);
      } else {
        await apiService.createInvoice(data);
      }
      setIsInvoiceModalOpen(false);
      loadData();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert('Kayıt sırasında hata oluştu: ' + error.message);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm('Bu faturayı silmek istediğinizden emin misiniz?')) return;
    try {
      await apiService.deleteInvoice(id);
      loadData();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert('Silme işlemi sırasında hata oluştu: ' + error.message);
    }
  };

  // Payment handlers
  const openPaymentModal = (payment?: Payment, invoice?: Invoice) => {
    if (payment) {
      setEditingPayment(payment);
      setSelectedInvoiceForPayment(payment.invoice || null);
      setPaymentForm({
        paymentDate: payment.paymentDate.split('T')[0],
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        invoiceId: payment.invoiceId || '',
        bankAccountId: payment.bankAccountId || '',
        bankCardId: payment.bankCardId || '',
        description: payment.description || '',
        referenceNumber: payment.referenceNumber || '',
        status: payment.status
      });
    } else {
      setEditingPayment(null);
      setSelectedInvoiceForPayment(invoice || null);
      setPaymentForm({
        paymentDate: new Date().toISOString().split('T')[0],
        amount: invoice?.totalAmount || 0,
        currency: invoice?.currency || 'TRY',
        paymentMethod: 'transfer',
        invoiceId: invoice?.id || '',
        bankAccountId: '',
        bankCardId: '',
        description: '',
        referenceNumber: '',
        status: 'completed'
      });
    }
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = async () => {
    if (!paymentForm.amount || !paymentForm.paymentDate) {
      alert('Ödeme tutarı ve tarihi zorunludur.');
      return;
    }

    try {
      const data = {
        ...paymentForm,
        invoiceId: paymentForm.invoiceId || null,
        bankAccountId: paymentForm.bankAccountId || null,
        bankCardId: paymentForm.bankCardId || null
      };
      
      if (editingPayment) {
        await apiService.updatePayment(editingPayment.id, data);
      } else {
        await apiService.createPayment(data);
      }
      setIsPaymentModalOpen(false);
      loadData();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert('Kayıt sırasında hata oluştu: ' + error.message);
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm('Bu ödemeyi silmek istediğinizden emin misiniz?')) return;
    try {
      await apiService.deletePayment(id);
      loadData();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert('Silme işlemi sırasında hata oluştu: ' + error.message);
    }
  };

  // Calculate invoice paid amount
  const getInvoicePaidAmount = (invoice: Invoice): number => {
    if (!invoice.payments) return 0;
    return invoice.payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
  };

  // Filter data
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.entity?.name && inv.entity.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (inv.description && inv.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
    const matchesType = filterType === 'all' || inv.invoiceType === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const filteredPayments = payments.filter(pay => {
    const matchesSearch = 
      (pay.referenceNumber && pay.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (pay.description && pay.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (pay.invoice?.invoiceNumber && pay.invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || pay.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Fatura ve Ödeme Yönetimi</h1>
      </div>

      {/* Company Selector */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Şirket Seçin
        </label>
        <select
          value={selectedCompany?.id || ''}
          onChange={(e) => {
            const company = companies.find(c => c.id === e.target.value);
            setSelectedCompany(company || null);
            setSearchQuery('');
          }}
          className="w-full md:w-96 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Şirket seçin...</option>
          {companies.map(company => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </div>

      {selectedCompany && (
        <>
          {/* Tabs */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => { setActiveTab('invoices'); setSearchQuery(''); setFilterStatus('all'); }}
                className={`px-6 py-3 font-medium transition ${
                  activeTab === 'invoices'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText size={18} />
                  Faturalar ({invoices.length})
                </div>
              </button>
              <button
                onClick={() => { setActiveTab('payments'); setSearchQuery(''); setFilterStatus('all'); }}
                className={`px-6 py-3 font-medium transition ${
                  activeTab === 'payments'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Wallet size={18} />
                  Ödemeler ({payments.length})
                </div>
              </button>
            </div>

            {/* Search and Filters */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              
              {activeTab === 'invoices' && (
                <>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tüm Tipler</option>
                    <option value="incoming">Gelen Faturalar</option>
                    <option value="outgoing">Giden Faturalar</option>
                  </select>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tüm Durumlar</option>
                    <option value="draft">Taslak</option>
                    <option value="issued">Kesildi</option>
                    <option value="paid">Ödendi</option>
                    <option value="overdue">Vadesi Geçti</option>
                    <option value="cancelled">İptal</option>
                  </select>
                </>
              )}
              
              {activeTab === 'payments' && (
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tüm Durumlar</option>
                  <option value="pending">Bekliyor</option>
                  <option value="completed">Tamamlandı</option>
                  <option value="failed">Başarısız</option>
                  <option value="cancelled">İptal</option>
                </select>
              )}
              
              {hasPermission('MANAGE_INVOICES') && (
                <button
                  onClick={() => {
                    if (activeTab === 'invoices') openInvoiceModal();
                    else openPaymentModal();
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition text-sm font-medium"
                >
                  <Plus size={16} />
                  {activeTab === 'invoices' ? 'Yeni Fatura' : 'Yeni Ödeme'}
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-5">
              {/* Invoices Tab */}
              {activeTab === 'invoices' && (
                <div className="space-y-3">
                  {filteredInvoices.length > 0 ? (
                    filteredInvoices.map(invoice => {
                      const paidAmount = getInvoicePaidAmount(invoice);
                      const remainingAmount = invoice.totalAmount - paidAmount;
                      const paidPercent = invoice.totalAmount > 0 ? (paidAmount / invoice.totalAmount) * 100 : 0;
                      
                      return (
                        <div key={invoice.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-bold text-slate-800">{invoice.invoiceNumber}</h3>
                                <span className={`text-xs px-2 py-0.5 rounded ${INVOICE_STATUS_LABELS[invoice.status].color}`}>
                                  {INVOICE_STATUS_LABELS[invoice.status].label}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  invoice.invoiceType === 'incoming' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                                }`}>
                                  {invoice.invoiceType === 'incoming' ? 'Gelen' : 'Giden'}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-slate-600 mb-2">
                                <div><span className="font-medium">Cari:</span> {invoice.entity?.name}</div>
                                {invoice.project && (
                                  <div><span className="font-medium">Proje:</span> {invoice.project.name}</div>
                                )}
                                <div><span className="font-medium">Tarih:</span> {new Date(invoice.invoiceDate).toLocaleDateString('tr-TR')}</div>
                                {invoice.dueDate && (
                                  <div><span className="font-medium">Vade:</span> {new Date(invoice.dueDate).toLocaleDateString('tr-TR')}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mb-2">
                                <div>
                                  <span className="text-xs text-slate-500">Toplam:</span>{' '}
                                  <span className="font-bold text-slate-800">{formatCurrency(invoice.totalAmount, invoice.currency)}</span>
                                </div>
                                {paidAmount > 0 && (
                                  <>
                                    <div>
                                      <span className="text-xs text-slate-500">Ödendi:</span>{' '}
                                      <span className="font-bold text-green-600">{formatCurrency(paidAmount, invoice.currency)}</span>
                                    </div>
                                    <div>
                                      <span className="text-xs text-slate-500">Kalan:</span>{' '}
                                      <span className="font-bold text-red-600">{formatCurrency(remainingAmount, invoice.currency)}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                              {paidAmount > 0 && (
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${paidPercent === 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
                                    style={{ width: `${Math.min(100, paidPercent)}%` }}
                                  />
                                </div>
                              )}
                              {invoice.payments && invoice.payments.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-slate-100">
                                  <div className="text-xs text-slate-500 mb-1">Ödemeler:</div>
                                  {invoice.payments.map(payment => (
                                    <div key={payment.id} className="text-xs text-slate-600 flex items-center gap-2">
                                      <span>{formatCurrency(payment.amount, payment.currency)}</span>
                                      <span className="text-slate-400">-</span>
                                      <span>{new Date(payment.paymentDate).toLocaleDateString('tr-TR')}</span>
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${PAYMENT_STATUS_LABELS[payment.status].color}`}>
                                        {PAYMENT_STATUS_LABELS[payment.status].label}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            {hasPermission('MANAGE_INVOICES') && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => openPaymentModal(undefined, invoice)}
                                  className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                                  title="Ödeme Ekle"
                                >
                                  <Wallet size={18} />
                                </button>
                                <button
                                  onClick={() => openInvoiceModal(invoice)}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                >
                                  <Edit size={18} />
                                </button>
                                <button
                                  onClick={() => handleDeleteInvoice(invoice.id)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-slate-400">
                      <FileText size={48} className="mx-auto mb-3 text-slate-200" />
                      <p>{searchQuery ? 'Arama sonucu bulunamadı' : 'Henüz fatura eklenmemiş'}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Payments Tab */}
              {activeTab === 'payments' && (
                <div className="space-y-3">
                  {filteredPayments.length > 0 ? (
                    filteredPayments.map(payment => (
                      <div key={payment.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-bold text-slate-800">
                                {formatCurrency(payment.amount, payment.currency)}
                              </h3>
                              <span className={`text-xs px-2 py-0.5 rounded ${PAYMENT_STATUS_LABELS[payment.status].color}`}>
                                {PAYMENT_STATUS_LABELS[payment.status].label}
                              </span>
                              <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded">
                                {PAYMENT_METHOD_LABELS[payment.paymentMethod]}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600 mb-2">
                              <div><span className="font-medium">Tarih:</span> {new Date(payment.paymentDate).toLocaleDateString('tr-TR')}</div>
                              {payment.invoice && (
                                <div><span className="font-medium">Fatura:</span> {payment.invoice.invoiceNumber}</div>
                              )}
                              {payment.bankAccount && (
                                <div><span className="font-medium">Hesap:</span> {payment.bankAccount.accountName}</div>
                              )}
                              {payment.bankCard && (
                                <div><span className="font-medium">Kart:</span> {payment.bankCard.cardName}</div>
                              )}
                              {payment.referenceNumber && (
                                <div><span className="font-medium">Referans:</span> {payment.referenceNumber}</div>
                              )}
                            </div>
                            {payment.description && (
                              <div className="text-xs text-slate-500 mt-2">{payment.description}</div>
                            )}
                          </div>
                          {hasPermission('MANAGE_INVOICES') && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => openPaymentModal(payment)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleDeletePayment(payment.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-slate-400">
                      <Wallet size={48} className="mx-auto mb-3 text-slate-200" />
                      <p>{searchQuery ? 'Arama sonucu bulunamadı' : 'Henüz ödeme eklenmemiş'}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Invoice Modal */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-800">
                {editingInvoice ? 'Fatura Düzenle' : 'Yeni Fatura'}
              </h2>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fatura Numarası *</label>
                  <input
                    type="text"
                    value={invoiceForm.invoiceNumber}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fatura Tipi</label>
                  <select
                    value={invoiceForm.invoiceType}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceType: e.target.value as InvoiceType })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="incoming">Gelen Fatura</option>
                    <option value="outgoing">Giden Fatura</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fatura Tarihi *</label>
                  <input
                    type="date"
                    value={invoiceForm.invoiceDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vade Tarihi</label>
                  <input
                    type="date"
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cari Hesap *</label>
                  <select
                    value={invoiceForm.entityId}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, entityId: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seçin...</option>
                    {entities.map(entity => (
                      <option key={entity.id} value={entity.id}>{entity.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Proje</label>
                  <select
                    value={invoiceForm.projectId}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, projectId: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seçin...</option>
                    {projects.filter(p => p.companyId === selectedCompany?.id).map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sözleşme</label>
                <select
                  value={invoiceForm.contractId}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, contractId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seçin...</option>
                  {contracts.filter(c => c.projectId === invoiceForm.projectId).map(contract => (
                    <option key={contract.id} value={contract.id}>{contract.name} ({contract.code})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tutar (KDV Hariç)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={invoiceForm.amount}
                    onChange={(e) => {
                      const amount = parseFloat(e.target.value) || 0;
                      const vatAmount = invoiceForm.isVatIncluded ? 0 : amount * 0.20; // %20 KDV varsayımı
                      setInvoiceForm({ 
                        ...invoiceForm, 
                        amount,
                        vatAmount,
                        totalAmount: amount + vatAmount
                      });
                    }}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">KDV</label>
                  <input
                    type="number"
                    step="0.01"
                    value={invoiceForm.vatAmount}
                    onChange={(e) => {
                      const vatAmount = parseFloat(e.target.value) || 0;
                      setInvoiceForm({ 
                        ...invoiceForm, 
                        vatAmount,
                        totalAmount: invoiceForm.amount + vatAmount
                      });
                    }}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Toplam</label>
                  <input
                    type="number"
                    step="0.01"
                    value={invoiceForm.totalAmount}
                    readOnly
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Para Birimi</label>
                  <select
                    value={invoiceForm.currency}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, currency: e.target.value as Currency })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="TRY">TRY</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Durum</label>
                <select
                  value={invoiceForm.status}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, status: e.target.value as InvoiceStatus })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Taslak</option>
                  <option value="issued">Kesildi</option>
                  <option value="paid">Ödendi</option>
                  <option value="cancelled">İptal</option>
                  <option value="overdue">Vadesi Geçti</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
                <textarea
                  value={invoiceForm.description}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                İptal
              </button>
              <button
                onClick={handleSaveInvoice}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-800">
                {editingPayment ? 'Ödeme Düzenle' : 'Yeni Ödeme'}
              </h2>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {selectedInvoiceForPayment && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-sm text-blue-800">
                    <span className="font-medium">Fatura:</span> {selectedInvoiceForPayment.invoiceNumber} - 
                    Kalan: {formatCurrency(selectedInvoiceForPayment.totalAmount - getInvoicePaidAmount(selectedInvoiceForPayment), selectedInvoiceForPayment.currency)}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ödeme Tarihi *</label>
                  <input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ödeme Yöntemi</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as PaymentMethod })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cash">Nakit</option>
                    <option value="transfer">Havale/EFT</option>
                    <option value="card">Kart</option>
                    <option value="check">Çek</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tutar *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Para Birimi</label>
                  <select
                    value={paymentForm.currency}
                    onChange={(e) => setPaymentForm({ ...paymentForm, currency: e.target.value as Currency })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="TRY">TRY</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fatura</label>
                <select
                  value={paymentForm.invoiceId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, invoiceId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Bağımsız Ödeme</option>
                  {invoices
                    .filter(inv => inv.companyId === selectedCompany?.id)
                    .map(invoice => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoiceNumber} - {formatCurrency(invoice.totalAmount - getInvoicePaidAmount(invoice), invoice.currency)} kalan
                      </option>
                    ))
                  }
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Banka Hesabı</label>
                  <select
                    value={paymentForm.bankAccountId}
                    onChange={(e) => {
                      setPaymentForm({ ...paymentForm, bankAccountId: e.target.value, bankCardId: '' });
                    }}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seçin...</option>
                    {bankAccounts
                      .filter(a => a.currency === paymentForm.currency)
                      .map(account => (
                        <option key={account.id} value={account.id}>
                          {account.accountName} - {account.bankName}
                        </option>
                      ))
                    }
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Banka Kartı</label>
                  <select
                    value={paymentForm.bankCardId}
                    onChange={(e) => {
                      setPaymentForm({ ...paymentForm, bankCardId: e.target.value, bankAccountId: '' });
                    }}
                    disabled={!!paymentForm.bankAccountId}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  >
                    <option value="">Seçin...</option>
                    {bankCards.map(card => (
                      <option key={card.id} value={card.id}>
                        {card.cardName} - {card.bankName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Referans Numarası</label>
                <input
                  type="text"
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Dekont no, çek no vb."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
                <textarea
                  value={paymentForm.description}
                  onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Durum</label>
                <select
                  value={paymentForm.status}
                  onChange={(e) => setPaymentForm({ ...paymentForm, status: e.target.value as PaymentStatus })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Bekliyor</option>
                  <option value="completed">Tamamlandı</option>
                  <option value="failed">Başarısız</option>
                  <option value="cancelled">İptal</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                İptal
              </button>
              <button
                onClick={handleSavePayment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

