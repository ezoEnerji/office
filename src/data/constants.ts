import { 
  PermissionType, 
  Role, 
  User, 
  EntityType, 
  ProjectStatus, 
  ProjectPriority,
  ContractStatus,
  ContractType,
  Currency,
  Document
} from '../types';
import { 
  UserCheck, 
  Truck, 
  HardHat, 
  Users, 
  Building2, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Ban, 
  Target, 
  ArrowRightLeft,
  FileText,
  FileSignature,
  ScrollText,
  Archive,
  File
} from 'lucide-react';

export const PERMISSIONS_LIST: { key: PermissionType; label: string }[] = [
  { key: 'VIEW_DASHBOARD', label: 'Dashboard Görüntüleme' },
  { key: 'MANAGE_COMPANIES', label: 'Şirket Yönetimi (Holding)' },
  { key: 'MANAGE_ENTITIES', label: 'Cari Hesap Yönetimi' },
  { key: 'MANAGE_PROJECTS', label: 'Proje Yönetimi' },
  { key: 'MANAGE_TRANSACTIONS', label: 'Gelir/Gider İşleme' },
  { key: 'MANAGE_ROLES', label: 'Kullanıcı ve Rol Yönetimi' },
  { key: 'VIEW_REPORTS', label: 'Finansal Raporlama' },
  { key: 'MANAGE_DOCUMENTS', label: 'Döküman Yönetimi' },
];

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, { label: string, color: string, icon: any }> = {
  draft: { label: 'Taslak', color: 'bg-slate-100 text-slate-600', icon: FileText },
  active: { label: 'Yürürlükte', color: 'bg-green-100 text-green-700', icon: FileSignature },
  completed: { label: 'Tamamlandı', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  cancelled: { label: 'İptal Edildi', color: 'bg-red-100 text-red-700', icon: Ban },
  expired: { label: 'Süresi Doldu', color: 'bg-orange-100 text-orange-700', icon: Archive },
};

export const CONTRACT_TYPE_LABELS: Record<ContractType, { label: string, color: string, icon: any }> = {
  customer_agreement: { label: 'Müşteri Sözleşmesi', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Users },
  subcontractor_agreement: { label: 'Taşeron Sözleşmesi', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: HardHat },
  purchase_order: { label: 'Satın Alma Siparişi', color: 'bg-orange-50 text-orange-700 border-orange-200', icon: Truck },
  service_agreement: { label: 'Hizmet Sözleşmesi', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: ScrollText },
};

export const INITIAL_ROLES: Role[] = [
  {
    id: 'admin',
    name: 'Süper Yönetici',
    description: 'Tüm sisteme tam erişim',
    permissions: ['VIEW_DASHBOARD', 'MANAGE_COMPANIES', 'MANAGE_ENTITIES', 'MANAGE_PROJECTS', 'MANAGE_TRANSACTIONS', 'MANAGE_ROLES', 'VIEW_REPORTS', 'MANAGE_DOCUMENTS']
  },
  {
    id: 'acc',
    name: 'Muhasebe Müdürü',
    description: 'Finansal işlemler ve raporlar',
    permissions: ['VIEW_DASHBOARD', 'MANAGE_ENTITIES', 'MANAGE_TRANSACTIONS', 'VIEW_REPORTS']
  },
  {
    id: 'pm',
    name: 'Proje Yöneticisi',
    description: 'Sadece proje takibi',
    permissions: ['VIEW_DASHBOARD', 'MANAGE_PROJECTS', 'VIEW_REPORTS']
  }
];

export const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'Ahmet Yılmaz', email: 'ahmet@sirket.com', title: 'Genel Müdür', roleId: 'admin', avatar: 'https://i.pravatar.cc/150?u=u1', password: '123' },
  { id: 'u2', name: 'Ayşe Demir', email: 'ayse@sirket.com', title: 'Muhasebe Uzmanı', roleId: 'acc', avatar: 'https://i.pravatar.cc/150?u=u2', password: '123' },
  { id: 'u3', name: 'Mehmet Can', email: 'mehmet@sirket.com', title: 'Kıdemli Mühendis', roleId: 'pm', avatar: 'https://i.pravatar.cc/150?u=u3', password: '123' },
];

export const ENTITY_TYPE_LABELS: Record<EntityType, { label: string, color: string, icon: any }> = {
  customer: { label: 'Müşteri', color: 'bg-emerald-100 text-emerald-700', icon: UserCheck },
  supplier: { label: 'Tedarikçi', color: 'bg-orange-100 text-orange-700', icon: Truck },
  subcontractor: { label: 'Alt Yüklenici', color: 'bg-blue-100 text-blue-700', icon: HardHat },
  employee: { label: 'Personel', color: 'bg-purple-100 text-purple-700', icon: Users },
  other: { label: 'Diğer', color: 'bg-slate-100 text-slate-700', icon: Building2 },
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, { label: string, color: string, icon: any }> = {
  active: { label: 'Devam Ediyor', color: 'bg-green-100 text-green-700', icon: Clock },
  completed: { label: 'Tamamlandı', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  hold: { label: 'Beklemede', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  cancelled: { label: 'İptal', color: 'bg-red-100 text-red-700', icon: Ban },
};

export const PROJECT_PRIORITY_LABELS: Record<ProjectPriority, { label: string, color: string, icon: any }> = {
  high: { label: 'Yüksek', color: 'bg-red-50 text-red-600 border-red-200', icon: AlertCircle },
  medium: { label: 'Orta', color: 'bg-orange-50 text-orange-600 border-orange-200', icon: Target },
  low: { label: 'Düşük', color: 'bg-slate-50 text-slate-600 border-slate-200', icon: ArrowRightLeft },
};

export const MARKET_RATES: Record<Currency, number> = {
  'TRY': 1,
  'USD': 34.50,
  'EUR': 36.20,
  'GBP': 42.10
};

export const COMPANY_COLORS = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-orange-500', 'bg-rose-500', 'bg-indigo-500'];

export const INITIAL_DOCUMENTS: Document[] = [
  { id: 'd1', name: 'Merkez Ofis Projesi Sözleşmesi.pdf', type: 'pdf', size: '2.4 MB', uploadDate: '2023-11-10', uploaderId: 'u1', category: 'contract', relatedId: 'p2', url: '#' },
  { id: 'd2', name: 'Sunucu Faturası - Ekim.pdf', type: 'pdf', size: '1.1 MB', uploadDate: '2023-10-15', uploaderId: 'u2', category: 'invoice', relatedId: 't2', url: '#' },
  { id: 'd3', name: 'Şantiye Fotoğrafları.jpg', type: 'image', size: '5.6 MB', uploadDate: '2023-09-20', uploaderId: 'u3', category: 'project', relatedId: 'p2', url: '#' },
  { id: 'd4', name: 'Personel Listesi 2024.xlsx', type: 'spreadsheet', size: '0.5 MB', uploadDate: '2024-01-05', uploaderId: 'u1', category: 'personnel', url: '#' },
  { id: 'd5', name: 'Şirket Logosu.png', type: 'image', size: '0.2 MB', uploadDate: '2023-01-01', uploaderId: 'u1', category: 'general', url: '#' },
];
