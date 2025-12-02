export type Currency = 'USD' | 'EUR' | 'TRY' | 'GBP';
export type PermissionType = 'VIEW_DASHBOARD' | 'MANAGE_COMPANIES' | 'MANAGE_PROJECTS' | 'MANAGE_TRANSACTIONS' | 'MANAGE_ROLES' | 'VIEW_REPORTS' | 'MANAGE_ENTITIES' | 'MANAGE_DOCUMENTS';
export type EntityType = 'customer' | 'supplier' | 'subcontractor' | 'employee' | 'other';
export type ProjectStatus = 'active' | 'completed' | 'hold' | 'cancelled';
export type ProjectPriority = 'low' | 'medium' | 'high';

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: PermissionType[];
}

export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'spreadsheet' | 'word' | 'other';
  size: string;
  uploadDate: string;
  uploaderId: string;
  category: 'contract' | 'invoice' | 'project' | 'personnel' | 'general';
  relatedId?: string; // Proje, Sözleşme veya Personel ID'si
  url: string;
}

export interface User {
  id: string;
  name: string;
  email: string; // Added
  title?: string; // Added
  password?: string; // Added
  roleId: string;
  avatar: string;
}

export interface Company {
  id: string;
  name: string;
  taxNumber: string;
  baseCurrency: Currency;
  address: string;
  phone: string;
  email: string;
  website: string;
  logoColor: string;
}

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  taxOffice?: string;
  taxNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  iban?: string;
  bankName?: string;
  status: 'active' | 'passive';
}

export interface Project {
  id: string;
  code: string;
  companyId: string;
  customerId?: string; // Projenin yapıldığı müşteri (Cari Hesap)
  name: string;
  description?: string;
  managerId?: string;
  agreementCurrency: Currency;
  budget: number;
  startDate: string;
  endDate?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  location?: string;
  tags: string[];
  progress?: number;
}

export interface Transaction {
  id: string;
  projectId: string;
  type: 'income' | 'expense';
  amount: number; // KDV hariç tutar
  currency: Currency;
  exchangeRate: number;
  date: string;
  description: string;
  category: string;
  invoiceNumber?: string; // Fatura Numarası
  contractId?: string; // Bağlı Sözleşme ID
  taxes?: TaxItem[]; // Dinamik vergi kalemleri
  totalAmount?: number; // Vergi dahil toplam tutar
  documentUrl?: string; // Fatura/Dekont Dosyası (PDF/Image)
  isVatIncluded?: boolean; // KDV dahil mi? (false = KDV hariç, true = KDV dahil)
}

export interface TaxItem {
  id: string;
  name: string;
  rate: number;
  amount: number;
}

export type ContractStatus = 'draft' | 'active' | 'completed' | 'cancelled' | 'expired';
export type ContractType = 'customer_agreement' | 'subcontractor_agreement' | 'purchase_order' | 'service_agreement';

export interface Contract {
  id: string;
  code: string; // CNT-2024-001
  name: string;
  type: ContractType;
  status: ContractStatus;
  projectId: string;
  companyId: string;
  entityId: string; // Sözleşmenin yapıldığı taraf (Cari)
  startDate: string;
  endDate: string;
  amount: number; // Sözleşme Bedeli (KDV hariç)
  currency: Currency;
  paymentTerms?: string; // Ödeme Koşulları (Metin)
  description?: string;
  attachments: string[]; // Dosya URL'leri
  isVatIncluded?: boolean; // KDV dahil mi? (false = KDV hariç, true = KDV dahil)
}

