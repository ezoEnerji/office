import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  X, 
  Briefcase, 
  Building2, 
  ArrowRightLeft, 
  Bot, 
  Edit, 
  Trash2, 
  FileText, 
  CheckCircle, 
  TrendingUp, 
  Calculator, 
  RefreshCw, 
  AlertCircle, 
  MapPin,
  ArrowUp,
  ArrowDown,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Layers,
  CreditCard,
  Wallet,
  FileSignature,
  Receipt,
  Calendar,
  Clock,
  DollarSign,
  ExternalLink,
  Eye,
  Upload,
  Loader2,
  Link
} from 'lucide-react';
import { Project, Transaction, Company, User, ProjectStatus, Currency, ProjectPriority, PermissionType, Entity, TaxItem, Contract, Tax, BankAccount, BankCard } from '../types';
import { PROJECT_STATUS_LABELS, PROJECT_PRIORITY_LABELS, MARKET_RATES } from '../data/constants';
import { formatCurrency, getCrossRate, fetchTCMBRate } from '../utils/helpers';

import { apiService } from '../services/api';

interface ProjectManagementProps {
  projects: Project[];
  setProjects: (projects: Project[]) => void;
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  companies: Company[];
  users: User[];
  entities: Entity[];
  contracts: Contract[];
  taxes: Tax[];
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
  analyzeProject: (project: Project) => void;
  aiAnalysis: string;
  isAnalyzing: boolean;
  hasPermission: (perm: PermissionType) => boolean;
  onRefresh?: () => Promise<void> | void;
  onRefreshTransactions?: () => Promise<void> | void;
}

export const ProjectManagement: React.FC<ProjectManagementProps> = ({
  projects,
  setProjects,
  transactions,
  setTransactions,
  companies,
  users,
  entities,
  contracts,
  taxes,
  selectedProject,
  setSelectedProject,
  analyzeProject,
  aiAnalysis,
  isAnalyzing,
  hasPermission,
  onRefresh,
  onRefreshTransactions
}) => {
  // Detail view sub-tabs
  const [detailTab, setDetailTab] = useState<'overview' | 'financials' | 'contracts' | 'invoices'>('overview');
  
  // Transaction table sorting and grouping
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [groupBy, setGroupBy] = useState<'none' | 'date' | 'category' | 'date-category'>('none');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // Transaction table search and pagination
  const [transactionSearch, setTransactionSearch] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Project List States
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [projectFilterCompany, setProjectFilterCompany] = useState<string>('all');
  const [projectFilterStatus, setProjectFilterStatus] = useState<ProjectStatus | 'all'>('all');

  // Transaction Form State
  const [newTrans, setNewTrans] = useState<Partial<Transaction>>({
    type: 'expense',
    currency: 'TRY',
    amount: 0,
    description: '',
    category: 'Genel',
    date: new Date().toISOString().split('T')[0],
    exchangeRate: 1,
    invoiceNumber: '',
    documentUrl: '',
    taxes: [],
    isVatIncluded: false, // Varsayılan: KDV hariç
    bankAccountId: '',
    bankCardId: ''
  });
  
  // Bank accounts and cards for selected project's company
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankCards, setBankCards] = useState<BankCard[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  
  // Invoices tab filters
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('all');
  const [invoiceEntityFilter, setInvoiceEntityFilter] = useState<string>('all');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  
  // Contract Modal State
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [editingContractData, setEditingContractData] = useState<Contract | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [contractFileUploading, setContractFileUploading] = useState(false);
  const [viewingContract, setViewingContract] = useState<Contract | null>(null); // Detail view
  const [contractFormData, setContractFormData] = useState({
    code: '',
    name: '',
    type: 'subcontractor_agreement' as Contract['type'],
    status: 'draft' as Contract['status'],
    projectId: '',
    companyId: '',
    entityId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    amount: 0,
    currency: 'TRY' as Currency,
    paymentTerms: '',
    description: '',
    isVatIncluded: false,
    attachments: [] as string[],
    documentUrl: ''
  });
  
  // Invoice Modal State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [editingInvoiceData, setEditingInvoiceData] = useState<any | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceFileUploading, setInvoiceFileUploading] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null); // Detail view
  const [invoiceFormData, setInvoiceFormData] = useState({
    invoiceNumber: '',
    invoiceType: 'incoming' as 'incoming' | 'outgoing',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    amount: 0,
    taxes: [] as TaxItem[],
    vatAmount: 0,
    totalAmount: 0,
    currency: 'TRY' as Currency,
    status: 'draft' as 'draft' | 'issued' | 'paid' | 'cancelled' | 'overdue',
    projectId: '',
    companyId: '',
    entityId: '',
    contractId: '',
    description: '',
    isVatIncluded: false,
    documentUrl: ''
  });
  const [invoiceSelectedTaxId, setInvoiceSelectedTaxId] = useState<string>('');
  
  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPaymentData, setEditingPaymentData] = useState<any | null>(null);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paymentFileUploading, setPaymentFileUploading] = useState(false);
  const [viewingPayment, setViewingPayment] = useState<any | null>(null); // Detail view
  const [paymentFormData, setPaymentFormData] = useState({
    paymentType: 'outgoing' as 'incoming' | 'outgoing', // incoming = gelen ödeme, outgoing = giden ödeme
    paymentDate: new Date().toISOString().split('T')[0],
    amount: 0,
    currency: 'TRY' as Currency,
    paymentMethod: 'transfer' as 'cash' | 'transfer' | 'card' | 'check',
    invoiceId: '',
    bankAccountId: '',
    bankCardId: '',
    description: '',
    referenceNumber: '',
    status: 'completed' as 'pending' | 'completed' | 'failed' | 'cancelled',
    documentUrl: ''
  });
  
  // Load bank accounts and cards when project changes
  useEffect(() => {
    if (selectedProject) {
      const projectCompany = companies.find(c => c.id === selectedProject.companyId);
      if (projectCompany) {
        loadBankData(projectCompany.id);
        loadInvoices(projectCompany.id);
        loadPayments();
      }
    } else {
      setBankAccounts([]);
      setBankCards([]);
      setInvoices([]);
      setPayments([]);
    }
  }, [selectedProject, companies]);
  
  const loadBankData = async (companyId: string) => {
    try {
      const [accounts, cards] = await Promise.all([
        apiService.getBankAccounts(companyId),
        apiService.getBankCards(companyId)
      ]);
      setBankAccounts(accounts.filter(a => a.isActive));
      setBankCards(cards.filter(c => c.isActive));
    } catch (error: any) {
      console.error('Banka verileri yüklenirken hata:', error);
    }
  };
  
  const loadInvoices = async (companyId: string) => {
    try {
      const data = await apiService.getInvoices({ companyId });
      setInvoices(data);
    } catch (error: any) {
      console.error('Faturalar yüklenirken hata:', error);
    }
  };
  
  const loadPayments = async () => {
    try {
      const data = await apiService.getPayments({});
      setPayments(data);
    } catch (error: any) {
      console.error('Ödemeler yüklenirken hata:', error);
    }
  };
  
  // Contract Modal Handlers
  const openContractModal = (contract?: Contract) => {
    setContractFile(null); // Reset file
    if (contract) {
      setEditingContractData(contract);
      setContractFormData({
        code: contract.code,
        name: contract.name,
        type: contract.type,
        status: contract.status,
        projectId: contract.projectId,
        companyId: contract.companyId,
        entityId: contract.entityId,
        startDate: contract.startDate ? new Date(contract.startDate).toISOString().split('T')[0] : '',
        endDate: contract.endDate ? new Date(contract.endDate).toISOString().split('T')[0] : '',
        amount: contract.amount,
        currency: contract.currency,
        paymentTerms: contract.paymentTerms || '',
        description: contract.description || '',
        isVatIncluded: contract.isVatIncluded || false,
        attachments: contract.attachments || [],
        documentUrl: (contract as any).documentUrl || ''
      });
    } else {
      setEditingContractData(null);
      // Benzersiz kod oluştur: Proje kodu + toplam sözleşme sayısı + timestamp
      const allContractsCount = contracts.length;
      const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
      const projectCode = selectedProject?.code?.replace(/[^A-Z0-9]/gi, '').slice(0, 8) || 'CNT';
      setContractFormData({
        code: `${projectCode}-${new Date().getFullYear()}-${String(allContractsCount + 1).padStart(3, '0')}-${timestamp}`,
        name: '',
        type: 'subcontractor_agreement',
        status: 'draft',
        projectId: selectedProject?.id || '',
        companyId: selectedProject?.companyId || '',
        entityId: entities[0]?.id || '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        amount: 0,
        currency: selectedProject?.agreementCurrency || 'TRY',
        paymentTerms: '',
        description: '',
        isVatIncluded: false,
        attachments: [],
        documentUrl: ''
      });
    }
    setIsContractModalOpen(true);
  };
  
  const handleSaveContract = async () => {
    if (!contractFormData.name || !contractFormData.entityId || !contractFormData.startDate || !contractFormData.endDate) {
      alert('Sözleşme adı, taraf, başlangıç ve bitiş tarihi zorunludur.');
      return;
    }
    try {
      let documentUrl = contractFormData.documentUrl;
      
      // Dosya seçildiyse önce yükle
      if (contractFile) {
        setContractFileUploading(true);
        try {
          const uploadResult = await apiService.uploadToGoogleDrive(contractFile, {
            category: 'contract',
            projectId: selectedProject?.id,
            projectCode: selectedProject?.code,
            projectName: selectedProject?.name,
            contractId: editingContractData?.id,
            contractCode: contractFormData.code,
            contractName: contractFormData.name
          });
          documentUrl = uploadResult.webViewLink || uploadResult.downloadUrl;
        } catch (uploadError: any) {
          alert('Dosya yüklenirken hata: ' + uploadError.message);
          setContractFileUploading(false);
          return;
        }
        setContractFileUploading(false);
      }
      
      const dataToSave = { ...contractFormData, documentUrl };
      
      if (editingContractData) {
        await apiService.updateContract(editingContractData.id, dataToSave);
      } else {
        await apiService.createContract(dataToSave);
      }
      setIsContractModalOpen(false);
      setEditingContractData(null);
      setContractFile(null);
      setSelectedContractId(null);
      setSelectedInvoiceId(null);
      if (onRefresh) await onRefresh();
    } catch (error: any) {
      alert(error.message || 'Kayıt sırasında bir hata oluştu');
    }
  };
  
  const handleDeleteContract = async (id: string) => {
    if (confirm('Sözleşmeyi silmek istediğinize emin misiniz?')) {
      try {
        await apiService.deleteContract(id);
        setSelectedContractId(null);
        setSelectedInvoiceId(null);
        if (onRefresh) await onRefresh();
      } catch (error: any) {
        alert(error.message || 'Silme sırasında bir hata oluştu');
      }
    }
  };
  
  // Invoice Modal Handlers
  const openInvoiceModal = (invoice?: any) => {
    setInvoiceFile(null); // Reset file
    if (invoice) {
      setEditingInvoiceData(invoice);
      setInvoiceFormData({
        invoiceNumber: invoice.invoiceNumber,
        invoiceType: invoice.invoiceType,
        invoiceDate: invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString().split('T')[0] : '',
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
        amount: invoice.amount,
        taxes: invoice.taxes && Array.isArray(invoice.taxes) ? invoice.taxes : [],
        vatAmount: invoice.vatAmount,
        totalAmount: invoice.totalAmount,
        currency: invoice.currency,
        status: invoice.status,
        projectId: invoice.projectId || '',
        companyId: invoice.companyId,
        entityId: invoice.entityId,
        contractId: invoice.contractId || '',
        description: invoice.description || '',
        isVatIncluded: invoice.isVatIncluded || false,
        documentUrl: invoice.documentUrl || ''
      });
    } else {
      setEditingInvoiceData(null);
      const year = new Date().getFullYear();
      const projectInvoices = invoices.filter(inv => inv.projectId === selectedProject?.id);
      const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
      setInvoiceFormData({
        invoiceNumber: `INV${year}${String(projectInvoices.length + 1).padStart(4, '0')}${timestamp}`,
        invoiceType: 'incoming',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        amount: 0,
        taxes: [],
        vatAmount: 0,
        totalAmount: 0,
        currency: selectedProject?.agreementCurrency || 'TRY',
        status: 'draft',
        projectId: selectedProject?.id || '',
        companyId: selectedProject?.companyId || '',
        entityId: selectedContractId ? contracts.find(c => c.id === selectedContractId)?.entityId || '' : '',
        contractId: selectedContractId || '',
        description: '',
        isVatIncluded: false,
        documentUrl: ''
      });
    }
    setInvoiceSelectedTaxId('');
    setIsInvoiceModalOpen(true);
  };
  
  // Invoice Tax Functions
  const addInvoiceTax = () => {
    if (!invoiceFormData.amount || !invoiceSelectedTaxId) {
      alert('Lütfen önce tutar girin ve bir vergi seçin');
      return;
    }
    
    const selectedTax = taxes.find(t => t.id === invoiceSelectedTaxId);
    if (!selectedTax) return;
    
    // Aynı vergi zaten eklenmişse uyar
    if (invoiceFormData.taxes.some(t => t.taxId === selectedTax.id)) {
      alert('Bu vergi zaten eklenmiş');
      return;
    }
    
    // Hesaplama tabanına göre base amount'u belirle
    let baseAmount: number;
    if (selectedTax.baseType === 'amount') {
      baseAmount = invoiceFormData.amount;
    } else if (selectedTax.baseType === 'vat') {
      const kdvTax = invoiceFormData.taxes.find(t => t.name.toLowerCase().includes('kdv'));
      baseAmount = kdvTax ? kdvTax.amount : (invoiceFormData.amount * 0.20);
    } else {
      const currentTotal = invoiceFormData.taxes.reduce((sum, t) => sum + t.amount, 0);
      baseAmount = invoiceFormData.amount + currentTotal;
    }
    
    // Hesaplama tipine göre vergi tutarını hesapla
    let taxAmount: number;
    if (selectedTax.calculationType === 'percentage') {
      taxAmount = (baseAmount * selectedTax.rate) / 100;
    } else {
      taxAmount = selectedTax.rate;
    }
    
    // KDV dahil durumuna göre düzeltme
    if (selectedTax.baseType === 'amount' && invoiceFormData.isVatIncluded && selectedTax.name.toLowerCase().includes('kdv')) {
      taxAmount = (invoiceFormData.amount * selectedTax.rate) / (100 + selectedTax.rate);
    }
    
    const newTaxItem: TaxItem = {
      id: `tax_${Date.now()}`,
      taxId: selectedTax.id,
      name: selectedTax.name,
      rate: selectedTax.rate,
      amount: taxAmount,
      calculationType: selectedTax.calculationType,
      baseType: selectedTax.baseType
    };
    
    setInvoiceFormData({
      ...invoiceFormData,
      taxes: [...invoiceFormData.taxes, newTaxItem]
    });
    setInvoiceSelectedTaxId('');
  };
  
  const removeInvoiceTax = (taxId: string) => {
    setInvoiceFormData({
      ...invoiceFormData,
      taxes: invoiceFormData.taxes.filter(t => t.id !== taxId)
    });
  };
  
  const calculateInvoiceTotals = () => {
    const baseAmount = invoiceFormData.amount;
    const totalTaxes = invoiceFormData.taxes.reduce((sum, t) => sum + t.amount, 0);
    
    if (invoiceFormData.isVatIncluded) {
      // Tutar KDV dahil ise, vergiler dahil toplam = girilen tutar
      return { 
        amount: baseAmount - totalTaxes, 
        vatAmount: totalTaxes, 
        totalAmount: baseAmount 
      };
    } else {
      // Tutar KDV hariç ise, vergiler eklenir
      return { 
        amount: baseAmount, 
        vatAmount: totalTaxes, 
        totalAmount: baseAmount + totalTaxes 
      };
    }
  };
  
  const handleSaveInvoice = async () => {
    if (!invoiceFormData.invoiceNumber || !invoiceFormData.entityId) {
      alert('Fatura numarası ve taraf seçimi zorunludur.');
      return;
    }
    try {
      let documentUrl = invoiceFormData.documentUrl;
      
      // Dosya seçildiyse önce yükle
      if (invoiceFile) {
        setInvoiceFileUploading(true);
        try {
          const uploadResult = await apiService.uploadToGoogleDrive(invoiceFile, {
            category: 'invoice',
            projectId: selectedProject?.id,
            projectCode: selectedProject?.code,
            projectName: selectedProject?.name,
            invoiceId: editingInvoiceData?.id,
            invoiceNumber: invoiceFormData.invoiceNumber
          });
          documentUrl = uploadResult.webViewLink || uploadResult.downloadUrl;
        } catch (uploadError: any) {
          alert('Dosya yüklenirken hata: ' + uploadError.message);
          setInvoiceFileUploading(false);
          return;
        }
        setInvoiceFileUploading(false);
      }
      
      const totals = calculateInvoiceTotals();
      const dataToSave = {
        invoiceNumber: invoiceFormData.invoiceNumber,
        invoiceType: invoiceFormData.invoiceType,
        invoiceDate: invoiceFormData.invoiceDate,
        dueDate: invoiceFormData.dueDate,
        amount: totals.amount,
        vatAmount: totals.vatAmount,
        totalAmount: totals.totalAmount,
        currency: invoiceFormData.currency,
        status: invoiceFormData.status,
        projectId: invoiceFormData.projectId,
        companyId: invoiceFormData.companyId,
        entityId: invoiceFormData.entityId,
        contractId: invoiceFormData.contractId,
        description: invoiceFormData.description,
        isVatIncluded: invoiceFormData.isVatIncluded,
        taxes: invoiceFormData.taxes.length > 0 ? invoiceFormData.taxes : null,
        documentUrl
      };
      
      if (editingInvoiceData) {
        await apiService.updateInvoice(editingInvoiceData.id, dataToSave);
      } else {
        await apiService.createInvoice(dataToSave);
      }
      setIsInvoiceModalOpen(false);
      setEditingInvoiceData(null);
      setSelectedInvoiceId(null);
      setInvoiceFile(null);
      // Reload invoices
      const projectCompany = companies.find(c => c.id === selectedProject?.companyId);
      if (projectCompany) await loadInvoices(projectCompany.id);
      await loadPayments();
    } catch (error: any) {
      alert(error.message || 'Kayıt sırasında bir hata oluştu');
    }
  };
  
  const handleDeleteInvoice = async (id: string) => {
    if (confirm('Faturayı silmek istediğinize emin misiniz?')) {
      try {
        await apiService.deleteInvoice(id);
        setSelectedInvoiceId(null);
        const projectCompany = companies.find(c => c.id === selectedProject?.companyId);
        if (projectCompany) await loadInvoices(projectCompany.id);
        await loadPayments();
      } catch (error: any) {
        alert(error.message || 'Silme sırasında bir hata oluştu');
      }
    }
  };
  
  // Payment Modal Handlers
  // Fatura türüne göre ödeme türünü belirle:
  // - Gelen Fatura (incoming) = Bize kesilen fatura → Giden Ödeme (outgoing) - biz ödüyoruz
  // - Giden Fatura (outgoing) = Bizim kestiğimiz fatura → Gelen Ödeme (incoming) - bize ödeniyor
  const getPaymentTypeFromInvoice = (invoice: any): 'incoming' | 'outgoing' => {
    return invoice?.invoiceType === 'outgoing' ? 'incoming' : 'outgoing';
  };
  
  const openPaymentModal = (payment?: any) => {
    setPaymentFile(null); // Reset file
    if (payment) {
      setEditingPaymentData(payment);
      setPaymentFormData({
        paymentType: payment.paymentType || 'outgoing',
        paymentDate: payment.paymentDate ? new Date(payment.paymentDate).toISOString().split('T')[0] : '',
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        invoiceId: payment.invoiceId || '',
        bankAccountId: payment.bankAccountId || '',
        bankCardId: payment.bankCardId || '',
        description: payment.description || '',
        referenceNumber: payment.referenceNumber || '',
        status: payment.status,
        documentUrl: payment.documentUrl || ''
      });
    } else {
      setEditingPaymentData(null);
      const selectedInvoice = selectedInvoiceId ? invoices.find(inv => inv.id === selectedInvoiceId) : null;
      setPaymentFormData({
        paymentType: getPaymentTypeFromInvoice(selectedInvoice),
        paymentDate: new Date().toISOString().split('T')[0],
        amount: selectedInvoice ? selectedInvoice.totalAmount : 0,
        currency: selectedInvoice?.currency || selectedProject?.agreementCurrency || 'TRY',
        paymentMethod: 'transfer',
        invoiceId: selectedInvoiceId || '',
        bankAccountId: bankAccounts[0]?.id || '',
        bankCardId: '',
        description: '',
        referenceNumber: '',
        status: 'completed',
        documentUrl: ''
      });
    }
    setIsPaymentModalOpen(true);
  };
  
  const handleSavePayment = async () => {
    if (!paymentFormData.invoiceId || !paymentFormData.amount) {
      alert('Fatura seçimi ve tutar zorunludur.');
      return;
    }
    try {
      let documentUrl = paymentFormData.documentUrl;
      
      // Dosya seçildiyse önce yükle
      if (paymentFile) {
        setPaymentFileUploading(true);
        try {
          const uploadResult = await apiService.uploadToGoogleDrive(paymentFile, {
            category: 'payment',
            projectId: selectedProject?.id,
            projectCode: selectedProject?.code,
            projectName: selectedProject?.name,
            paymentId: editingPaymentData?.id,
            paymentReference: paymentFormData.referenceNumber || `PAY-${Date.now()}`
          });
          documentUrl = uploadResult.webViewLink || uploadResult.downloadUrl;
        } catch (uploadError: any) {
          alert('Dosya yüklenirken hata: ' + uploadError.message);
          setPaymentFileUploading(false);
          return;
        }
        setPaymentFileUploading(false);
      }
      
      const dataToSave = { ...paymentFormData, documentUrl };
      
      if (editingPaymentData) {
        await apiService.updatePayment(editingPaymentData.id, dataToSave);
      } else {
        await apiService.createPayment(dataToSave);
      }
      setIsPaymentModalOpen(false);
      setEditingPaymentData(null);
      setPaymentFile(null);
      await loadPayments();
      // Also reload invoices to update paid status
      const projectCompany = companies.find(c => c.id === selectedProject?.companyId);
      if (projectCompany) await loadInvoices(projectCompany.id);
    } catch (error: any) {
      alert(error.message || 'Kayıt sırasında bir hata oluştu');
    }
  };
  
  const handleDeletePayment = async (id: string) => {
    if (confirm('Ödemeyi silmek istediğinize emin misiniz?')) {
      try {
        await apiService.deletePayment(id);
        await loadPayments();
        const projectCompany = companies.find(c => c.id === selectedProject?.companyId);
        if (projectCompany) await loadInvoices(projectCompany.id);
      } catch (error: any) {
        alert(error.message || 'Silme sırasında bir hata oluştu');
      }
    }
  };
  
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  
  // Vergi Seçimi State'i
  const [selectedTaxId, setSelectedTaxId] = useState<string>('');

  // Aktif vergileri filtrele
  const activeTaxes = taxes.filter(t => t.isActive).sort((a, b) => a.order - b.order);

  const addTax = () => {
    if (!newTrans.amount || !selectedTaxId) {
      alert('Lütfen bir vergi seçin');
      return;
    }

    const selectedTax = taxes.find(t => t.id === selectedTaxId);
    if (!selectedTax) return;

    // Hesaplama tabanına göre base amount'u belirle
    let baseAmount: number;
    if (selectedTax.baseType === 'amount') {
      // Ana tutar üzerinden
      baseAmount = newTrans.amount;
    } else if (selectedTax.baseType === 'vat') {
      // KDV üzerinden - önce KDV'yi hesapla
      const vatTax = newTrans.taxes?.find(t => t.name.toLowerCase().includes('kdv'));
      if (vatTax) {
        baseAmount = vatTax.amount;
      } else {
        // KDV yoksa, KDV hariç tutar üzerinden KDV hesapla
        if (newTrans.isVatIncluded) {
          // KDV dahil ise: KDV = (Tutar * 20) / (100 + 20)
          baseAmount = (newTrans.amount * 20) / 120;
        } else {
          // KDV hariç ise: KDV = (Tutar * 20) / 100
          baseAmount = (newTrans.amount * 20) / 100;
        }
      }
    } else {
      // Toplam tutar üzerinden (vergiler dahil)
      const currentTotal = newTrans.taxes?.reduce((sum, t) => sum + t.amount, 0) || 0;
      baseAmount = newTrans.amount + currentTotal;
    }

    // Hesaplama tipine göre vergi tutarını hesapla
    let taxAmount: number;
    if (selectedTax.calculationType === 'percentage') {
      taxAmount = (baseAmount * selectedTax.rate) / 100;
    } else {
      // Sabit tutar
      taxAmount = selectedTax.rate;
    }

    // KDV dahil/hariç durumuna göre düzeltme (sadece baseType === 'amount' için)
    if (selectedTax.baseType === 'amount' && newTrans.isVatIncluded && selectedTax.name.toLowerCase().includes('kdv')) {
      // KDV dahil ise: KDV = (Tutar * KDV Oranı) / (100 + KDV Oranı)
      taxAmount = (newTrans.amount * selectedTax.rate) / (100 + selectedTax.rate);
    }

    const newTaxItem: TaxItem = {
      id: `tax_${Date.now()}`,
      taxId: selectedTax.id,
      name: selectedTax.name,
      rate: selectedTax.rate,
      amount: taxAmount,
      calculationType: selectedTax.calculationType,
      baseType: selectedTax.baseType
    };

    setNewTrans({
      ...newTrans,
      taxes: [...(newTrans.taxes || []), newTaxItem]
    });
    
    // Seçimi temizle
    setSelectedTaxId('');
  };

  const removeTax = (id: string) => {
    setNewTrans({
      ...newTrans,
      taxes: newTrans.taxes?.filter(t => t.id !== id)
    });
  };

  // Kur değişikliği için manuel state
  const [manualExchangeRate, setManualExchangeRate] = useState<number>(1);
  const [isLoadingRate, setIsLoadingRate] = useState<boolean>(false);

  // Project Form State
  const initialProjectForm: Omit<Project, 'id'> = {
    name: '',
    code: '',
    companyId: companies[0]?.id || '',
    agreementCurrency: 'TRY',
    budget: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    status: 'active',
    description: '',
    managerId: '',
    progress: 0,
    priority: 'medium',
    location: '',
    tags: []
  };
  const [projectFormData, setProjectFormData] = useState(initialProjectForm);
  const [formTagsInput, setFormTagsInput] = useState('');

  // Kur güncelleme fonksiyonu
  const updateExchangeRate = async (showLoading = true) => {
    if (!selectedProject || !newTrans.currency || !newTrans.date) return;
    
    // Eğer para birimleri aynıysa kur her zaman 1'dir.
    if (newTrans.currency === selectedProject.agreementCurrency) {
      setManualExchangeRate(1);
      return;
    }

    if (showLoading) setIsLoadingRate(true);

    // Varsayılan (sabit) kur ile başlat
    let rate = getCrossRate(newTrans.currency as Currency, selectedProject.agreementCurrency);
    // TCMB formatına çevir (USD/TL gibi)
    // Eğer TRY → USD ise, direkt USD/TL kuru gerekir
    if (newTrans.currency === 'TRY' && selectedProject.agreementCurrency !== 'TRY') {
      // TRY'den başka bir para birimine: Hedef para biriminin TRY karşılığı
      const targetRate = getCrossRate(selectedProject.agreementCurrency as Currency, 'TRY');
      rate = 1 / targetRate; // Ters çevir
    } else if (newTrans.currency !== 'TRY' && selectedProject.agreementCurrency === 'TRY') {
      // Başka bir para biriminden TRY'ye: Kaynak para biriminin TRY karşılığı
      const sourceRate = getCrossRate(newTrans.currency as Currency, 'TRY');
      rate = 1 / sourceRate; // Ters çevir
    }
    setManualExchangeRate(Number(rate.toFixed(4)));

    // TCMB'den gerçek kuru çek
    try {
      const tcmbRate = await fetchTCMBRate(newTrans.date, newTrans.currency as Currency, selectedProject.agreementCurrency as Currency);
      if (tcmbRate > 0) {
        setManualExchangeRate(Number(tcmbRate.toFixed(4)));
      }
    } catch (e) {
      console.warn("TCMB kur çekilemedi, varsayılan kur kullanılıyor.");
    } finally {
      if (showLoading) setIsLoadingRate(false);
    }
  };

  // Transaction Modal açıldığında, para birimi VEYA tarih değiştiğinde kuru güncelle
  useEffect(() => {
    if (isTransactionModalOpen && selectedProject && newTrans.currency && newTrans.date) {
      updateExchangeRate(false); // İlk yüklemede loading gösterme
    }
  }, [isTransactionModalOpen, newTrans.currency, newTrans.date, selectedProject]);

  const handleAddTransaction = async () => {
    if (!selectedProject || !newTrans.amount || !newTrans.description) return;
    
    try {
      let documentUrl = null;
      
      // Belge varsa Google Drive'a yükle
      if (documentFile) {
        setIsUploadingDocument(true);
        try {
          const uploaded = await apiService.uploadToGoogleDrive(documentFile, {
            category: 'project',
            projectId: selectedProject.id,
            projectCode: selectedProject.code,
            projectName: selectedProject.name,
            transactionId: editingTransaction?.id
          });
          documentUrl = uploaded.downloadUrl;
        } catch (error: any) {
          alert('Belge yüklenirken bir hata oluştu: ' + error.message);
          setIsUploadingDocument(false);
          return;
        } finally {
          setIsUploadingDocument(false);
        }
      }
      
      const transactionData = {
        projectId: selectedProject.id,
        type: newTrans.type as 'income' | 'expense',
        amount: Number(newTrans.amount),
        currency: newTrans.currency as Currency,
        date: newTrans.date || new Date().toISOString().split('T')[0],
        description: newTrans.description || '',
        category: newTrans.category || 'Genel',
        exchangeRate: manualExchangeRate, // USD/TL formatında (örneğin 42.3702)
        invoiceNumber: newTrans.invoiceNumber && newTrans.invoiceNumber.trim() !== '' ? newTrans.invoiceNumber : null,
        contractId: newTrans.contractId && newTrans.contractId.trim() !== '' ? newTrans.contractId : null,
        documentUrl: documentUrl,
        taxes: newTrans.taxes && newTrans.taxes.length > 0 ? newTrans.taxes : null,
        isVatIncluded: newTrans.isVatIncluded || false,
        bankAccountId: newTrans.bankAccountId && newTrans.bankAccountId.trim() !== '' ? newTrans.bankAccountId : null,
        bankCardId: newTrans.bankCardId && newTrans.bankCardId.trim() !== '' ? newTrans.bankCardId : null,
        invoiceId: newTrans.invoiceId && newTrans.invoiceId.trim() !== '' ? newTrans.invoiceId : null,
        totalAmount: newTrans.isVatIncluded 
          ? (newTrans.amount || 0) // KDV dahil ise tutar zaten toplam
          : (newTrans.amount || 0) + (newTrans.taxes?.reduce((acc, t) => acc + t.amount, 0) || 0) // KDV hariç ise vergi ekle
      };

      if (editingTransaction) {
        await apiService.updateTransaction(editingTransaction.id, transactionData);
      } else {
        await apiService.createTransaction(transactionData);
      }
      
      setIsTransactionModalOpen(false);
      setEditingTransaction(null);
      if (onRefreshTransactions) onRefreshTransactions();
      
      // Reset form
      setNewTrans({ 
        type: 'expense', 
        currency: 'TRY', 
        amount: 0, 
        description: '', 
        category: 'Genel', 
        date: new Date().toISOString().split('T')[0],
        invoiceNumber: '',
        contractId: '',
        documentUrl: '',
        taxes: [],
        isVatIncluded: false,
        bankAccountId: '',
        bankCardId: '',
        invoiceId: ''
      });
      setDocumentFile(null);
      setManualExchangeRate(1);
    } catch (error: any) {
      alert(error.message || 'İşlem kaydedilirken bir hata oluştu');
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setNewTrans({
      type: transaction.type,
      currency: transaction.currency,
      amount: transaction.amount,
      description: transaction.description,
      category: transaction.category,
      date: transaction.date,
      exchangeRate: transaction.exchangeRate,
      invoiceNumber: transaction.invoiceNumber || '',
      contractId: transaction.contractId || '',
      documentUrl: transaction.documentUrl || '',
      taxes: transaction.taxes || [],
      isVatIncluded: transaction.isVatIncluded || false,
      bankAccountId: transaction.bankAccountId || '',
      bankCardId: transaction.bankCardId || '',
      invoiceId: transaction.invoiceId || ''
    });
    setDocumentFile(null); // Edit modunda yeni dosya yok
    setManualExchangeRate(transaction.exchangeRate);
    setIsTransactionModalOpen(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Bu işlemi silmek istediğinize emin misiniz?')) return;
    
    try {
      await apiService.deleteTransaction(id);
      if (onRefreshTransactions) onRefreshTransactions();
    } catch (error: any) {
      alert(error.message || 'İşlem silinirken bir hata oluştu');
    }
  };

  const openTransactionModal = () => {
    setEditingTransaction(null);
    setNewTrans({ 
      type: 'expense', 
      currency: 'TRY', 
      amount: 0, 
      description: '', 
      category: 'Genel', 
      date: new Date().toISOString().split('T')[0],
      invoiceNumber: '',
      contractId: '',
      documentUrl: '',
      taxes: [],
      isVatIncluded: false
    });
    setManualExchangeRate(1);
    setIsTransactionModalOpen(true);
  };

  // --- Project CRUD Operations ---

  const openProjectModal = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setProjectFormData({
        name: project.name,
        code: project.code,
        companyId: project.companyId,
        agreementCurrency: project.agreementCurrency,
        budget: project.budget,
        startDate: project.startDate,
        endDate: project.endDate || '',
        status: project.status,
        description: project.description || '',
        managerId: project.managerId || '',
        progress: project.progress || 0,
        priority: project.priority || 'medium',
        location: project.location || '',
        tags: project.tags || []
      });
      setFormTagsInput(project.tags ? project.tags.join(', ') : '');
    } else {
      setEditingProject(null);
      setProjectFormData(initialProjectForm);
      setFormTagsInput('');
    }
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = async () => {
    if (!projectFormData.name || !projectFormData.companyId || !projectFormData.code) {
      alert("Proje kodu, adı ve şirket seçimi zorunludur.");
      return;
    }

    try {
      // Tags parse
      const tagsArray = formTagsInput.split(',').map(t => t.trim()).filter(t => t !== '');
      const finalData = { ...projectFormData, tags: tagsArray };

      if (editingProject) {
        await apiService.updateProject(editingProject.id, finalData);
      } else {
        await apiService.createProject(finalData);
      }
      setIsProjectModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert(error.message || 'Kayıt sırasında bir hata oluştu');
    }
  };

  const handleDeleteProject = async (id: string) => {
    const hasTransactions = transactions.some(t => t.projectId === id);
    if (hasTransactions) {
      if (!confirm("Bu projeye ait finansal kayıtlar var. Yine de silmek istiyor musunuz?")) return;
    } else {
      if (!confirm("Projeyi silmek istediğinize emin misiniz?")) return;
    }
    
    try {
      await apiService.deleteProject(id);
      setSelectedProject(null);
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert(error.message || 'Silme sırasında bir hata oluştu');
    }
  };

  const filteredProjects = projects.filter(p => {
     const matchesSearch = p.name.toLowerCase().includes(projectSearchQuery.toLowerCase()) || 
                           p.code.toLowerCase().includes(projectSearchQuery.toLowerCase());
     const matchesCompany = projectFilterCompany === 'all' || p.companyId === projectFilterCompany;
     const matchesStatus = projectFilterStatus === 'all' || p.status === projectFilterStatus;
     return matchesSearch && matchesCompany && matchesStatus;
  });

  // Reusable Modal Component
  const projectModal = isProjectModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                <h3 className="text-xl font-bold text-slate-800">
                  {editingProject ? 'Projeyi Düzenle' : 'Yeni Proje Oluştur'}
                </h3>
                <button onClick={() => setIsProjectModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Sol Kolon: Temel Bilgiler */}
                    <div className="md:col-span-2 space-y-4">
                       <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Proje Kodu *</label>
                            <input 
                              type="text"
                              className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                              value={projectFormData.code}
                              placeholder="Örn: PRJ-2024-001"
                              onChange={e => setProjectFormData({...projectFormData, code: e.target.value})}
                            />
                         </div>
                         <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Bağlı Şirket *</label>
                            <select 
                              className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              value={projectFormData.companyId}
                              onChange={e => setProjectFormData({...projectFormData, companyId: e.target.value})}
                            >
                               {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                         </div>
                       </div>

                       <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Proje Adı *</label>
                          <input 
                            type="text"
                            className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            value={projectFormData.name}
                            onChange={e => setProjectFormData({...projectFormData, name: e.target.value})}
                          />
                       </div>

                       <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Açıklama</label>
                          <textarea 
                            className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                            value={projectFormData.description}
                            onChange={e => setProjectFormData({...projectFormData, description: e.target.value})}
                          />
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="block text-xs font-semibold text-slate-500 mb-1">Başlangıç Tarihi</label>
                             <input 
                                type="date"
                                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                value={projectFormData.startDate}
                                onChange={e => setProjectFormData({...projectFormData, startDate: e.target.value})}
                              />
                          </div>
                          <div>
                             <label className="block text-xs font-semibold text-slate-500 mb-1">Bitiş Tarihi (Tahmini)</label>
                             <input 
                                type="date"
                                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                value={projectFormData.endDate}
                                onChange={e => setProjectFormData({...projectFormData, endDate: e.target.value})}
                              />
                          </div>
                       </div>
                    </div>

                    {/* Sağ Kolon: Detaylar ve Finans */}
                    <div className="space-y-4">
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="block text-xs font-semibold text-slate-500 mb-1">Öncelik Seviyesi</label>
                             <select 
                               className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                               value={projectFormData.priority}
                               onChange={e => setProjectFormData({...projectFormData, priority: e.target.value as ProjectPriority})}
                             >
                                {(Object.keys(PROJECT_PRIORITY_LABELS) as ProjectPriority[]).map(p => (
                                  <option key={p} value={p}>{PROJECT_PRIORITY_LABELS[p].label}</option>
                                ))}
                             </select>
                          </div>
                          <div>
                             <label className="block text-xs font-semibold text-slate-500 mb-1">Proje Durumu</label>
                             <select 
                               className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                               value={projectFormData.status}
                               onChange={e => setProjectFormData({...projectFormData, status: e.target.value as ProjectStatus})}
                             >
                                {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map(s => (
                                  <option key={s} value={s}>{PROJECT_STATUS_LABELS[s].label}</option>
                                ))}
                             </select>
                          </div>
                       </div>

                       <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Müşteri / İşveren</label>
                          <select 
                            className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            value={projectFormData.customerId || ''}
                            onChange={e => setProjectFormData({...projectFormData, customerId: e.target.value})}
                          >
                             <option value="">Seçiniz (Opsiyonel)</option>
                             {entities.filter(e => e.type === 'customer' || e.type === 'other').map(e => (
                               <option key={e.id} value={e.id}>{e.name}</option>
                             ))}
                          </select>
                       </div>

                       <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Proje Yöneticisi</label>
                          <select 
                            className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            value={projectFormData.managerId}
                            onChange={e => setProjectFormData({...projectFormData, managerId: e.target.value})}
                          >
                             <option value="">Seçiniz...</option>
                             {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                          </select>
                       </div>

                       <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Lokasyon / Şehir</label>
                          <input 
                            type="text"
                            className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            value={projectFormData.location}
                            onChange={e => setProjectFormData({...projectFormData, location: e.target.value})}
                          />
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="block text-xs font-semibold text-slate-500 mb-1">Anlaşma Para Birimi</label>
                             <select 
                                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                value={projectFormData.agreementCurrency}
                                onChange={e => setProjectFormData({...projectFormData, agreementCurrency: e.target.value as Currency})}
                              >
                                 {Object.keys(MARKET_RATES).map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                          </div>
                          <div>
                             <label className="block text-xs font-semibold text-slate-500 mb-1">Toplam Bütçe</label>
                             <input 
                                type="number"
                                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                value={projectFormData.budget}
                                onChange={e => setProjectFormData({...projectFormData, budget: Number(e.target.value)})}
                              />
                          </div>
                       </div>

                       <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Etiketler (Virgülle ayırın)</label>
                          <input 
                            type="text"
                            className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            value={formTagsInput}
                            placeholder="Örn: İnşaat, Ar-Ge, Mobil"
                            onChange={e => setFormTagsInput(e.target.value)}
                          />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-3">
                 <button 
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-6 py-2.5 text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition"
                 >
                   İptal
                 </button>
                 <button 
                  onClick={handleSaveProject}
                  className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
                 >
                   {editingProject ? 'Güncelle' : 'Oluştur'}
                 </button>
              </div>
            </div>
          </div>
  );

  // --- Detail View ---

  if (selectedProject) {
    let projectTransactions = transactions.filter(t => t.projectId === selectedProject.id);
    
    // Sorting function
    const handleSort = (column: string) => {
      if (sortColumn === column) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortColumn(column);
        setSortDirection('asc');
      }
    };
    
    // Sort transactions
    if (sortColumn) {
      projectTransactions = [...projectTransactions].sort((a, b) => {
        let aVal: any;
        let bVal: any;
        
        switch (sortColumn) {
          case 'date':
            aVal = new Date(a.date).getTime();
            bVal = new Date(b.date).getTime();
            break;
          case 'description':
            aVal = a.description.toLowerCase();
            bVal = b.description.toLowerCase();
            break;
          case 'category':
            aVal = a.category.toLowerCase();
            bVal = b.category.toLowerCase();
            break;
          case 'amount':
            const aConverted = a.currency === selectedProject.agreementCurrency 
              ? a.amount 
              : a.currency === 'TRY' 
                ? a.amount / a.exchangeRate 
                : a.amount * a.exchangeRate;
            const bConverted = b.currency === selectedProject.agreementCurrency 
              ? b.amount 
              : b.currency === 'TRY' 
                ? b.amount / b.exchangeRate 
                : b.amount * b.exchangeRate;
            aVal = aConverted;
            bVal = bConverted;
            break;
          case 'type':
            aVal = a.type;
            bVal = b.type;
            break;
          default:
            return 0;
        }
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    // Grouping function
    const toggleGroup = (groupKey: string) => {
      const newExpanded = new Set(expandedGroups);
      if (newExpanded.has(groupKey)) {
        newExpanded.delete(groupKey);
      } else {
        newExpanded.add(groupKey);
      }
      setExpandedGroups(newExpanded);
    };
    
    // Group transactions
    interface GroupedTransaction {
      key: string;
      label: string;
      transactions: Transaction[];
      total: number;
    }
    
    let groupedData: GroupedTransaction[] = [];
    let displayTransactions: (Transaction | { type: 'group', group: GroupedTransaction })[] = [];
    
    if (groupBy === 'none') {
      displayTransactions = projectTransactions;
    } else {
      const groups = new Map<string, Transaction[]>();
      
      projectTransactions.forEach(t => {
        let groupKey = '';
        let groupLabel = '';
        
        if (groupBy === 'date') {
          const date = new Date(t.date);
          groupKey = date.toISOString().split('T')[0];
          groupLabel = date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
        } else if (groupBy === 'category') {
          groupKey = t.category;
          groupLabel = t.category;
        } else if (groupBy === 'date-category') {
          const date = new Date(t.date);
          const dateStr = date.toISOString().split('T')[0];
          groupKey = `${dateStr}_${t.category}`;
          groupLabel = `${date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })} - ${t.category}`;
        }
        
        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(t);
      });
      
      groupedData = Array.from(groups.entries()).map(([key, trans]) => {
        const total = trans.reduce((sum, t) => {
          const converted = t.currency === selectedProject.agreementCurrency 
            ? t.amount 
            : t.currency === 'TRY' 
              ? t.amount / t.exchangeRate 
              : t.amount * t.exchangeRate;
          return sum + (t.type === 'income' ? converted : -converted);
        }, 0);
        
        let label = '';
        if (groupBy === 'date') {
          label = new Date(key).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
        } else if (groupBy === 'category') {
          label = key;
        } else if (groupBy === 'date-category') {
          const [dateStr, category] = key.split('_');
          label = `${new Date(dateStr).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })} - ${category}`;
        }
        
        return {
          key,
          label,
          transactions: trans,
          total
        };
      }).sort((a, b) => {
        if (groupBy === 'date' || groupBy === 'date-category') {
          return new Date(a.key.split('_')[0]).getTime() - new Date(b.key.split('_')[0]).getTime();
        }
        return a.label.localeCompare(b.label, 'tr');
      });
      
      groupedData.forEach(group => {
        displayTransactions.push({ type: 'group', group });
        if (expandedGroups.has(group.key)) {
          displayTransactions.push(...group.transactions);
        }
      });
    }
    
    // Search filter
    let filteredDisplayTransactions = displayTransactions;
    if (transactionSearch.trim()) {
      const searchLower = transactionSearch.toLowerCase();
      filteredDisplayTransactions = displayTransactions.filter(item => {
        if ('type' in item && item.type === 'group') {
          // Group header - search in label
          return item.group.label.toLowerCase().includes(searchLower);
        } else {
          // Transaction - search in description, category, invoiceNumber
          const t = item as Transaction;
          return (
            t.description.toLowerCase().includes(searchLower) ||
            t.category.toLowerCase().includes(searchLower) ||
            (t.invoiceNumber && t.invoiceNumber.toLowerCase().includes(searchLower))
          );
        }
      });
    }
    
    // Pagination
    const totalItems = filteredDisplayTransactions.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTransactions = filteredDisplayTransactions.slice(startIndex, endIndex);
    
    const totalIncome = projectTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => {
        // Kur USD/TL formatında (örneğin 42.3702)
        if (t.currency === selectedProject.agreementCurrency) {
          return acc + t.amount;
        } else if (t.currency === 'TRY') {
          // TRY → Hedef para birimi: Bölme (1000 TRY / 42.3702 = 23.60 USD)
          return acc + (t.amount / t.exchangeRate);
        } else if (selectedProject.agreementCurrency === 'TRY') {
          // Kaynak para birimi → TRY: Çarpma (23.60 USD * 42.3702 = 1000 TRY)
          return acc + (t.amount * t.exchangeRate);
        } else {
          // İki para birimi de TRY değil: Önce TRY'ye çevir, sonra hedefe
          const tryAmount = t.amount * t.exchangeRate;
          return acc + (tryAmount / t.exchangeRate); // Bu mantık yanlış, düzeltilmeli
        }
      }, 0);
    
    const totalExpense = projectTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        // Kur USD/TL formatında (örneğin 42.3702)
        if (t.currency === selectedProject.agreementCurrency) {
          return acc + t.amount;
        } else if (t.currency === 'TRY') {
          // TRY → Hedef para birimi: Bölme (1000 TRY / 42.3702 = 23.60 USD)
          return acc + (t.amount / t.exchangeRate);
        } else if (selectedProject.agreementCurrency === 'TRY') {
          // Kaynak para birimi → TRY: Çarpma (23.60 USD * 42.3702 = 1000 TRY)
          return acc + (t.amount * t.exchangeRate);
        } else {
          // İki para birimi de TRY değil: Önce TRY'ye çevir, sonra hedefe
          const tryAmount = t.amount * t.exchangeRate;
          return acc + (tryAmount / t.exchangeRate); // Bu mantık yanlış, düzeltilmeli
        }
      }, 0);

    const budgetUsed = totalExpense;
    const budgetRemaining = selectedProject.budget - totalExpense;
    const budgetUsagePercent = Math.min(100, Math.max(0, (budgetUsed / selectedProject.budget) * 100));
    const balance = totalIncome - totalExpense;

    const manager = users.find(u => u.id === selectedProject.managerId);
    const company = companies.find(c => c.id === selectedProject.companyId);
    const customer = entities.find(e => e.id === selectedProject.customerId);

    return (
      <div className="h-full flex flex-col bg-white">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
           <div className="flex items-center gap-4">
              <button onClick={() => { setSelectedProject(null); }} className="p-2 hover:bg-slate-100 rounded-full transition">
                 <ArrowRightLeft className="rotate-180 text-slate-500" size={20} />
              </button>
              <div>
                 <div className="flex items-center gap-3">
                   <h2 className="text-xl font-bold text-slate-800">{selectedProject.name}</h2>
                   <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500 border border-slate-200">{selectedProject.code}</span>
                   <span className={`px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 ${PROJECT_STATUS_LABELS[selectedProject.status].color.replace('bg-', 'bg-opacity-10 ')}`}>
                      {PROJECT_STATUS_LABELS[selectedProject.status].label}
                   </span>
                 </div>
                 <div className="text-sm text-slate-500 mt-1 flex gap-4">
                    <span className="flex items-center gap-1" title="Bağlı Şirket"><Building2 size={14}/> {company?.name}</span>
                    {customer && <span className="flex items-center gap-1 text-blue-600" title="Müşteri"><Briefcase size={14}/> {customer.name}</span>}
                    {selectedProject.location && <span className="flex items-center gap-1"><MapPin size={14}/> {selectedProject.location}</span>}
                 </div>
              </div>
           </div>
           
           <div className="flex items-center gap-3">
              <button 
                onClick={() => analyzeProject(selectedProject)}
                className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition text-sm font-medium"
                disabled={isAnalyzing}
              >
                {isAnalyzing ? <span className="animate-spin">⌛</span> : <Bot size={16} />}
                {isAnalyzing ? 'Analiz Ediliyor...' : 'AI Analiz'}
              </button>
              <div className="h-6 w-px bg-slate-200"></div>
              <button onClick={() => openProjectModal(selectedProject)} className="text-slate-500 hover:text-blue-600 p-2"><Edit size={18} /></button>
              <button onClick={() => handleDeleteProject(selectedProject.id)} className="text-slate-500 hover:text-red-600 p-2"><Trash2 size={18} /></button>
           </div>
        </div>

        {/* Sub Navigation */}
        <div className="px-6 border-b border-slate-200 flex gap-6 bg-slate-50">
           <button 
             onClick={() => setDetailTab('overview')}
             className={`py-3 text-sm font-medium border-b-2 transition ${detailTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
           >
             Genel Bakış
           </button>
           <button 
             onClick={() => setDetailTab('financials')}
             className={`py-3 text-sm font-medium border-b-2 transition ${detailTab === 'financials' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
           >
             Finansal Yönetim
           </button>
           <button 
             onClick={() => setDetailTab('contracts')}
             className={`py-3 text-sm font-medium border-b-2 transition flex items-center gap-1.5 ${detailTab === 'contracts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
           >
             <FileSignature size={16} />
             Sözleşmeler
           </button>
           <button 
             onClick={() => setDetailTab('invoices')}
             className={`py-3 text-sm font-medium border-b-2 transition flex items-center gap-1.5 ${detailTab === 'invoices' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
           >
             <Receipt size={16} />
             Faturalar & Ödemeler
           </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-slate-50/50 p-6">
           
           {/* --- OVERVIEW TAB --- */}
           {detailTab === 'overview' && (
              <div className="max-w-7xl mx-auto space-y-6">
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Sol Kolon: Proje Kartı */}
                    <div className="col-span-2 space-y-6">
                       <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                             <FileText size={20} className="text-slate-400" /> Proje Özeti
                          </h3>
                          <p className="text-slate-600 leading-relaxed mb-6">
                             {selectedProject.description || 'Açıklama girilmemiş.'}
                          </p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                             <div>
                                <div className="text-xs text-slate-400 mb-1">Başlangıç</div>
                                <div className="font-medium text-slate-700">{selectedProject.startDate}</div>
                             </div>
                             <div>
                                <div className="text-xs text-slate-400 mb-1">Planlanan Bitiş</div>
                                <div className="font-medium text-slate-700">{selectedProject.endDate || '-'}</div>
                             </div>
                             <div>
                                <div className="text-xs text-slate-400 mb-1">Öncelik</div>
                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${PROJECT_PRIORITY_LABELS[selectedProject.priority].color}`}>
                                  {PROJECT_PRIORITY_LABELS[selectedProject.priority].label}
                                </div>
                             </div>
                             <div>
                                <div className="text-xs text-slate-400 mb-1">Etiketler</div>
                                <div className="flex flex-wrap gap-1">
                                  {selectedProject.tags.length > 0 ? selectedProject.tags.map(t => (
                                     <span key={t} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{t}</span>
                                  )) : '-'}
                                </div>
                             </div>
                          </div>
                       </div>

                       {/* İlerleme Durumu */}
                       <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                          <div className="flex justify-between items-end mb-2">
                             <h3 className="font-bold text-slate-800">Tamamlanma Durumu</h3>
                             <span className="text-2xl font-bold text-blue-600">%{selectedProject.progress}</span>
                          </div>
                          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-6">
                             <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${selectedProject.progress}%` }}></div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4">
                             <div className="bg-slate-50 p-3 rounded-lg text-center">
                                <div className="text-xs text-slate-400">Toplam Gün</div>
                                <div className="font-bold text-slate-700">120</div>
                             </div>
                             <div className="bg-slate-50 p-3 rounded-lg text-center">
                                <div className="text-xs text-slate-400">Geçen Gün</div>
                                <div className="font-bold text-slate-700">45</div>
                             </div>
                             <div className="bg-slate-50 p-3 rounded-lg text-center">
                                <div className="text-xs text-slate-400">Kalan Gün</div>
                                <div className="font-bold text-slate-700">75</div>
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* Sağ Kolon: Ekip ve Hızlı İstatistikler */}
                    <div className="space-y-6">
                       <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                          <h3 className="font-bold text-slate-800 mb-4">Proje Ekibi</h3>
                          <div className="flex items-center gap-3 mb-4">
                             {manager ? (
                                <>
                                  <img src={manager.avatar} className="w-12 h-12 rounded-full border-2 border-slate-100" alt={manager.name} />
                                  <div>
                                     <div className="font-medium text-slate-800">{manager.name}</div>
                                     <div className="text-xs text-blue-600 font-medium">Proje Yöneticisi</div>
                                  </div>
                                </>
                             ) : (
                                <div className="text-sm text-slate-400 italic">Yönetici atanmamış</div>
                             )}
                          </div>
                          <div className="pt-4 border-t border-slate-100">
                             <div className="text-xs text-slate-400 mb-2">Çalışan Sayısı (Tahmini)</div>
                             <div className="flex -space-x-2 overflow-hidden">
                                {[1,2,3,4].map(i => (
                                   <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-xs text-slate-500 font-medium">
                                      +{i}
                                   </div>
                                ))}
                             </div>
                          </div>
                       </div>

                       {/* AI Kutusu */}
                       {aiAnalysis && (
                         <div className="bg-indigo-600 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><Bot size={64}/></div>
                            <h3 className="font-bold mb-3 flex items-center gap-2 relative z-10">
                               <Bot size={20} /> Analiz Raporu
                            </h3>
                            <div className="text-sm text-indigo-100 relative z-10 whitespace-pre-wrap max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                               {aiAnalysis}
                            </div>
                         </div>
                       )}
                    </div>
                 </div>
              </div>
           )}

           {/* --- FINANCIALS TAB --- */}
           {detailTab === 'financials' && (
              <div className="max-w-7xl mx-auto space-y-6">
                 {/* KPI Cards */}
                 <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                       <div className="text-sm text-slate-500 mb-1">Toplam Bütçe</div>
                       <div className="text-2xl font-bold text-slate-800">{formatCurrency(selectedProject.budget, selectedProject.agreementCurrency)}</div>
                       <div className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle size={10}/> Onaylı</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                       <div className="text-sm text-slate-500 mb-1">Gerçekleşen Gider</div>
                       <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense, selectedProject.agreementCurrency)}</div>
                       <div className="w-full bg-slate-100 h-1 mt-2 rounded-full overflow-hidden">
                          <div className={`h-full ${budgetUsagePercent > 90 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${budgetUsagePercent}%` }}></div>
                       </div>
                       <div className="text-[10px] text-slate-400 mt-1 text-right">%{budgetUsagePercent.toFixed(1)} Kullanım</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                       <div className="text-sm text-slate-500 mb-1">Toplam Gelir</div>
                       <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome, selectedProject.agreementCurrency)}</div>
                       <div className="text-xs text-slate-400 mt-1">Faturalandırılan</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                       <div className="text-sm text-slate-500 mb-1">Kalan Bütçe</div>
                       <div className={`text-2xl font-bold ${budgetRemaining < 0 ? 'text-red-600' : 'text-slate-800'}`}>{formatCurrency(budgetRemaining, selectedProject.agreementCurrency)}</div>
                       <div className="text-xs text-slate-400 mt-1">Kullanılabilir Limit</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                       <div className="text-sm text-slate-500 mb-1">Net Durum</div>
                       <div className={`text-2xl font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                         {balance >= 0 ? '+' : ''}{formatCurrency(balance, selectedProject.agreementCurrency)}
                       </div>
                       <div className={`text-xs mt-1 ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                         {balance >= 0 ? 'Kârda' : 'Zararda'}
                       </div>
                    </div>
                 </div>

                 {/* Transaction Table */}
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
                    <div className="p-5 border-b border-slate-100">
                       <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-slate-800">Finansal Hareketler</h3>
                          {hasPermission('MANAGE_TRANSACTIONS') && (
                            <button 
                               onClick={openTransactionModal}
                               className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition text-sm font-medium"
                            >
                               <Plus size={16} /> Yeni İşlem Ekle
                            </button>
                          )}
                       </div>
                       {/* Search, Sorting and Grouping Controls */}
                       <div className="space-y-3">
                          {/* Search */}
                          <div className="flex items-center gap-2">
                             <div className="relative flex-1 max-w-md">
                                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                                <input
                                   type="text"
                                   placeholder="Açıklama, kategori veya fatura no ile ara..."
                                   value={transactionSearch}
                                   onChange={(e) => setTransactionSearch(e.target.value)}
                                   className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                {transactionSearch && (
                                  <button
                                     onClick={() => setTransactionSearch('')}
                                     className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                  >
                                     <X size={16} />
                                  </button>
                                )}
                             </div>
                          </div>
                          
                          {/* Sorting and Grouping */}
                          <div className="flex items-center gap-4 flex-wrap">
                             <div className="flex items-center gap-2">
                                <Layers size={16} className="text-slate-500" />
                                <span className="text-sm text-slate-600">Grupla:</span>
                                <select
                                   value={groupBy}
                                   onChange={(e) => {
                                     setGroupBy(e.target.value as any);
                                     setExpandedGroups(new Set());
                                   }}
                                   className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                   <option value="none">Gruplama Yok</option>
                                   <option value="date">Tarihe Göre</option>
                                   <option value="category">Kategoriye Göre</option>
                                   <option value="date-category">Tarih ve Kategoriye Göre</option>
                                </select>
                             </div>
                             
                             {/* Items per page */}
                             <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-600">Sayfa başına:</span>
                                <select
                                   value={itemsPerPage}
                                   onChange={(e) => {
                                     setItemsPerPage(Number(e.target.value));
                                     setCurrentPage(1);
                                   }}
                                   className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                   <option value="10">10</option>
                                   <option value="25">25</option>
                                   <option value="50">50</option>
                                   <option value="100">100</option>
                                </select>
                             </div>
                             
                             {/* Results count */}
                             {(() => {
                               const totalItems = filteredDisplayTransactions.length;
                               const startIndex = (currentPage - 1) * itemsPerPage;
                               const endIndex = startIndex + itemsPerPage;
                               return (
                                 <div className="text-sm text-slate-500 ml-auto">
                                    {totalItems > 0 ? (
                                      <span>
                                         {startIndex + 1}-{Math.min(endIndex, totalItems)} / {totalItems} kayıt
                                      </span>
                                    ) : (
                                      <span>Kayıt bulunamadı</span>
                                    )}
                                 </div>
                               );
                             })()}
                          </div>
                       </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                         <thead className="bg-slate-50 text-slate-500">
                            <tr>
                               <th className="p-4 font-medium">
                                  <button
                                     onClick={() => handleSort('date')}
                                     className="flex items-center gap-1 hover:text-slate-700 transition"
                                  >
                                     Tarih
                                     {sortColumn === 'date' && (
                                       sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                     )}
                                  </button>
                               </th>
                               <th className="p-4 font-medium">
                                  <button
                                     onClick={() => handleSort('description')}
                                     className="flex items-center gap-1 hover:text-slate-700 transition"
                                  >
                                     Açıklama
                                     {sortColumn === 'description' && (
                                       sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                     )}
                                  </button>
                               </th>
                               <th className="p-4 font-medium">
                                  <button
                                     onClick={() => handleSort('category')}
                                     className="flex items-center gap-1 hover:text-slate-700 transition"
                                  >
                                     Kategori
                                     {sortColumn === 'category' && (
                                       sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                     )}
                                  </button>
                               </th>
                               <th className="p-4 font-medium">Tutar (Orijinal)</th>
                               <th className="p-4 font-medium">Kur</th>
                               <th className="p-4 font-medium text-right">
                                  <button
                                     onClick={() => handleSort('amount')}
                                     className="flex items-center gap-1 hover:text-slate-700 transition ml-auto"
                                  >
                                     Tutar ({selectedProject.agreementCurrency})
                                     {sortColumn === 'amount' && (
                                       sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                     )}
                                  </button>
                               </th>
                               <th className="p-4 font-medium text-center">Belge</th>
                               {hasPermission('MANAGE_TRANSACTIONS') && (
                                 <th className="p-4 font-medium text-center">İşlemler</th>
                               )}
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                              {paginatedTransactions.length > 0 ? paginatedTransactions.map((item, idx) => {
                                // Group header
                                if ('type' in item && item.type === 'group') {
                                  const group = item.group;
                                  const isExpanded = expandedGroups.has(group.key);
                                  return (
                                    <React.Fragment key={`group-${group.key}`}>
                                      <tr className="bg-slate-50 hover:bg-slate-100 transition cursor-pointer" onClick={() => toggleGroup(group.key)}>
                                        <td colSpan={hasPermission('MANAGE_TRANSACTIONS') ? 8 : 7} className="p-3">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              {isExpanded ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                                              <span className="font-semibold text-slate-700">{group.label}</span>
                                              <span className="text-xs text-slate-500">({group.transactions.length} işlem)</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                              <span className="text-sm text-slate-600">Toplam:</span>
                                              <span className={`font-bold ${group.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {group.total >= 0 ? '+' : ''}{formatCurrency(Math.abs(group.total), selectedProject.agreementCurrency)}
                                              </span>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    </React.Fragment>
                                  );
                                }
                                
                                // Transaction row
                                const t = item as Transaction;
                                 // Kur USD/TL formatında, bu yüzden bölme yapıyoruz
                                 const converted = t.currency === selectedProject.agreementCurrency 
                                   ? t.amount 
                                   : t.currency === 'TRY' 
                                     ? t.amount / t.exchangeRate 
                                     : t.amount * t.exchangeRate;
                                 return (
                                    <tr key={t.id} className="hover:bg-slate-50 transition">
                                       <td className="p-4 text-slate-600 whitespace-nowrap">{t.date}</td>
                                       <td className="p-4 font-medium text-slate-800">
                                          <div className="flex items-center gap-2">
                                             <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                {t.type === 'income' ? <TrendingUp size={16} /> : <ArrowRightLeft size={16} />}
                                             </div>
                                             <div>
                                                <div>{t.description}</div>
                                                {t.invoiceNumber && <div className="text-[10px] text-slate-400 font-mono">Fat: {t.invoiceNumber}</div>}
                                                {t.invoice && (
                                                  <div className="text-[10px] text-blue-600 font-mono flex items-center gap-1">
                                                    <FileText size={10} />
                                                    {t.invoice.invoiceNumber}
                                                  </div>
                                                )}
                                             </div>
                                          </div>
                                       </td>
                                       <td className="p-4">
                                          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">{t.category}</span>
                                       </td>
                                       <td className="p-4 font-mono text-slate-600">
                                          {formatCurrency(t.amount, t.currency)}
                                          {t.taxes && t.taxes.length > 0 && (
                                            <div className="text-[10px] text-slate-400 mt-1 space-y-0.5">
                                              {t.taxes.map(tax => (
                                                <div key={tax.id} className="flex justify-between w-24">
                                                  <span>{tax.name} (%{tax.rate})</span>
                                                </div>
                                              ))}
                                              <div className="border-t border-slate-200 pt-0.5 font-bold text-slate-500">
                                                Top: {formatCurrency(t.totalAmount || t.amount, t.currency)}
                                              </div>
                                            </div>
                                          )}
                                          {(t.bankAccount || t.bankCard) && (
                                            <div className="text-[10px] text-slate-500 mt-1 flex flex-col gap-0.5">
                                              {t.bankAccount && (
                                                <div className="flex items-center gap-1">
                                                  <Wallet size={10} />
                                                  {t.bankAccount.accountName} - {t.bankAccount.bankName}
                                                </div>
                                              )}
                                              {t.bankCard && (
                                                <div className="flex items-center gap-1">
                                                  <CreditCard size={10} />
                                                  {t.bankCard.cardName} - {t.bankCard.bankName}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                       </td>
                                       <td className="p-4 text-slate-500 text-xs">
                                          {t.exchangeRate.toFixed(4)} {t.currency === 'TRY' && selectedProject.agreementCurrency !== 'TRY' ? `${selectedProject.agreementCurrency}/TL` : ''}
                                       </td>
                                       <td className={`p-4 text-right font-mono font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                          {t.type === 'income' ? '+' : '-'}{formatCurrency(converted, selectedProject.agreementCurrency)}
                                       </td>
                                       <td className="p-4 text-center">
                                          {t.documentUrl ? (
                                            <a href={t.documentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 inline-flex items-center justify-center w-8 h-8 rounded hover:bg-blue-50 transition" title="Belgeyi Görüntüle">
                                              <FileText size={16} />
                                            </a>
                                          ) : (
                                            <span className="text-slate-300">-</span>
                                          )}
                                       </td>
                                       {hasPermission('MANAGE_TRANSACTIONS') && (
                                         <td className="p-4">
                                           <div className="flex items-center justify-center gap-2">
                                             <button
                                               onClick={(e) => {
                                                 e.stopPropagation();
                                                 handleEditTransaction(t);
                                               }}
                                               className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                                               title="Düzenle"
                                             >
                                               <Edit size={16} />
                                             </button>
                                             <button
                                               onClick={(e) => {
                                                 e.stopPropagation();
                                                 handleDeleteTransaction(t.id);
                                               }}
                                               className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                                               title="Sil"
                                             >
                                               <Trash2 size={16} />
                                             </button>
                                           </div>
                                         </td>
                                       )}
                                    </tr>
                                 );
                              }) : (
                                 <tr>
                                    <td colSpan={hasPermission('MANAGE_TRANSACTIONS') ? 8 : 7} className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
                                     <Calculator size={48} className="text-slate-200" />
                                     <span>
                                       {transactionSearch ? 'Arama kriterlerinize uygun kayıt bulunamadı.' : 'Henüz bir finansal işlem kaydı bulunmuyor.'}
                                     </span>
                                  </td>
                               </tr>
                            )}
                         </tbody>
                      </table>
                    </div>
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                       <div className="p-5 border-t border-slate-100 flex items-center justify-between">
                          <div className="text-sm text-slate-600">
                             Sayfa {currentPage} / {totalPages}
                          </div>
                          <div className="flex items-center gap-2">
                             <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                             >
                                Önceki
                             </button>
                             
                             {/* Page numbers */}
                             <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                  let pageNum: number;
                                  if (totalPages <= 5) {
                                    pageNum = i + 1;
                                  } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                  } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                  } else {
                                    pageNum = currentPage - 2 + i;
                                  }
                                  
                                  return (
                                    <button
                                       key={pageNum}
                                       onClick={() => setCurrentPage(pageNum)}
                                       className={`px-3 py-1.5 border rounded-lg text-sm transition ${
                                         currentPage === pageNum
                                           ? 'bg-blue-600 text-white border-blue-600'
                                           : 'border-slate-300 hover:bg-slate-50'
                                       }`}
                                    >
                                       {pageNum}
                                    </button>
                                  );
                                })}
                             </div>
                             
                             <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                             >
                                Sonraki
                             </button>
                          </div>
                       </div>
                    )}
                 </div>
              </div>
           )}

           {/* --- CONTRACTS TAB --- */}
           {detailTab === 'contracts' && (
              <div className="max-w-7xl mx-auto space-y-6">
                 {/* Header */}
                 <div className="flex justify-between items-center">
                    <div>
                       <h3 className="text-xl font-bold text-slate-800">Proje Sözleşmeleri</h3>
                       <p className="text-sm text-slate-500 mt-1">Bu projeye ait tüm sözleşmeleri görüntüleyin ve yönetin</p>
                    </div>
                 </div>

                 {/* Stats Cards */}
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {(() => {
                       const projectContracts = contracts.filter(c => c.projectId === selectedProject.id);
                       const totalContractValue = projectContracts.reduce((sum, c) => sum + c.amount, 0);
                       const activeContracts = projectContracts.filter(c => c.status === 'active').length;
                       const completedContracts = projectContracts.filter(c => c.status === 'completed').length;
                       
                       return (
                          <>
                             <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-3">
                                   <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                      <FileSignature size={20} />
                                   </div>
                                   <div>
                                      <div className="text-sm text-slate-500">Toplam Sözleşme</div>
                                      <div className="text-2xl font-bold text-slate-800">{projectContracts.length}</div>
                                   </div>
                                </div>
                             </div>
                             <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-3">
                                   <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                                      <CheckCircle size={20} />
                                   </div>
                                   <div>
                                      <div className="text-sm text-slate-500">Aktif Sözleşme</div>
                                      <div className="text-2xl font-bold text-green-600">{activeContracts}</div>
                                   </div>
                                </div>
                             </div>
                             <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-3">
                                   <div className="p-3 bg-slate-100 text-slate-600 rounded-lg">
                                      <Clock size={20} />
                                   </div>
                                   <div>
                                      <div className="text-sm text-slate-500">Tamamlanan</div>
                                      <div className="text-2xl font-bold text-slate-600">{completedContracts}</div>
                                   </div>
                                </div>
                             </div>
                             <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-3">
                                   <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                                      <DollarSign size={20} />
                                   </div>
                                   <div>
                                      <div className="text-sm text-slate-500">Toplam Değer</div>
                                      <div className="text-xl font-bold text-purple-600">{formatCurrency(totalContractValue, selectedProject.agreementCurrency)}</div>
                                   </div>
                                </div>
                             </div>
                          </>
                       );
                    })()}
                 </div>

                 {/* Contracts Table */}
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                    <div className="overflow-x-auto">
                       <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-slate-500">
                             <tr>
                                <th className="p-4 font-medium">Sözleşme</th>
                                <th className="p-4 font-medium">Tür</th>
                                <th className="p-4 font-medium">Taraf</th>
                                <th className="p-4 font-medium">Tarih Aralığı</th>
                                <th className="p-4 font-medium">Tutar</th>
                                <th className="p-4 font-medium">Durum</th>
                                <th className="p-4 font-medium text-center">İşlemler</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                             {contracts.filter(c => c.projectId === selectedProject.id).length > 0 ? (
                                contracts.filter(c => c.projectId === selectedProject.id).map(contract => {
                                   const entity = entities.find(e => e.id === contract.entityId);
                                   const contractTransactions = transactions.filter(t => t.contractId === contract.id);
                                   const realizedAmount = contractTransactions.reduce((sum, t) => {
                                      const converted = t.currency === contract.currency ? t.amount : t.amount * t.exchangeRate;
                                      return sum + (t.type === 'income' ? converted : -converted);
                                   }, 0);
                                   
                                   const statusColors: Record<string, string> = {
                                      draft: 'bg-slate-100 text-slate-600',
                                      active: 'bg-green-100 text-green-700',
                                      completed: 'bg-blue-100 text-blue-700',
                                      cancelled: 'bg-red-100 text-red-700',
                                      expired: 'bg-orange-100 text-orange-700'
                                   };
                                   
                                   const typeLabels: Record<string, string> = {
                                      customer_agreement: 'Müşteri Anlaşması',
                                      subcontractor_agreement: 'Taşeron Anlaşması',
                                      purchase_order: 'Satın Alma',
                                      service_agreement: 'Hizmet Sözleşmesi'
                                   };
                                   
                                   const statusLabels: Record<string, string> = {
                                      draft: 'Taslak',
                                      active: 'Aktif',
                                      completed: 'Tamamlandı',
                                      cancelled: 'İptal',
                                      expired: 'Süresi Doldu'
                                   };
                                   
                                   return (
                                      <tr key={contract.id} className="hover:bg-slate-50 transition">
                                         <td className="p-4">
                                            <div className="flex items-center gap-3">
                                               <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                                  <FileSignature size={18} />
                                               </div>
                                               <div>
                                                  <div className="font-medium text-slate-800">{contract.name}</div>
                                                  <div className="text-xs text-slate-400 font-mono">{contract.code}</div>
                                               </div>
                                            </div>
                                         </td>
                                         <td className="p-4">
                                            <span className="text-slate-600 text-xs bg-slate-100 px-2 py-1 rounded">
                                               {typeLabels[contract.type] || contract.type}
                                            </span>
                                         </td>
                                         <td className="p-4">
                                            <div className="font-medium text-slate-700">{entity?.name || '-'}</div>
                                            <div className="text-xs text-slate-400">{entity?.type === 'customer' ? 'Müşteri' : entity?.type === 'supplier' ? 'Tedarikçi' : entity?.type === 'subcontractor' ? 'Taşeron' : '-'}</div>
                                         </td>
                                         <td className="p-4">
                                            <div className="flex items-center gap-1 text-slate-600">
                                               <Calendar size={14} className="text-slate-400" />
                                               <span className="text-xs">{new Date(contract.startDate).toLocaleDateString('tr-TR')}</span>
                                               <span className="text-slate-300 mx-1">→</span>
                                               <span className="text-xs">{new Date(contract.endDate).toLocaleDateString('tr-TR')}</span>
                                            </div>
                                         </td>
                                         <td className="p-4">
                                            <div className="font-mono font-medium text-slate-800">{formatCurrency(contract.amount, contract.currency)}</div>
                                            <div className="text-xs text-slate-400 mt-0.5">
                                               Gerçekleşen: <span className={realizedAmount >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(Math.abs(realizedAmount), contract.currency)}</span>
                                            </div>
                                         </td>
                                         <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[contract.status]}`}>
                                               {statusLabels[contract.status] || contract.status}
                                            </span>
                                         </td>
                                         <td className="p-4">
                                            <div className="flex items-center justify-center gap-2">
                                               <button
                                                  onClick={() => {
                                                     // TODO: Open contract detail modal
                                                  }}
                                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                                  title="Detay"
                                               >
                                                  <Eye size={16} />
                                               </button>
                                               {contract.attachments && contract.attachments.length > 0 && (
                                                  <a
                                                     href={contract.attachments[0]}
                                                     target="_blank"
                                                     rel="noopener noreferrer"
                                                     className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded transition"
                                                     title="Dosyayı Aç"
                                                  >
                                                     <ExternalLink size={16} />
                                                  </a>
                                               )}
                                            </div>
                                         </td>
                                      </tr>
                                   );
                                })
                             ) : (
                                <tr>
                                   <td colSpan={7} className="p-12 text-center">
                                      <FileSignature size={48} className="text-slate-200 mx-auto mb-3" />
                                      <div className="text-slate-400">Bu projeye ait sözleşme bulunmuyor.</div>
                                      <p className="text-xs text-slate-400 mt-1">Sözleşme eklemek için "Sözleşmeler" menüsünü kullanın.</p>
                                   </td>
                                </tr>
                             )}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </div>
           )}

           {/* --- INVOICES TAB --- */}
           {detailTab === 'invoices' && (
              <div className="max-w-7xl mx-auto space-y-6">
                 {/* Header */}
                 <div className="flex justify-between items-center">
                    <div>
                       <h3 className="text-xl font-bold text-slate-800">Faturalar & Ödemeler</h3>
                       <p className="text-sm text-slate-500 mt-1">Bu projeye ait faturaları ve ödemeleri görüntüleyin</p>
                    </div>
                 </div>

                 {/* Filter Section */}
                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex flex-wrap items-center gap-4">
                       <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-600">Fatura Türü:</span>
                          <select 
                             className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                             value={invoiceTypeFilter}
                             onChange={(e) => setInvoiceTypeFilter(e.target.value as any)}
                          >
                             <option value="all">Tümü</option>
                             <option value="incoming">Gelen</option>
                             <option value="outgoing">Giden</option>
                          </select>
                       </div>
                       <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-600">Durum:</span>
                          <select 
                             className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                             value={invoiceStatusFilter}
                             onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                          >
                             <option value="all">Tümü</option>
                             <option value="draft">Taslak</option>
                             <option value="issued">Kesildi</option>
                             <option value="paid">Ödendi</option>
                             <option value="overdue">Vadesi Geçti</option>
                             <option value="cancelled">İptal</option>
                          </select>
                       </div>
                       <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-600">Taraf:</span>
                          <select 
                             className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[180px]"
                             value={invoiceEntityFilter}
                             onChange={(e) => setInvoiceEntityFilter(e.target.value)}
                          >
                             <option value="all">Tümü</option>
                             {(() => {
                                // Get unique entities from both contracts and invoices for this project
                                const projectContracts = contracts.filter(c => c.projectId === selectedProject.id);
                                const projectInvoices = invoices
                                   .filter(inv => inv.projectId === selectedProject.id)
                                   .filter(inv => selectedContractId === null || inv.contractId === selectedContractId);
                                const contractEntityIds = projectContracts.map(c => c.entityId);
                                const invoiceEntityIds = projectInvoices.map(inv => inv.entityId);
                                const uniqueEntityIds = [...new Set([...contractEntityIds, ...invoiceEntityIds])];
                                return uniqueEntityIds.map(entityId => {
                                   const entity = entities.find(e => e.id === entityId);
                                   if (!entity) return null;
                                   return (
                                      <option key={entity.id} value={entity.id}>{entity.name}</option>
                                   );
                                });
                             })()}
                          </select>
                       </div>
                       {/* Stats summary */}
                       {(() => {
                          const projectInvoices = invoices
                             .filter(inv => inv.projectId === selectedProject.id)
                             .filter(inv => selectedContractId === null || inv.contractId === selectedContractId);
                          const projectPayments = payments.filter(p => {
                             const invoice = invoices.find(inv => inv.id === p.invoiceId);
                             if (!invoice || invoice.projectId !== selectedProject.id) return false;
                             if (selectedContractId && invoice.contractId !== selectedContractId) return false;
                             return true;
                          });
                          const pendingCount = projectInvoices.filter(inv => inv.status === 'issued' || inv.status === 'overdue').length;
                          const totalPayments = projectPayments.reduce((sum, p) => sum + p.amount, 0);
                          
                          return (
                             <div className="ml-auto flex items-center gap-6 text-sm">
                                <div className="flex items-center gap-2">
                                   <Receipt size={16} className="text-blue-500" />
                                   <span className="text-slate-600">Fatura: <strong className="text-slate-800">{projectInvoices.length}</strong></span>
                                </div>
                                <div className="flex items-center gap-2">
                                   <Wallet size={16} className="text-green-500" />
                                   <span className="text-slate-600">Ödeme: <strong className="text-green-600">{formatCurrency(totalPayments, selectedProject.agreementCurrency)}</strong></span>
                                </div>
                                <div className="flex items-center gap-2">
                                   <AlertCircle size={16} className="text-orange-500" />
                                   <span className="text-slate-600">Bekleyen: <strong className="text-orange-600">{pendingCount}</strong></span>
                                </div>
                             </div>
                          );
                       })()}
                    </div>
                 </div>

                 {/* Three Column Layout: Contracts, Invoices & Payments */}
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Contracts */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
                       <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                          <div className="flex items-center justify-between">
                             <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                <FileSignature size={18} className="text-indigo-600" />
                                Sözleşmeler
                             </h4>
                             <button
                                onClick={() => openContractModal()}
                                className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                                title="Yeni Sözleşme"
                             >
                                <Plus size={16} />
                             </button>
                          </div>
                       </div>
                       <div 
                          className="flex-1 overflow-y-auto max-h-[500px]"
                          onClick={() => {
                             // Clear contract selection when clicking on empty space
                             setSelectedContractId(null);
                             // Also clear invoice selection when contract selection is cleared
                             setSelectedInvoiceId(null);
                          }}
                       >
                          {(() => {
                             // Filter contracts for this project
                             // Map invoice status to contract status for filtering
                             const statusMapping: Record<string, string[]> = {
                                'all': [],
                                'draft': ['draft'],
                                'issued': ['active'],
                                'paid': ['completed'],
                                'cancelled': ['cancelled'],
                                'overdue': ['expired']
                             };
                             
                             const projectContracts = contracts
                                .filter(c => c.projectId === selectedProject.id)
                                .filter(c => {
                                   // Apply entity filter
                                   if (invoiceEntityFilter !== 'all' && c.entityId !== invoiceEntityFilter) {
                                      return false;
                                   }
                                   
                                   // Apply status filter (map invoice status to contract status)
                                   if (invoiceStatusFilter !== 'all') {
                                      const allowedStatuses = statusMapping[invoiceStatusFilter] || [];
                                      if (allowedStatuses.length > 0 && !allowedStatuses.includes(c.status)) {
                                         return false;
                                      }
                                   }
                                   
                                   return true;
                                });
                             
                             if (projectContracts.length === 0) {
                                return (
                                   <div className="p-8 text-center">
                                      <FileSignature size={40} className="text-slate-200 mx-auto mb-3" />
                                      <div className="text-slate-400 text-sm">Sözleşme bulunmuyor</div>
                                   </div>
                                );
                             }
                             
                             return (
                                <div className="divide-y divide-slate-100">
                                   {projectContracts.map(contract => {
                                      const entity = entities.find(e => e.id === contract.entityId);
                                      const isSelected = selectedContractId === contract.id;
                                      
                                      const statusColors: Record<string, string> = {
                                         draft: 'bg-slate-100 text-slate-600',
                                         active: 'bg-green-100 text-green-700',
                                         completed: 'bg-blue-100 text-blue-700',
                                         cancelled: 'bg-red-100 text-red-700',
                                         expired: 'bg-orange-100 text-orange-700'
                                      };
                                      
                                      const statusLabels: Record<string, string> = {
                                         draft: 'Taslak',
                                         active: 'Aktif',
                                         completed: 'Tamamlandı',
                                         cancelled: 'İptal',
                                         expired: 'Süresi Doldu'
                                      };
                                      
                                      return (
                                         <div 
                                            key={contract.id} 
                                            className={`p-4 transition cursor-pointer border-l-4 ${
                                               isSelected 
                                                  ? 'bg-indigo-50 border-indigo-500 hover:bg-indigo-100' 
                                                  : 'hover:bg-slate-50 border-transparent'
                                            }`}
                                            onClick={(e) => {
                                               e.stopPropagation();
                                               setSelectedContractId(isSelected ? null : contract.id);
                                               // Clear invoice selection when contract changes
                                               setSelectedInvoiceId(null);
                                            }}
                                         >
                                            <div className="flex items-start justify-between gap-3">
                                               <div className="flex items-start gap-3 flex-1 min-w-0">
                                                  <div className={`p-2 rounded-lg shrink-0 bg-indigo-50 text-indigo-600`}>
                                                     <FileSignature size={16} />
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                     <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium text-sm text-slate-800 truncate">{contract.name}</span>
                                                     </div>
                                                     <div className="text-xs text-slate-500 truncate font-mono">{contract.code}</div>
                                                     <div className="text-xs text-slate-400 truncate mt-0.5">{entity?.name || '-'}</div>
                                                     <div className="flex items-center gap-2 mt-1.5 text-xs">
                                                        <span className="text-slate-400 flex items-center gap-1">
                                                           <Calendar size={10} />
                                                           {new Date(contract.startDate).toLocaleDateString('tr-TR')}
                                                        </span>
                                                        <span className="text-slate-400">→</span>
                                                        <span className="text-slate-400">
                                                           {new Date(contract.endDate).toLocaleDateString('tr-TR')}
                                                        </span>
                                                     </div>
                                                  </div>
                                               </div>
                                               <div className="text-right shrink-0">
                                                  <div className="font-mono font-bold text-slate-800 text-xs mb-1">{formatCurrency(contract.amount, contract.currency)}</div>
                                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[contract.status]}`}>
                                                     {statusLabels[contract.status]}
                                                  </span>
                                                  {isSelected && (
                                                     <div className="flex gap-1 mt-2 justify-end">
                                                        <button
                                                           onClick={(e) => { e.stopPropagation(); setViewingContract(contract); }}
                                                           className="p-1 text-slate-600 hover:bg-slate-50 rounded transition"
                                                           title="Detay Görüntüle"
                                                        >
                                                           <Eye size={14} />
                                                        </button>
                                                        <button
                                                           onClick={(e) => { e.stopPropagation(); openContractModal(contract); }}
                                                           className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition"
                                                           title="Düzenle"
                                                        >
                                                           <Edit size={14} />
                                                        </button>
                                                        <button
                                                           onClick={(e) => { e.stopPropagation(); handleDeleteContract(contract.id); }}
                                                           className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                                                           title="Sil"
                                                        >
                                                           <Trash2 size={14} />
                                                        </button>
                                                     </div>
                                                  )}
                                               </div>
                                            </div>
                                         </div>
                                      );
                                   })}
                                </div>
                             );
                          })()}
                       </div>
                    </div>

                    {/* Middle Column: Invoices */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
                       <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                          <div className="flex items-center justify-between">
                             <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                <Receipt size={18} className="text-blue-600" />
                                Faturalar
                             </h4>
                             <button
                                onClick={() => openInvoiceModal()}
                                className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                title="Yeni Fatura"
                             >
                                <Plus size={16} />
                             </button>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                             <div></div>
                             {(() => {
                                const projectInvoices = invoices
                                   .filter(inv => inv.projectId === selectedProject.id)
                                   .filter(inv => selectedContractId === null || inv.contractId === selectedContractId)
                                   .filter(inv => invoiceTypeFilter === 'all' || inv.invoiceType === invoiceTypeFilter)
                                   .filter(inv => invoiceStatusFilter === 'all' || inv.status === invoiceStatusFilter)
                                   .filter(inv => invoiceEntityFilter === 'all' || inv.entityId === invoiceEntityFilter);
                                
                                // Calculate totals by currency
                                const totalsByCurrency: Record<string, number> = {};
                                projectInvoices.forEach(inv => {
                                   totalsByCurrency[inv.currency] = (totalsByCurrency[inv.currency] || 0) + inv.totalAmount;
                                });
                                
                                return (
                                   <div className="flex flex-col items-end gap-1">
                                      {Object.entries(totalsByCurrency).map(([currency, total]) => (
                                         <div key={currency} className="text-xs font-mono font-bold text-blue-600">
                                            Toplam: {formatCurrency(total, currency as Currency)}
                                         </div>
                                      ))}
                                      {Object.keys(totalsByCurrency).length === 0 && (
                                         <div className="text-xs text-slate-400">Toplam: -</div>
                                      )}
                                   </div>
                                );
                             })()}
                          </div>
                       </div>
                       <div 
                          className="flex-1 overflow-y-auto max-h-[500px]"
                          onClick={() => {
                             // Clear invoice selection when clicking on empty space
                             setSelectedInvoiceId(null);
                          }}
                       >
                          {(() => {
                             const projectInvoices = invoices
                                .filter(inv => inv.projectId === selectedProject.id)
                                .filter(inv => selectedContractId === null || inv.contractId === selectedContractId)
                                .filter(inv => invoiceTypeFilter === 'all' || inv.invoiceType === invoiceTypeFilter)
                                .filter(inv => invoiceStatusFilter === 'all' || inv.status === invoiceStatusFilter)
                                .filter(inv => invoiceEntityFilter === 'all' || inv.entityId === invoiceEntityFilter);
                             
                             const statusColors: Record<string, string> = {
                                draft: 'bg-slate-100 text-slate-600',
                                issued: 'bg-blue-100 text-blue-700',
                                paid: 'bg-green-100 text-green-700',
                                cancelled: 'bg-red-100 text-red-700',
                                overdue: 'bg-orange-100 text-orange-700'
                             };
                             
                             const statusLabels: Record<string, string> = {
                                draft: 'Taslak',
                                issued: 'Kesildi',
                                paid: 'Ödendi',
                                cancelled: 'İptal',
                                overdue: 'Vadesi Geçti'
                             };
                             
                             if (projectInvoices.length === 0) {
                                return (
                                   <div className="p-8 text-center">
                                      <Receipt size={40} className="text-slate-200 mx-auto mb-3" />
                                      <div className="text-slate-400 text-sm">Fatura bulunmuyor</div>
                                   </div>
                                );
                             }
                             
                             return (
                                <div className="divide-y divide-slate-100">
                                   {projectInvoices.map(invoice => {
                                      const entity = entities.find(e => e.id === invoice.entityId);
                                      const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid';
                                      const isSelected = selectedInvoiceId === invoice.id;
                                      
                                      return (
                                         <div 
                                            key={invoice.id} 
                                            className={`p-4 transition cursor-pointer border-l-4 ${
                                               isSelected 
                                                  ? 'bg-blue-50 border-blue-500 hover:bg-blue-100' 
                                                  : 'hover:bg-slate-50 border-transparent'
                                            }`}
                                            onClick={(e) => {
                                               e.stopPropagation();
                                               setSelectedInvoiceId(isSelected ? null : invoice.id);
                                            }}
                                         >
                                            <div className="flex items-start justify-between gap-3">
                                               <div className="flex items-start gap-3 flex-1 min-w-0">
                                                  <div className={`p-2 rounded-lg shrink-0 ${invoice.invoiceType === 'outgoing' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                     <Receipt size={16} />
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                     <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-mono text-sm font-medium text-slate-800 truncate">{invoice.invoiceNumber}</span>
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${invoice.invoiceType === 'outgoing' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                           {invoice.invoiceType === 'outgoing' ? 'Giden' : 'Gelen'}
                                                        </span>
                                                     </div>
                                                     <div className="text-xs text-slate-500 truncate">{entity?.name || '-'}</div>
                                                     <div className="flex items-center gap-3 mt-1.5 text-xs">
                                                        <span className="text-slate-400 flex items-center gap-1">
                                                           <Calendar size={10} />
                                                           {new Date(invoice.invoiceDate).toLocaleDateString('tr-TR')}
                                                        </span>
                                                        {invoice.dueDate && (
                                                           <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
                                                              <Clock size={10} />
                                                              {new Date(invoice.dueDate).toLocaleDateString('tr-TR')}
                                                              {isOverdue && ' (Gecikti)'}
                                                           </span>
                                                        )}
                                                     </div>
                                                  </div>
                                               </div>
                                               <div className="text-right shrink-0">
                                                  <div className="font-mono font-bold text-slate-800 text-sm">{formatCurrency(invoice.totalAmount, invoice.currency)}</div>
                                                  <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[invoice.status]}`}>
                                                     {statusLabels[invoice.status]}
                                                  </span>
                                                  {isSelected && (
                                                     <div className="flex gap-1 mt-2 justify-end">
                                                        <button
                                                           onClick={(e) => { e.stopPropagation(); setViewingInvoice(invoice); }}
                                                           className="p-1 text-slate-600 hover:bg-slate-50 rounded transition"
                                                           title="Detay Görüntüle"
                                                        >
                                                           <Eye size={14} />
                                                        </button>
                                                        <button
                                                           onClick={(e) => { e.stopPropagation(); openInvoiceModal(invoice); }}
                                                           className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                                                           title="Düzenle"
                                                        >
                                                           <Edit size={14} />
                                                        </button>
                                                        <button
                                                           onClick={(e) => { e.stopPropagation(); handleDeleteInvoice(invoice.id); }}
                                                           className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                                                           title="Sil"
                                                        >
                                                           <Trash2 size={14} />
                                                        </button>
                                                     </div>
                                                  )}
                                               </div>
                                            </div>
                                         </div>
                                      );
                                   })}
                                </div>
                             );
                          })()}
                       </div>
                    </div>

                    {/* Right Column: Payments */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
                       <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                          <div className="flex items-center justify-between">
                             <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                <Wallet size={18} className="text-green-600" />
                                Ödemeler
                             </h4>
                             <button
                                onClick={() => openPaymentModal()}
                                className="p-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                                title="Yeni Ödeme"
                             >
                                <Plus size={16} />
                             </button>
                          </div>
                          <div className="flex items-center justify-end mt-2">
                             {(() => {
                                // Filter payments that belong to invoices of this project and apply entity filter
                                const projectPayments = payments.filter(p => {
                                   const invoice = invoices.find(inv => inv.id === p.invoiceId);
                                   if (!invoice || invoice.projectId !== selectedProject.id) return false;
                                   
                                   // Apply contract filter - if a contract is selected, show only payments for invoices of that contract
                                   if (selectedContractId && invoice.contractId !== selectedContractId) {
                                      return false;
                                   }
                                   
                                   // Apply selected invoice filter - if a specific invoice is selected, show only its payments
                                   if (selectedInvoiceId && p.invoiceId !== selectedInvoiceId) {
                                      return false;
                                   }
                                   
                                   // Apply entity filter - if entity filter is set, check if invoice belongs to that entity
                                   if (invoiceEntityFilter !== 'all' && invoice.entityId !== invoiceEntityFilter) {
                                      return false;
                                   }
                                   
                                   // Apply status filter - check invoice status
                                   if (invoiceStatusFilter !== 'all' && invoice.status !== invoiceStatusFilter) {
                                      return false;
                                   }
                                   
                                   // Apply type filter - check invoice type
                                   if (invoiceTypeFilter !== 'all' && invoice.invoiceType !== invoiceTypeFilter) {
                                      return false;
                                   }
                                   
                                   return true;
                                });
                                
                                // Calculate totals by currency
                                const totalsByCurrency: Record<string, number> = {};
                                projectPayments.forEach(p => {
                                   totalsByCurrency[p.currency] = (totalsByCurrency[p.currency] || 0) + p.amount;
                                });
                                
                                return (
                                   <div className="flex flex-col items-end gap-1">
                                      {Object.entries(totalsByCurrency).map(([currency, total]) => (
                                         <div key={currency} className="text-xs font-mono font-bold text-green-600">
                                            Toplam: {formatCurrency(total, currency as Currency)}
                                         </div>
                                      ))}
                                      {Object.keys(totalsByCurrency).length === 0 && (
                                         <div className="text-xs text-slate-400">Toplam: -</div>
                                      )}
                                   </div>
                                );
                             })()}
                          </div>
                       </div>
                       <div 
                          className="flex-1 overflow-y-auto max-h-[500px]"
                          onClick={() => {
                             // Clear selection when clicking on empty space
                             setSelectedInvoiceId(null);
                          }}
                       >
                          {(() => {
                             // Filter payments that belong to invoices of this project and apply entity filter
                             const projectPayments = payments.filter(p => {
                                const invoice = invoices.find(inv => inv.id === p.invoiceId);
                                if (!invoice || invoice.projectId !== selectedProject.id) return false;
                                
                                // Apply selected invoice filter - if a specific invoice is selected, show only its payments
                                if (selectedInvoiceId && p.invoiceId !== selectedInvoiceId) {
                                   return false;
                                }
                                
                                // Apply entity filter - if entity filter is set, check if invoice belongs to that entity
                                if (invoiceEntityFilter !== 'all' && invoice.entityId !== invoiceEntityFilter) {
                                   return false;
                                }
                                
                                // Apply status filter - check invoice status
                                if (invoiceStatusFilter !== 'all' && invoice.status !== invoiceStatusFilter) {
                                   return false;
                                }
                                
                                // Apply type filter - check invoice type
                                if (invoiceTypeFilter !== 'all' && invoice.invoiceType !== invoiceTypeFilter) {
                                   return false;
                                }
                                
                                return true;
                             });
                             
                             const methodLabels: Record<string, string> = {
                                cash: 'Nakit',
                                transfer: 'Havale/EFT',
                                card: 'Kart',
                                check: 'Çek'
                             };
                             
                             const statusColors: Record<string, string> = {
                                pending: 'bg-yellow-100 text-yellow-700',
                                completed: 'bg-green-100 text-green-700',
                                failed: 'bg-red-100 text-red-700',
                                cancelled: 'bg-slate-100 text-slate-600'
                             };
                             
                             const statusLabels: Record<string, string> = {
                                pending: 'Beklemede',
                                completed: 'Tamamlandı',
                                failed: 'Başarısız',
                                cancelled: 'İptal'
                             };
                             
                             if (projectPayments.length === 0) {
                                return (
                                   <div className="p-8 text-center">
                                      <Wallet size={40} className="text-slate-200 mx-auto mb-3" />
                                      <div className="text-slate-400 text-sm">Ödeme bulunmuyor</div>
                                   </div>
                                );
                             }
                             
                             return (
                                <div className="divide-y divide-slate-100">
                                   {projectPayments.map(payment => {
                                      const invoice = invoices.find(inv => inv.id === payment.invoiceId);
                                      const bankAccount = bankAccounts.find(a => a.id === payment.bankAccountId);
                                      const bankCard = bankCards.find(c => c.id === payment.bankCardId);
                                      
                                      return (
                                         <div 
                                            key={payment.id} 
                                            className="p-4 hover:bg-slate-50 transition cursor-pointer"
                                            onClick={(e) => e.stopPropagation()}
                                         >
                                            <div className="flex items-start justify-between gap-3">
                                               <div className="flex items-start gap-3 flex-1 min-w-0">
                                                  <div className={`p-2 rounded-lg shrink-0 ${
                                                     payment.paymentType === 'incoming' 
                                                        ? 'bg-green-50 text-green-600' 
                                                        : 'bg-red-50 text-red-600'
                                                  }`}>
                                                     {payment.paymentType === 'incoming' 
                                                        ? <ArrowDownLeft size={16} />
                                                        : <ArrowUpRight size={16} />
                                                     }
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                     <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-sm font-medium text-slate-800">{methodLabels[payment.paymentMethod] || payment.paymentMethod}</span>
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                           payment.paymentType === 'incoming' 
                                                              ? 'bg-green-100 text-green-700' 
                                                              : 'bg-red-100 text-red-700'
                                                        }`}>
                                                           {payment.paymentType === 'incoming' ? 'Gelen' : 'Giden'}
                                                        </span>
                                                        {payment.referenceNumber && (
                                                           <span className="font-mono text-[10px] text-slate-400">#{payment.referenceNumber}</span>
                                                        )}
                                                     </div>
                                                     {invoice && (
                                                        <div className="text-xs text-slate-500 truncate flex items-center gap-1">
                                                           <Receipt size={10} />
                                                           {invoice.invoiceNumber}
                                                        </div>
                                                     )}
                                                     <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                                                        <span className="flex items-center gap-1">
                                                           <Calendar size={10} />
                                                           {new Date(payment.paymentDate).toLocaleDateString('tr-TR')}
                                                        </span>
                                                        {bankAccount && (
                                                           <span className="flex items-center gap-1">
                                                              <Wallet size={10} />
                                                              {bankAccount.bankName}
                                                           </span>
                                                        )}
                                                        {bankCard && (
                                                           <span className="flex items-center gap-1">
                                                              <CreditCard size={10} />
                                                              {bankCard.cardName}
                                                           </span>
                                                        )}
                                                     </div>
                                                     {payment.description && (
                                                        <div className="text-xs text-slate-400 mt-1 truncate">{payment.description}</div>
                                                     )}
                                                  </div>
                                               </div>
                                               <div className="text-right shrink-0">
                                                  <div className={`font-mono font-bold text-sm ${payment.paymentType === 'incoming' ? 'text-green-600' : 'text-red-600'}`}>
                                                     {payment.paymentType === 'incoming' ? '+' : '-'}{formatCurrency(payment.amount, payment.currency)}
                                                  </div>
                                                  <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[payment.status]}`}>
                                                     {statusLabels[payment.status]}
                                                  </span>
                                                  <div className="flex gap-1 mt-2 justify-end">
                                                     <button
                                                        onClick={(e) => { e.stopPropagation(); setViewingPayment(payment); }}
                                                        className="p-1 text-slate-600 hover:bg-slate-50 rounded transition"
                                                        title="Detay Görüntüle"
                                                     >
                                                        <Eye size={14} />
                                                     </button>
                                                     <button
                                                        onClick={(e) => { e.stopPropagation(); openPaymentModal(payment); }}
                                                        className="p-1 text-green-600 hover:bg-green-50 rounded transition"
                                                        title="Düzenle"
                                                     >
                                                        <Edit size={14} />
                                                     </button>
                                                     <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeletePayment(payment.id); }}
                                                        className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                                                        title="Sil"
                                                     >
                                                        <Trash2 size={14} />
                                                     </button>
                                                  </div>
                                               </div>
                                            </div>
                                         </div>
                                      );
                                   })}
                                </div>
                             );
                          })()}
                       </div>
                    </div>
                 </div>
              </div>
           )}
        </div>

        {/* Transaction Modal (Aynı kalabilir, sadece context'e bağlı) */}
        {isTransactionModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col">
              <div className="flex justify-between items-center p-5 border-b border-slate-100 shrink-0">
                <h3 className="text-lg font-bold text-slate-800">
                  {editingTransaction ? 'İşlemi Düzenle' : 'Yeni Gelir/Gider Ekle'}
                </h3>
                <button onClick={() => {
                  setIsTransactionModalOpen(false);
                  setEditingTransaction(null);
                }} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
              </div>
              
              <div className="p-5 overflow-y-auto custom-scrollbar space-y-4">
                {/* Üst Kısım: Tutar, Tür, Para Birimi, Kur */}
                <div className="grid grid-cols-4 gap-3">
                   <label className="col-span-1">
                      <span className="text-xs text-slate-500 block mb-1">
                        Tutar {newTrans.isVatIncluded ? '(KDV Dahil)' : '(KDV Hariç)'}
                      </span>
                      <input 
                        type="number"
                        className="w-full p-2 border rounded-lg font-mono text-lg font-bold text-slate-700"
                        placeholder="0.00"
                        value={newTrans.amount || ''}
                        onChange={e => setNewTrans({...newTrans, amount: Number(e.target.value)})}
                      />
                   </label>
                   <label className="col-span-1">
                      <span className="text-xs text-slate-500 block mb-1">Para Birimi</span>
                       <select 
                         className="w-full p-2.5 border rounded-lg bg-slate-50 font-medium"
                         value={newTrans.currency}
                         onChange={e => setNewTrans({...newTrans, currency: e.target.value as any})}
                       >
                         {Object.keys(MARKET_RATES).map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                   </label>
                   <label className="col-span-1">
                      <span className="text-xs text-slate-500 block mb-1 flex items-center justify-between">
                        <span>Kur ({selectedProject?.agreementCurrency})</span>
                        {newTrans.currency !== selectedProject?.agreementCurrency && (
                          <button
                            type="button"
                            onClick={() => updateExchangeRate(true)}
                            disabled={isLoadingRate}
                            className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-blue-50 transition"
                            title="Kuru TCMB'den yenile"
                          >
                            {isLoadingRate ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <RefreshCw size={12} />
                            )}
                          </button>
                        )}
                      </span>
                      <div className="relative">
                        {newTrans.currency === selectedProject?.agreementCurrency ? (
                          <div className="w-full p-2.5 border rounded-lg bg-slate-100 text-slate-400 cursor-not-allowed font-mono text-sm">
                            1.0000
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 relative">
                                <input 
                                  type="number"
                                  className="w-full p-2.5 border rounded-lg font-mono text-sm font-bold outline-none bg-white text-blue-600 focus:border-blue-500"
                                  value={manualExchangeRate}
                                  onChange={e => {
                                    const val = Number(e.target.value);
                                    if (val > 0) setManualExchangeRate(val);
                                  }}
                                  step="0.0001"
                                  min="0.0001"
                                  placeholder="0.0000"
                                />
                              </div>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
                              {newTrans.currency === 'TRY' && selectedProject?.agreementCurrency !== 'TRY' ? (
                                <>
                                  <span className="font-medium">1 {selectedProject?.agreementCurrency} =</span>
                                  <span className="font-bold text-blue-600">{manualExchangeRate.toFixed(4)}</span>
                                  <span className="font-medium">{newTrans.currency}</span>
                                </>
                              ) : newTrans.currency !== 'TRY' && selectedProject?.agreementCurrency === 'TRY' ? (
                                <>
                                  <span className="font-medium">1 {newTrans.currency} =</span>
                                  <span className="font-bold text-blue-600">{manualExchangeRate.toFixed(4)}</span>
                                  <span className="font-medium">{selectedProject?.agreementCurrency}</span>
                                </>
                              ) : (
                                <>
                                  <span className="font-medium">1 {newTrans.currency} =</span>
                                  <span className="font-bold text-blue-600">{manualExchangeRate.toFixed(4)}</span>
                                  <span className="font-medium">{selectedProject?.agreementCurrency}</span>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                   </label>
                   <label className="col-span-1">
                      <span className="text-xs text-slate-500 block mb-1">İşlem Türü</span>
                      <select 
                        className={`w-full p-2.5 border rounded-lg font-medium ${newTrans.type === 'income' ? 'text-green-600 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200'}`}
                        value={newTrans.type}
                        onChange={e => setNewTrans({...newTrans, type: e.target.value as any})}
                      >
                        <option value="expense">Gider (-)</option>
                        <option value="income">Gelir (+)</option>
                      </select>
                   </label>
                </div>

                {/* Hesaplanan Sonuç */}
                {newTrans.currency !== selectedProject?.agreementCurrency && newTrans.amount && newTrans.amount > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Hesaplanan Tutar:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs font-mono">
                          {formatCurrency(newTrans.amount || 0, newTrans.currency as Currency)} ÷ {manualExchangeRate.toFixed(4)} =
                        </span>
                        <span className="font-bold text-blue-700 font-mono text-lg">
                          {formatCurrency((newTrans.amount || 0) / manualExchangeRate, selectedProject?.agreementCurrency as Currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tarih ve Kategori */}
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className="text-xs text-slate-500 block mb-1">Tarih</span>
                    <input 
                      type="date"
                      className="w-full p-2 border rounded-lg"
                      value={newTrans.date}
                      onChange={e => setNewTrans({...newTrans, date: e.target.value})}
                    />
                  </label>
                  <label>
                     <span className="text-xs text-slate-500 block mb-1">Kategori</span>
                     <input 
                        type="text"
                         className="w-full p-2 border rounded-lg"
                         placeholder="Örn: Altyapı, Maaş"
                         value={newTrans.category}
                         onChange={e => setNewTrans({...newTrans, category: e.target.value})}
                      />
                  </label>
                </div>

                {/* Sözleşme, Fatura ve Açıklama */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs text-slate-500 block mb-1">Bağlı Sözleşme (Opsiyonel)</span>
                      <select 
                        className="w-full p-2 border rounded-lg bg-white text-sm"
                        value={newTrans.contractId || ''}
                        onChange={e => setNewTrans({...newTrans, contractId: e.target.value})}
                      >
                        <option value="">Bağımsız İşlem</option>
                        {contracts
                          .filter(c => c.projectId === selectedProject?.id && c.status === 'active')
                          .map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                          ))
                        }
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs text-slate-500 block mb-1">Bağlı Fatura (Opsiyonel)</span>
                      <select 
                        className="w-full p-2 border rounded-lg bg-white text-sm"
                        value={newTrans.invoiceId || ''}
                        onChange={e => setNewTrans({...newTrans, invoiceId: e.target.value})}
                      >
                        <option value="">Bağımsız İşlem</option>
                        {invoices
                          .filter(inv => inv.projectId === selectedProject?.id || !inv.projectId)
                          .map(inv => (
                            <option key={inv.id} value={inv.id}>
                              {inv.invoiceNumber} - {formatCurrency(inv.totalAmount, inv.currency)}
                            </option>
                          ))
                        }
                      </select>
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-xs text-slate-500 block mb-1">Açıklama</span>
                    <input 
                      type="text"
                      className="w-full p-2 border rounded-lg"
                      placeholder="Örn: Sunucu faturası ödemesi"
                      value={newTrans.description}
                      onChange={e => setNewTrans({...newTrans, description: e.target.value})}
                    />
                  </label>
                </div>

                {/* Banka Hesap/Kart Seçimi */}
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className="text-xs text-slate-500 block mb-1">Banka Hesabı (Opsiyonel)</span>
                    <select 
                      className="w-full p-2 border rounded-lg bg-white text-sm"
                      value={newTrans.bankAccountId || ''}
                      onChange={e => {
                        setNewTrans({...newTrans, bankAccountId: e.target.value, bankCardId: ''});
                      }}
                    >
                      <option value="">Hesap seçin...</option>
                      {bankAccounts
                        .filter(a => a.currency === newTrans.currency || !newTrans.currency)
                        .map(account => (
                          <option key={account.id} value={account.id}>
                            {account.accountName} - {account.bankName} ({account.currency})
                          </option>
                        ))
                      }
                    </select>
                  </label>
                  
                  <label>
                    <span className="text-xs text-slate-500 block mb-1">Banka Kartı (Opsiyonel)</span>
                    <select 
                      className="w-full p-2 border rounded-lg bg-white text-sm"
                      value={newTrans.bankCardId || ''}
                      onChange={e => {
                        setNewTrans({...newTrans, bankCardId: e.target.value, bankAccountId: ''});
                      }}
                      disabled={!!newTrans.bankAccountId}
                    >
                      <option value="">Kart seçin...</option>
                      {bankCards.map(card => (
                        <option key={card.id} value={card.id}>
                          {card.cardName} - {card.bankName}
                        </option>
                      ))
                      }
                    </select>
                    {newTrans.bankAccountId && (
                      <p className="text-[10px] text-slate-400 mt-1">Hesap seçildiğinde kart seçilemez</p>
                    )}
                  </label>
                </div>

                {/* Fatura ve Belge */}
                <div className="grid grid-cols-2 gap-3">
                   <label>
                     <span className="text-xs text-slate-500 block mb-1">Fatura No</span>
                     <input 
                        type="text"
                         className="w-full p-2 border rounded-lg"
                         placeholder="GIB2024..."
                         value={newTrans.invoiceNumber || ''}
                         onChange={e => setNewTrans({...newTrans, invoiceNumber: e.target.value})}
                      />
                   </label>
                  <label>
                    <span className="text-xs text-slate-500 block mb-1">Belge</span>
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-2 transition border border-slate-200 border-dashed disabled:opacity-50 disabled:cursor-not-allowed">
                        <FileText size={14} />
                        {isUploadingDocument ? 'Yükleniyor...' : documentFile ? documentFile.name : 'Yükle'}
                        <input 
                          type="file" 
                          className="hidden" 
                          accept=".pdf,.jpg,.png,.jpeg"
                          disabled={isUploadingDocument}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setDocumentFile(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                      {documentFile && !isUploadingDocument && <CheckCircle size={16} className="text-green-500" />}
                      {documentFile && (
                        <button
                          type="button"
                          onClick={() => setDocumentFile(null)}
                          className="text-red-500 hover:text-red-700"
                          title="Dosyayı kaldır"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </label>
                </div>

                {/* Dinamik Vergi Yönetimi (Compact) */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="text-xs font-semibold text-slate-600">Vergiler</span>
                    <div className="flex gap-2 items-center">
                      <select 
                        className="flex-1 p-1 border rounded text-xs"
                        value={selectedTaxId}
                        onChange={e => setSelectedTaxId(e.target.value)}
                      >
                        <option value="">Vergi Seçin...</option>
                        {activeTaxes.map(tax => (
                          <option key={tax.id} value={tax.id}>
                            {tax.name} ({tax.rate}{tax.calculationType === 'percentage' ? '%' : ' TL'}) - {tax.baseType === 'amount' ? 'Tutar' : tax.baseType === 'vat' ? 'KDV' : 'Toplam'} üzerinden
                          </option>
                        ))}
                      </select>
                      <button 
                        onClick={addTax}
                        disabled={!newTrans.amount || !selectedTaxId}
                        className="bg-blue-600 text-white p-1 rounded hover:bg-blue-700 disabled:opacity-50"
                        title="Vergi Ekle"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Vergi Listesi */}
                  <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                    {newTrans.taxes?.map(tax => (
                      <div key={tax.id} className="flex justify-between items-center text-xs bg-white p-1.5 rounded border border-slate-100">
                        <span>
                          {tax.name} ({tax.rate}{tax.calculationType === 'percentage' ? '%' : ' TL'})
                          {tax.baseType !== 'amount' && (
                            <span className="text-slate-400 ml-1">
                              ({tax.baseType === 'vat' ? 'KDV' : 'Toplam'} üzerinden)
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{formatCurrency(tax.amount, newTrans.currency as Currency)}</span>
                          <button onClick={() => removeTax(tax.id)} className="text-red-400 hover:text-red-600"><X size={12} /></button>
                        </div>
                      </div>
                    ))}
                    {(!newTrans.taxes || newTrans.taxes.length === 0) && <div className="text-[10px] text-slate-400 text-center">Vergi eklenmedi.</div>}
                  </div>

                  {/* Toplam */}
                  <div className="border-t border-slate-200 pt-2 space-y-1">
                    <div className="flex justify-between items-center text-xs text-slate-600">
                      <span>KDV {newTrans.isVatIncluded ? 'Dahil' : 'Hariç'} Tutar:</span>
                      <span className="font-mono">{formatCurrency(newTrans.amount || 0, newTrans.currency as Currency)}</span>
                    </div>
                    {newTrans.taxes && newTrans.taxes.length > 0 && (
                      <div className="flex justify-between items-center text-xs text-slate-600">
                        <span>Toplam Vergi:</span>
                        <span className="font-mono text-orange-600">
                          {formatCurrency(newTrans.taxes.reduce((acc, t) => acc + t.amount, 0), newTrans.currency as Currency)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center font-bold text-sm pt-1 border-t border-slate-200">
                      <span>Genel Toplam:</span>
                      <span className="text-blue-600 font-mono">
                        {formatCurrency(
                          newTrans.isVatIncluded 
                            ? (newTrans.amount || 0) // KDV dahil ise tutar zaten toplam
                            : (newTrans.amount || 0) + (newTrans.taxes?.reduce((acc, t) => acc + t.amount, 0) || 0), // KDV hariç ise vergi ekle
                          newTrans.currency as Currency
                        )}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              <div className="flex gap-3 p-5 border-t border-slate-100 shrink-0 bg-slate-50 rounded-b-xl">
                <button 
                  onClick={() => {
                    setIsTransactionModalOpen(false);
                    setEditingTransaction(null);
                  }}
                  className="flex-1 py-2.5 text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition text-sm font-medium"
                >
                  İptal
                </button>
                <button 
                  onClick={handleAddTransaction}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium shadow-sm"
                >
                  {editingTransaction ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        )}

        {projectModal}
        
        {/* Contract Modal */}
        {isContractModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-5 border-b border-slate-100 shrink-0">
                <h3 className="text-lg font-bold text-slate-800">
                  {editingContractData ? 'Sözleşmeyi Düzenle' : 'Yeni Sözleşme'}
                </h3>
                <button onClick={() => setIsContractModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
              </div>
              
              <div className="p-5 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500 block mb-1">Sözleşme Kodu</span>
                    <input 
                      type="text" 
                      className="w-full p-2.5 border rounded-lg bg-slate-50 font-mono" 
                      value={contractFormData.code} 
                      readOnly 
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500 block mb-1">Durum</span>
                    <select 
                      className="w-full p-2.5 border rounded-lg bg-white"
                      value={contractFormData.status}
                      onChange={e => setContractFormData({...contractFormData, status: e.target.value as any})}
                    >
                      <option value="draft">Taslak</option>
                      <option value="active">Aktif</option>
                      <option value="completed">Tamamlandı</option>
                      <option value="cancelled">İptal</option>
                      <option value="expired">Süresi Doldu</option>
                    </select>
                  </label>
                </div>
                
                <label className="block">
                  <span className="text-xs font-medium text-slate-500 block mb-1">Sözleşme Adı *</span>
                  <input 
                    type="text" 
                    className="w-full p-2.5 border rounded-lg" 
                    value={contractFormData.name} 
                    onChange={e => setContractFormData({...contractFormData, name: e.target.value})}
                    placeholder="Örn: Panel Montaj Sözleşmesi"
                  />
                </label>
                
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500 block mb-1">Sözleşme Türü</span>
                    <select 
                      className="w-full p-2.5 border rounded-lg bg-white"
                      value={contractFormData.type}
                      onChange={e => setContractFormData({...contractFormData, type: e.target.value as any})}
                    >
                      <option value="customer_agreement">Müşteri Sözleşmesi</option>
                      <option value="subcontractor_agreement">Taşeron Sözleşmesi</option>
                      <option value="purchase_order">Satın Alma Siparişi</option>
                      <option value="service_agreement">Hizmet Sözleşmesi</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500 block mb-1">Taraf (Cari) *</span>
                    <select 
                      className="w-full p-2.5 border rounded-lg bg-white"
                      value={contractFormData.entityId}
                      onChange={e => setContractFormData({...contractFormData, entityId: e.target.value})}
                    >
                      <option value="">Seçiniz...</option>
                      {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </label>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500 block mb-1">Başlangıç Tarihi *</span>
                    <input 
                      type="date" 
                      className="w-full p-2.5 border rounded-lg" 
                      value={contractFormData.startDate} 
                      onChange={e => setContractFormData({...contractFormData, startDate: e.target.value})} 
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500 block mb-1">Bitiş Tarihi *</span>
                    <input 
                      type="date" 
                      className="w-full p-2.5 border rounded-lg" 
                      value={contractFormData.endDate} 
                      onChange={e => setContractFormData({...contractFormData, endDate: e.target.value})} 
                    />
                  </label>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500 block mb-1">Para Birimi</span>
                    <select 
                      className="w-full p-2.5 border rounded-lg bg-white"
                      value={contractFormData.currency}
                      onChange={e => setContractFormData({...contractFormData, currency: e.target.value as Currency})}
                    >
                      {Object.keys(MARKET_RATES).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500 block mb-1">
                      Tutar {contractFormData.isVatIncluded ? '(KDV Dahil)' : '(KDV Hariç)'}
                    </span>
                    <input 
                      type="number" 
                      className="w-full p-2.5 border rounded-lg font-mono" 
                      value={contractFormData.amount} 
                      onChange={e => setContractFormData({...contractFormData, amount: Number(e.target.value)})} 
                    />
                  </label>
                  <label className="flex items-center gap-2 mt-6">
                    <input
                      type="checkbox"
                      checked={contractFormData.isVatIncluded}
                      onChange={(e) => setContractFormData({...contractFormData, isVatIncluded: e.target.checked})}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="text-sm text-slate-700">KDV Dahil</span>
                  </label>
                </div>
                
                <label className="block">
                  <span className="text-xs font-medium text-slate-500 block mb-1">Açıklama</span>
                  <textarea 
                    className="w-full p-2.5 border rounded-lg h-20 resize-none" 
                    value={contractFormData.description} 
                    onChange={e => setContractFormData({...contractFormData, description: e.target.value})}
                    placeholder="Sözleşme hakkında notlar..."
                  />
                </label>
                
                {/* Sözleşme PDF Yükleme */}
                <div className="block">
                  <span className="text-xs font-medium text-slate-500 block mb-1">Sözleşme PDF</span>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition">
                      <Upload size={18} className="text-slate-400" />
                      <span className="text-sm text-slate-600">
                        {contractFile ? contractFile.name : 'PDF dosyası seç...'}
                      </span>
                      <input 
                        type="file" 
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                      />
                    </label>
                    {contractFormData.documentUrl && (
                      <a 
                        href={contractFormData.documentUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition text-sm"
                      >
                        <Link size={14} />
                        Görüntüle
                      </a>
                    )}
                  </div>
                  {contractFile && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
                      <CheckCircle size={14} />
                      <span>Dosya seçildi: {(contractFile.size / 1024 / 1024).toFixed(2)} MB</span>
                      <button 
                        onClick={() => setContractFile(null)}
                        className="ml-auto text-red-500 hover:text-red-700"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3 p-5 border-t border-slate-100 shrink-0 bg-slate-50 rounded-b-xl">
                <button 
                  onClick={() => setIsContractModalOpen(false)}
                  className="flex-1 py-2.5 text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition text-sm font-medium"
                  disabled={contractFileUploading}
                >
                  İptal
                </button>
                <button 
                  onClick={handleSaveContract}
                  disabled={contractFileUploading}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {contractFileUploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Yükleniyor...
                    </>
                  ) : (
                    editingContractData ? 'Güncelle' : 'Kaydet'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Invoice Modal */}
        {isInvoiceModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-5 border-b border-slate-100 shrink-0">
                <h3 className="text-lg font-bold text-slate-800">
                  {editingInvoiceData ? 'Faturayı Düzenle' : 'Yeni Fatura'}
                </h3>
                <button onClick={() => setIsInvoiceModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
              </div>
              
              <div className="p-5 overflow-y-auto space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500 block mb-1">Fatura No *</span>
                    <input 
                      type="text" 
                      className="w-full p-2.5 border rounded-lg font-mono" 
                      value={invoiceFormData.invoiceNumber} 
                      onChange={e => setInvoiceFormData({...invoiceFormData, invoiceNumber: e.target.value})}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500 block mb-1">Fatura Türü</span>
                    <select 
                      className="w-full p-2.5 border rounded-lg bg-white"
                      value={invoiceFormData.invoiceType}
                      onChange={e => setInvoiceFormData({...invoiceFormData, invoiceType: e.target.value as any})}
                    >
                      <option value="incoming">Gelen Fatura</option>
                      <option value="outgoing">Giden Fatura</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500 block mb-1">Durum</span>
                    <select 
                      className="w-full p-2.5 border rounded-lg bg-white"
                      value={invoiceFormData.status}
                      onChange={e => setInvoiceFormData({...invoiceFormData, status: e.target.value as any})}
                    >
                      <option value="draft">Taslak</option>
                      <option value="issued">Kesildi</option>
                      <option value="paid">Ödendi</option>
                      <option value="overdue">Vadesi Geçti</option>
                      <option value="cancelled">İptal</option>
                    </select>
                  </label>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500 block mb-1">Taraf (Cari) *</span>
                    <select 
                      className="w-full p-2.5 border rounded-lg bg-white"
                      value={invoiceFormData.entityId}
                      onChange={e => setInvoiceFormData({...invoiceFormData, entityId: e.target.value})}
                    >
                      <option value="">Seçiniz...</option>
                      {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500 block mb-1">Bağlı Sözleşme</span>
                    <select 
                      className="w-full p-2.5 border rounded-lg bg-white"
                      value={invoiceFormData.contractId}
                      onChange={e => {
                        const contract = contracts.find(c => c.id === e.target.value);
                        setInvoiceFormData({
                          ...invoiceFormData, 
                          contractId: e.target.value,
                          entityId: contract?.entityId || invoiceFormData.entityId
                        });
                      }}
                    >
                      <option value="">Seçiniz (Opsiyonel)</option>
                      {contracts.filter(c => c.projectId === selectedProject?.id).map(c => (
                        <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                      ))}
                    </select>
                  </label>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500 block mb-1">Fatura Tarihi</span>
                    <input 
                      type="date" 
                      className="w-full p-2.5 border rounded-lg" 
                      value={invoiceFormData.invoiceDate} 
                      onChange={e => setInvoiceFormData({...invoiceFormData, invoiceDate: e.target.value})} 
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500 block mb-1">Vade Tarihi</span>
                    <input 
                      type="date" 
                      className="w-full p-2.5 border rounded-lg" 
                      value={invoiceFormData.dueDate} 
                      onChange={e => setInvoiceFormData({...invoiceFormData, dueDate: e.target.value})} 
                    />
                  </label>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500 block mb-1">Para Birimi</span>
                    <select 
                      className="w-full p-2.5 border rounded-lg bg-white"
                      value={invoiceFormData.currency}
                      onChange={e => setInvoiceFormData({...invoiceFormData, currency: e.target.value as Currency})}
                    >
                      {Object.keys(MARKET_RATES).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500 block mb-1">
                      Tutar {invoiceFormData.isVatIncluded ? '(Vergiler Dahil)' : '(Vergiler Hariç)'}
                    </span>
                    <input 
                      type="number" 
                      className="w-full p-2.5 border rounded-lg font-mono" 
                      value={invoiceFormData.amount} 
                      onChange={e => setInvoiceFormData({...invoiceFormData, amount: Number(e.target.value)})} 
                    />
                  </label>
                  <label className="flex items-center gap-2 mt-6">
                    <input
                      type="checkbox"
                      checked={invoiceFormData.isVatIncluded}
                      onChange={(e) => setInvoiceFormData({...invoiceFormData, isVatIncluded: e.target.checked})}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="text-sm text-slate-700">Vergiler Dahil</span>
                  </label>
                </div>
                
                {/* Dynamic Tax Section */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-600">Vergiler</span>
                    <div className="flex items-center gap-2">
                      <select
                        className="p-2 border rounded-lg text-sm bg-white min-w-[180px]"
                        value={invoiceSelectedTaxId}
                        onChange={e => setInvoiceSelectedTaxId(e.target.value)}
                      >
                        <option value="">Vergi Seçin...</option>
                        {taxes.filter(t => t.isActive).sort((a, b) => a.order - b.order).map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.calculationType === 'percentage' ? `%${t.rate}` : `${t.rate} ${invoiceFormData.currency}`})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={addInvoiceTax}
                        disabled={!invoiceSelectedTaxId || !invoiceFormData.amount}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {invoiceFormData.taxes.length > 0 ? (
                    <div className="space-y-2">
                      {invoiceFormData.taxes.map(tax => (
                        <div key={tax.id} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-slate-700">{tax.name}</span>
                            <span className="text-xs text-slate-400">
                              ({tax.calculationType === 'percentage' ? `%${tax.rate}` : `Sabit: ${tax.rate}`})
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-slate-800">{formatCurrency(tax.amount, invoiceFormData.currency)}</span>
                            <button
                              type="button"
                              onClick={() => removeInvoiceTax(tax.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded transition"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-3 text-slate-400 text-sm">
                      Henüz vergi eklenmedi. Yukarıdan vergi seçerek ekleyebilirsiniz.
                    </div>
                  )}
                </div>
                
                {/* Calculated totals display */}
                {invoiceFormData.amount > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    {(() => {
                      const totals = calculateInvoiceTotals();
                      return (
                        <div className="flex justify-between items-center text-sm">
                          <div className="space-y-1">
                            <div className="text-slate-600">KDV Hariç Tutar: <strong>{formatCurrency(totals.amount, invoiceFormData.currency)}</strong></div>
                            <div className="text-slate-600">Toplam Vergi: <strong>{formatCurrency(totals.vatAmount, invoiceFormData.currency)}</strong></div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-slate-500 mb-1">Genel Toplam</div>
                            <div className="text-xl font-bold text-blue-700">{formatCurrency(totals.totalAmount, invoiceFormData.currency)}</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
                
                <label className="block">
                  <span className="text-xs font-medium text-slate-500 block mb-1">Açıklama</span>
                  <textarea 
                    className="w-full p-2.5 border rounded-lg h-16 resize-none" 
                    value={invoiceFormData.description} 
                    onChange={e => setInvoiceFormData({...invoiceFormData, description: e.target.value})}
                    placeholder="Fatura açıklaması..."
                  />
                </label>
                
                {/* Fatura PDF Yükleme */}
                <div className="block">
                  <span className="text-xs font-medium text-slate-500 block mb-1">Fatura PDF</span>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition">
                      <Upload size={18} className="text-slate-400" />
                      <span className="text-sm text-slate-600">
                        {invoiceFile ? invoiceFile.name : 'PDF dosyası seç...'}
                      </span>
                      <input 
                        type="file" 
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                      />
                    </label>
                    {invoiceFormData.documentUrl && (
                      <a 
                        href={invoiceFormData.documentUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm"
                      >
                        <Link size={14} />
                        Görüntüle
                      </a>
                    )}
                  </div>
                  {invoiceFile && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
                      <CheckCircle size={14} />
                      <span>Dosya seçildi: {(invoiceFile.size / 1024 / 1024).toFixed(2)} MB</span>
                      <button 
                        onClick={() => setInvoiceFile(null)}
                        className="ml-auto text-red-500 hover:text-red-700"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3 p-5 border-t border-slate-100 shrink-0 bg-slate-50 rounded-b-xl">
                <button 
                  onClick={() => setIsInvoiceModalOpen(false)}
                  disabled={invoiceFileUploading}
                  className="flex-1 py-2.5 text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition text-sm font-medium"
                >
                  İptal
                </button>
                <button 
                  onClick={handleSaveInvoice}
                  disabled={invoiceFileUploading}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {invoiceFileUploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Yükleniyor...
                    </>
                  ) : (
                    editingInvoiceData ? 'Güncelle' : 'Kaydet'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Payment Modal */}
        {isPaymentModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-5 border-b border-slate-100 shrink-0">
                <h3 className="text-lg font-bold text-slate-800">
                  {editingPaymentData ? 'Ödemeyi Düzenle' : 'Yeni Ödeme'}
                </h3>
                <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
              </div>
              
              <div className="p-5 overflow-y-auto space-y-4">
                {/* Ödeme Türü Göstergesi */}
                <div className={`p-3 rounded-lg flex items-center gap-2 ${
                  paymentFormData.paymentType === 'incoming' 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <span className={`text-xl ${paymentFormData.paymentType === 'incoming' ? 'text-green-600' : 'text-red-600'}`}>
                    {paymentFormData.paymentType === 'incoming' ? '↓' : '↑'}
                  </span>
                  <div>
                    <div className={`font-semibold ${paymentFormData.paymentType === 'incoming' ? 'text-green-700' : 'text-red-700'}`}>
                      {paymentFormData.paymentType === 'incoming' ? 'Gelen Ödeme' : 'Giden Ödeme'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {paymentFormData.paymentType === 'incoming' 
                        ? 'Bize ödeme yapılıyor (Giden fatura için)' 
                        : 'Biz ödeme yapıyoruz (Gelen fatura için)'}
                    </div>
                  </div>
                </div>
                
                <label className="block">
                  <span className="text-xs font-medium text-slate-500 block mb-1">Fatura *</span>
                  <select 
                    className="w-full p-2.5 border rounded-lg bg-white"
                    value={paymentFormData.invoiceId}
                    onChange={e => {
                      const invoice = invoices.find(inv => inv.id === e.target.value);
                      setPaymentFormData({
                        ...paymentFormData, 
                        invoiceId: e.target.value,
                        amount: invoice?.totalAmount || 0,
                        currency: invoice?.currency || 'TRY',
                        // Fatura türüne göre ödeme türünü otomatik ayarla
                        paymentType: getPaymentTypeFromInvoice(invoice)
                      });
                    }}
                  >
                    <option value="">Seçiniz...</option>
                    {invoices
                      .filter(inv => inv.projectId === selectedProject?.id)
                      .filter(inv => selectedContractId === null || inv.contractId === selectedContractId)
                      .map(inv => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceNumber} - {formatCurrency(inv.totalAmount, inv.currency)} ({inv.invoiceType === 'incoming' ? 'Gelen' : 'Giden'} - {inv.status === 'paid' ? 'Ödendi' : 'Bekliyor'})
                        </option>
                      ))
                    }
                  </select>
                </label>
                
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500 block mb-1">Ödeme Tarihi</span>
                    <input 
                      type="date" 
                      className="w-full p-2.5 border rounded-lg" 
                      value={paymentFormData.paymentDate} 
                      onChange={e => setPaymentFormData({...paymentFormData, paymentDate: e.target.value})} 
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500 block mb-1">Ödeme Yöntemi</span>
                    <select 
                      className="w-full p-2.5 border rounded-lg bg-white"
                      value={paymentFormData.paymentMethod}
                      onChange={e => setPaymentFormData({...paymentFormData, paymentMethod: e.target.value as any})}
                    >
                      <option value="transfer">Havale/EFT</option>
                      <option value="cash">Nakit</option>
                      <option value="card">Kart</option>
                      <option value="check">Çek</option>
                    </select>
                  </label>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500 block mb-1">Tutar *</span>
                    <input 
                      type="number" 
                      className="w-full p-2.5 border rounded-lg font-mono" 
                      value={paymentFormData.amount} 
                      onChange={e => setPaymentFormData({...paymentFormData, amount: Number(e.target.value)})} 
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500 block mb-1">Para Birimi</span>
                    <select 
                      className="w-full p-2.5 border rounded-lg bg-white"
                      value={paymentFormData.currency}
                      onChange={e => setPaymentFormData({...paymentFormData, currency: e.target.value as Currency})}
                    >
                      {Object.keys(MARKET_RATES).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500 block mb-1">Banka Hesabı</span>
                    <select 
                      className="w-full p-2.5 border rounded-lg bg-white"
                      value={paymentFormData.bankAccountId}
                      onChange={e => setPaymentFormData({...paymentFormData, bankAccountId: e.target.value, bankCardId: ''})}
                    >
                      <option value="">Seçiniz...</option>
                      {bankAccounts.map(a => (
                        <option key={a.id} value={a.id}>{a.bankName} - {a.accountName}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500 block mb-1">Durum</span>
                    <select 
                      className="w-full p-2.5 border rounded-lg bg-white"
                      value={paymentFormData.status}
                      onChange={e => setPaymentFormData({...paymentFormData, status: e.target.value as any})}
                    >
                      <option value="pending">Beklemede</option>
                      <option value="completed">Tamamlandı</option>
                      <option value="failed">Başarısız</option>
                      <option value="cancelled">İptal</option>
                    </select>
                  </label>
                </div>
                
                <label className="block">
                  <span className="text-xs font-medium text-slate-500 block mb-1">Referans No</span>
                  <input 
                    type="text" 
                    className="w-full p-2.5 border rounded-lg" 
                    value={paymentFormData.referenceNumber} 
                    onChange={e => setPaymentFormData({...paymentFormData, referenceNumber: e.target.value})}
                    placeholder="Dekont/İşlem numarası..."
                  />
                </label>
                
                <label className="block">
                  <span className="text-xs font-medium text-slate-500 block mb-1">Açıklama</span>
                  <textarea 
                    className="w-full p-2.5 border rounded-lg h-16 resize-none" 
                    value={paymentFormData.description} 
                    onChange={e => setPaymentFormData({...paymentFormData, description: e.target.value})}
                    placeholder="Ödeme açıklaması..."
                  />
                </label>
                
                {/* Dekont PDF Yükleme */}
                <div className="block">
                  <span className="text-xs font-medium text-slate-500 block mb-1">Dekont / Makbuz PDF</span>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-green-400 hover:bg-green-50/50 transition">
                      <Upload size={18} className="text-slate-400" />
                      <span className="text-sm text-slate-600">
                        {paymentFile ? paymentFile.name : 'PDF dosyası seç...'}
                      </span>
                      <input 
                        type="file" 
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => setPaymentFile(e.target.files?.[0] || null)}
                      />
                    </label>
                    {paymentFormData.documentUrl && (
                      <a 
                        href={paymentFormData.documentUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition text-sm"
                      >
                        <Link size={14} />
                        Görüntüle
                      </a>
                    )}
                  </div>
                  {paymentFile && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
                      <CheckCircle size={14} />
                      <span>Dosya seçildi: {(paymentFile.size / 1024 / 1024).toFixed(2)} MB</span>
                      <button 
                        onClick={() => setPaymentFile(null)}
                        className="ml-auto text-red-500 hover:text-red-700"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3 p-5 border-t border-slate-100 shrink-0 bg-slate-50 rounded-b-xl">
                <button 
                  onClick={() => setIsPaymentModalOpen(false)}
                  disabled={paymentFileUploading}
                  className="flex-1 py-2.5 text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition text-sm font-medium"
                >
                  İptal
                </button>
                <button 
                  onClick={handleSavePayment}
                  disabled={paymentFileUploading}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {paymentFileUploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Yükleniyor...
                    </>
                  ) : (
                    editingPaymentData ? 'Güncelle' : 'Kaydet'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Contract Detail View Modal */}
        {viewingContract && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-5 border-b border-slate-100 shrink-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-t-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <FileSignature size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{viewingContract.name}</h3>
                    <span className="text-indigo-100 text-sm font-mono">{viewingContract.code}</span>
                  </div>
                </div>
                <button onClick={() => setViewingContract(null)} className="text-white/80 hover:text-white p-1"><X size={20}/></button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6">
                {/* Status & Type */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    viewingContract.status === 'active' ? 'bg-green-100 text-green-700' :
                    viewingContract.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                    viewingContract.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {viewingContract.status === 'active' ? 'Aktif' : 
                     viewingContract.status === 'draft' ? 'Taslak' :
                     viewingContract.status === 'completed' ? 'Tamamlandı' : 'İptal'}
                  </span>
                  <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm">
                    {viewingContract.type === 'subcontractor_agreement' ? 'Taşeron Sözleşmesi' :
                     viewingContract.type === 'sales_contract' ? 'Satış Sözleşmesi' :
                     viewingContract.type === 'service_agreement' ? 'Hizmet Sözleşmesi' :
                     viewingContract.type === 'purchase_agreement' ? 'Satın Alma Sözleşmesi' : viewingContract.type}
                  </span>
                </div>
                
                {/* Entity Info */}
                <div className="bg-slate-50 p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-200 rounded-lg">
                      <Building2 size={18} className="text-slate-600" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Taraf</div>
                      <div className="font-semibold text-slate-800">
                        {entities.find(e => e.id === viewingContract.entityId)?.name || 'Bilinmiyor'}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Date Info */}
                <div className="bg-indigo-50 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={16} className="text-indigo-600" />
                    <span className="text-xs font-medium text-indigo-600">Tarih Aralığı</span>
                  </div>
                  <div className="text-sm text-slate-700">
                    {new Date(viewingContract.startDate).toLocaleDateString('tr-TR')} - {new Date(viewingContract.endDate).toLocaleDateString('tr-TR')}
                  </div>
                </div>
                
                {/* Amount Summary */}
                {(() => {
                  const contractInvoices = invoices.filter(inv => inv.contractId === viewingContract.id);
                  const totalInvoiced = contractInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
                  const remainingAmount = viewingContract.amount - totalInvoiced;
                  const progressPercent = viewingContract.amount > 0 ? Math.min((totalInvoiced / viewingContract.amount) * 100, 100) : 0;
                  
                  return (
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-5 rounded-xl space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">
                          Sözleşme Bedeli {viewingContract.isVatIncluded ? '(KDV Dahil)' : '(KDV Hariç)'}
                        </span>
                        <span className="text-lg font-bold text-slate-800">{formatCurrency(viewingContract.amount, viewingContract.currency)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-blue-600">Faturalanan</span>
                        <span className="font-mono font-semibold text-blue-600">{formatCurrency(totalInvoiced, viewingContract.currency)}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full transition-all ${progressPercent >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                        <span className={`font-semibold ${remainingAmount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                          {remainingAmount > 0 ? 'Kalan Miktar' : 'Tamamlandı'}
                        </span>
                        <span className={`text-xl font-bold ${remainingAmount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                          {formatCurrency(Math.max(remainingAmount, 0), viewingContract.currency)}
                        </span>
                      </div>
                      {contractInvoices.length > 0 && (
                        <div className="text-xs text-slate-500 text-right">
                          {contractInvoices.length} adet fatura kesildi
                        </div>
                      )}
                    </div>
                  );
                })()}
                
                {/* Payment Terms */}
                {viewingContract.paymentTerms && (
                  <div className="bg-amber-50 p-4 rounded-xl">
                    <div className="text-xs font-medium text-amber-600 mb-1">Ödeme Koşulları</div>
                    <div className="text-sm text-slate-700">{viewingContract.paymentTerms}</div>
                  </div>
                )}
                
                {/* Description */}
                {viewingContract.description && (
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <div className="text-xs font-medium text-slate-500 mb-1">Açıklama</div>
                    <div className="text-sm text-slate-700">{viewingContract.description}</div>
                  </div>
                )}
                
                {/* Document Link */}
                {(viewingContract as any).documentUrl && (
                  <a 
                    href={(viewingContract as any).documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-3 bg-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-200 transition font-medium"
                  >
                    <FileText size={18} />
                    Sözleşme PDF'ini Görüntüle
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
              
              <div className="flex gap-3 p-5 border-t border-slate-100 shrink-0 bg-slate-50 rounded-b-xl">
                <button 
                  onClick={() => setViewingContract(null)}
                  className="flex-1 py-2.5 text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition text-sm font-medium"
                >
                  Kapat
                </button>
                <button 
                  onClick={() => { openContractModal(viewingContract); setViewingContract(null); }}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium shadow-sm flex items-center justify-center gap-2"
                >
                  <Edit size={16} />
                  Düzenle
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Invoice Detail View Modal */}
        {viewingInvoice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
              <div className={`flex justify-between items-center p-5 border-b border-slate-100 shrink-0 rounded-t-xl ${
                viewingInvoice.invoiceType === 'incoming' 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500' 
                  : 'bg-gradient-to-r from-green-500 to-emerald-500'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Receipt size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{viewingInvoice.invoiceNumber}</h3>
                    <span className={`text-sm ${viewingInvoice.invoiceType === 'incoming' ? 'text-orange-100' : 'text-green-100'}`}>
                      {viewingInvoice.invoiceType === 'incoming' ? 'Gelen Fatura' : 'Giden Fatura'}
                    </span>
                  </div>
                </div>
                <button onClick={() => setViewingInvoice(null)} className="text-white/80 hover:text-white p-1"><X size={20}/></button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6">
                {/* Status */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    viewingInvoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                    viewingInvoice.status === 'issued' ? 'bg-blue-100 text-blue-700' :
                    viewingInvoice.status === 'overdue' ? 'bg-red-100 text-red-700' :
                    viewingInvoice.status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {viewingInvoice.status === 'paid' ? 'Ödendi' : 
                     viewingInvoice.status === 'issued' ? 'Kesildi' :
                     viewingInvoice.status === 'overdue' ? 'Vadesi Geçmiş' :
                     viewingInvoice.status === 'cancelled' ? 'İptal' : 'Taslak'}
                  </span>
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    viewingInvoice.invoiceType === 'incoming' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {viewingInvoice.invoiceType === 'incoming' ? 'Gelen' : 'Giden'}
                  </span>
                </div>
                
                {/* Entity Info */}
                <div className="bg-slate-50 p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-200 rounded-lg">
                      <Building2 size={18} className="text-slate-600" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">{viewingInvoice.invoiceType === 'incoming' ? 'Gönderen' : 'Alıcı'}</div>
                      <div className="font-semibold text-slate-800">
                        {entities.find(e => e.id === viewingInvoice.entityId)?.name || 'Bilinmiyor'}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Date Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar size={16} className="text-blue-600" />
                      <span className="text-xs font-medium text-blue-600">Fatura Tarihi</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-700">
                      {new Date(viewingInvoice.invoiceDate).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                  <div className={`p-4 rounded-xl ${viewingInvoice.dueDate ? 'bg-amber-50' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={16} className={viewingInvoice.dueDate ? 'text-amber-600' : 'text-slate-400'} />
                      <span className={`text-xs font-medium ${viewingInvoice.dueDate ? 'text-amber-600' : 'text-slate-400'}`}>Vade Tarihi</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-700">
                      {viewingInvoice.dueDate ? new Date(viewingInvoice.dueDate).toLocaleDateString('tr-TR') : '-'}
                    </div>
                  </div>
                </div>
                
                {/* Amount Details */}
                {(() => {
                  const invoicePayments = payments.filter(p => p.invoiceId === viewingInvoice.id && p.status === 'completed');
                  const totalPaid = invoicePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                  const remainingAmount = viewingInvoice.totalAmount - totalPaid;
                  const progressPercent = viewingInvoice.totalAmount > 0 ? Math.min((totalPaid / viewingInvoice.totalAmount) * 100, 100) : 0;
                  
                  return (
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-5 rounded-xl space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">Tutar {viewingInvoice.isVatIncluded ? '(Vergiler Dahil)' : '(Vergiler Hariç)'}</span>
                        <span className="font-mono font-semibold">{formatCurrency(viewingInvoice.amount, viewingInvoice.currency)}</span>
                      </div>
                      {viewingInvoice.taxes && Array.isArray(viewingInvoice.taxes) && viewingInvoice.taxes.length > 0 && (
                        <div className="border-t border-slate-200 pt-3 space-y-2">
                          {viewingInvoice.taxes.map((tax: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-sm">
                              <span className="text-slate-500">{tax.name} ({tax.calculationType === 'percentage' ? `%${tax.rate}` : 'Sabit'})</span>
                              <span className="font-mono text-slate-600">{formatCurrency(tax.amount, viewingInvoice.currency)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="border-t-2 border-slate-300 pt-3 flex justify-between items-center">
                        <span className="font-semibold text-slate-700">Genel Toplam</span>
                        <span className="text-xl font-bold text-slate-800">{formatCurrency(viewingInvoice.totalAmount, viewingInvoice.currency)}</span>
                      </div>
                      
                      {/* Payment Progress */}
                      <div className="border-t border-slate-200 pt-4 mt-2 space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-green-600 font-medium">Ödenen</span>
                          <span className="font-mono font-semibold text-green-600">{formatCurrency(totalPaid, viewingInvoice.currency)}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full transition-all ${progressPercent >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`font-semibold ${remainingAmount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                            {remainingAmount > 0 ? 'Kalan Miktar' : 'Tamamen Ödendi'}
                          </span>
                          <span className={`text-lg font-bold ${remainingAmount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                            {formatCurrency(Math.max(remainingAmount, 0), viewingInvoice.currency)}
                          </span>
                        </div>
                        {invoicePayments.length > 0 && (
                          <div className="text-xs text-slate-500 text-right">
                            {invoicePayments.length} adet ödeme yapıldı
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
                
                {/* Description */}
                {viewingInvoice.description && (
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <div className="text-xs font-medium text-slate-500 mb-1">Açıklama</div>
                    <div className="text-sm text-slate-700">{viewingInvoice.description}</div>
                  </div>
                )}
                
                {/* Document Link */}
                {viewingInvoice.documentUrl && (
                  <a 
                    href={viewingInvoice.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition font-medium"
                  >
                    <FileText size={18} />
                    Fatura PDF'ini Görüntüle
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
              
              <div className="flex gap-3 p-5 border-t border-slate-100 shrink-0 bg-slate-50 rounded-b-xl">
                <button 
                  onClick={() => setViewingInvoice(null)}
                  className="flex-1 py-2.5 text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition text-sm font-medium"
                >
                  Kapat
                </button>
                <button 
                  onClick={() => { openInvoiceModal(viewingInvoice); setViewingInvoice(null); }}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium shadow-sm flex items-center justify-center gap-2"
                >
                  <Edit size={16} />
                  Düzenle
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Payment Detail View Modal */}
        {viewingPayment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
              <div className={`flex justify-between items-center p-5 border-b border-slate-100 shrink-0 rounded-t-xl ${
                viewingPayment.paymentType === 'incoming' 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                  : 'bg-gradient-to-r from-red-500 to-rose-500'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    {viewingPayment.paymentType === 'incoming' ? <ArrowDownLeft size={20} className="text-white" /> : <ArrowUpRight size={20} className="text-white" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {viewingPayment.paymentType === 'incoming' ? 'Gelen Ödeme' : 'Giden Ödeme'}
                    </h3>
                    {viewingPayment.referenceNumber && (
                      <span className="text-white/80 text-sm font-mono">#{viewingPayment.referenceNumber}</span>
                    )}
                  </div>
                </div>
                <button onClick={() => setViewingPayment(null)} className="text-white/80 hover:text-white p-1"><X size={20}/></button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6">
                {/* Status & Amount */}
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    viewingPayment.status === 'completed' ? 'bg-green-100 text-green-700' :
                    viewingPayment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    viewingPayment.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {viewingPayment.status === 'completed' ? 'Tamamlandı' : 
                     viewingPayment.status === 'pending' ? 'Beklemede' :
                     viewingPayment.status === 'failed' ? 'Başarısız' : 'İptal'}
                  </span>
                  <div className={`text-2xl font-bold ${viewingPayment.paymentType === 'incoming' ? 'text-green-600' : 'text-red-600'}`}>
                    {viewingPayment.paymentType === 'incoming' ? '+' : '-'}{formatCurrency(viewingPayment.amount, viewingPayment.currency)}
                  </div>
                </div>
                
                {/* Payment Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar size={16} className="text-slate-500" />
                      <span className="text-xs font-medium text-slate-500">Ödeme Tarihi</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-700">
                      {new Date(viewingPayment.paymentDate).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard size={16} className="text-slate-500" />
                      <span className="text-xs font-medium text-slate-500">Ödeme Yöntemi</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-700">
                      {viewingPayment.paymentMethod === 'transfer' ? 'Havale/EFT' :
                       viewingPayment.paymentMethod === 'cash' ? 'Nakit' :
                       viewingPayment.paymentMethod === 'card' ? 'Kart' : 'Çek'}
                    </div>
                  </div>
                </div>
                
                {/* Invoice Info with Remaining Amount */}
                {viewingPayment.invoiceId && (() => {
                  const linkedInvoice = invoices.find(inv => inv.id === viewingPayment.invoiceId);
                  if (!linkedInvoice) return null;
                  
                  const invoicePayments = payments.filter(p => p.invoiceId === linkedInvoice.id && p.status === 'completed');
                  const totalPaid = invoicePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                  const remainingAmount = linkedInvoice.totalAmount - totalPaid;
                  const progressPercent = linkedInvoice.totalAmount > 0 ? Math.min((totalPaid / linkedInvoice.totalAmount) * 100, 100) : 0;
                  
                  return (
                    <div className="bg-blue-50 p-4 rounded-xl space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Receipt size={18} className="text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-blue-600">Bağlı Fatura</div>
                          <div className="font-semibold text-slate-800">{linkedInvoice.invoiceNumber}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500">Fatura Toplamı</div>
                          <div className="font-mono font-semibold text-slate-700">{formatCurrency(linkedInvoice.totalAmount, linkedInvoice.currency)}</div>
                        </div>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${progressPercent >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">Toplam Ödenen: <strong className="text-green-600">{formatCurrency(totalPaid, linkedInvoice.currency)}</strong></span>
                        <span className={`font-semibold ${remainingAmount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                          {remainingAmount > 0 ? `Kalan: ${formatCurrency(remainingAmount, linkedInvoice.currency)}` : '✓ Tamamen Ödendi'}
                        </span>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Bank Account Info */}
                {viewingPayment.bankAccountId && (
                  <div className="bg-emerald-50 p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <Wallet size={18} className="text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-xs text-emerald-600">Banka Hesabı</div>
                        <div className="font-semibold text-slate-800">
                          {bankAccounts.find(ba => ba.id === viewingPayment.bankAccountId)?.bankName} - {bankAccounts.find(ba => ba.id === viewingPayment.bankAccountId)?.accountName}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Description */}
                {viewingPayment.description && (
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <div className="text-xs font-medium text-slate-500 mb-1">Açıklama</div>
                    <div className="text-sm text-slate-700">{viewingPayment.description}</div>
                  </div>
                )}
                
                {/* Document Link */}
                {viewingPayment.documentUrl && (
                  <a 
                    href={viewingPayment.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-3 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition font-medium"
                  >
                    <FileText size={18} />
                    Dekont/Makbuzu Görüntüle
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
              
              <div className="flex gap-3 p-5 border-t border-slate-100 shrink-0 bg-slate-50 rounded-b-xl">
                <button 
                  onClick={() => setViewingPayment(null)}
                  className="flex-1 py-2.5 text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition text-sm font-medium"
                >
                  Kapat
                </button>
                <button 
                  onClick={() => { openPaymentModal(viewingPayment); setViewingPayment(null); }}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium shadow-sm flex items-center justify-center gap-2"
                >
                  <Edit size={16} />
                  Düzenle
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
  }

  // --- List View ---
  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Proje Yönetimi</h2>
        <button 
          onClick={() => openProjectModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-sm"
        >
          <Plus size={18} /> Yeni Proje
        </button>
      </div>

      {/* Filtre ve Arama */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2">
          <select 
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={projectFilterStatus}
            onChange={(e) => setProjectFilterStatus(e.target.value as ProjectStatus | 'all')}
          >
            <option value="all">Tüm Durumlar</option>
            {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map(s => (
              <option key={s} value={s}>{PROJECT_STATUS_LABELS[s].label}</option>
            ))}
          </select>
          <select 
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={projectFilterCompany}
            onChange={(e) => setProjectFilterCompany(e.target.value)}
          >
            <option value="all">Tüm Şirketler</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Ara (Proje Adı, Kod)..."
            value={projectSearchQuery}
            onChange={e => setProjectSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Project List Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filteredProjects.map(project => (
          <div key={project.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition cursor-pointer group relative" onClick={() => setSelectedProject(project)}>
            {/* Badge for Priority */}
             <div className={`absolute top-5 right-5 w-3 h-3 rounded-full ${PROJECT_PRIORITY_LABELS[project.priority].color.split(' ')[0]} border ${PROJECT_PRIORITY_LABELS[project.priority].color.split(' ')[2]}`} title={`Öncelik: ${PROJECT_PRIORITY_LABELS[project.priority].label}`}></div>

            <div className="flex justify-between items-start mb-3 pr-6">
              <div className="flex items-start gap-4">
                 <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                   <Briefcase size={24} />
                 </div>
                 <div>
                   <div className="text-xs font-mono text-slate-400 mb-0.5">{project.code}</div>
                   <h3 className="font-bold text-lg text-slate-800 leading-tight group-hover:text-blue-600 transition">{project.name}</h3>
                   <p className="text-sm text-slate-500 line-clamp-1 mt-1">{project.description}</p>
                 </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm mt-4 pt-4 border-t border-slate-100">
               <div>
                  <div className="text-slate-400 text-xs mb-1">Şirket / Müşteri</div>
                  <div className="font-medium text-slate-700 flex flex-col gap-0.5">
                     <span className="flex items-center gap-1"><Building2 size={12} className="text-slate-400" /> {companies.find(c => c.id === project.companyId)?.name}</span>
                     {project.customerId && <span className="flex items-center gap-1 text-blue-600 text-xs"><Briefcase size={12} /> {entities.find(e => e.id === project.customerId)?.name}</span>}
                  </div>
               </div>
               <div>
                  <div className="text-slate-400 text-xs mb-1">Bütçe</div>
                  <div className="font-medium text-slate-700 font-mono">{formatCurrency(project.budget, project.agreementCurrency)}</div>
               </div>
               <div>
                  <div className="text-slate-400 text-xs mb-1">Durum</div>
                  <div className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${PROJECT_STATUS_LABELS[project.status].color}`}>
                     {PROJECT_STATUS_LABELS[project.status].label}
                  </div>
               </div>
               <div>
                  <div className="text-slate-400 text-xs mb-1">İlerleme</div>
                  <div className="flex items-center gap-2">
                     <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${project.progress}%` }}></div>
                     </div>
                     <span className="text-xs text-slate-600">%{project.progress}</span>
                  </div>
               </div>
            </div>
          </div>
        ))}
      </div>

      {projectModal}
    </div>
  );
};

