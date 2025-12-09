import React, { useState, useMemo } from 'react';
import {
  FileText, Download, Printer, Filter, Calendar, TrendingUp, TrendingDown,
  DollarSign, Briefcase, Users, FileSignature, BarChart3, PieChart,
  ArrowUpRight, ArrowDownRight, Search, X, Settings, Save
} from 'lucide-react';
import { Transaction, Project, Company, Entity, Contract, User, Currency } from '../types';
import { formatCurrency } from '../utils/helpers';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { tr } from 'date-fns/locale';

// Recharts imports
import {
  LineChart, Line, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface ReportsProps {
  transactions: Transaction[];
  projects: Project[];
  companies: Company[];
  entities: Entity[];
  contracts: Contract[];
  users: User[];
}

type ReportType = 'financial' | 'project' | 'contract' | 'entity' | 'custom';
type DateRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

interface ReportFilters {
  dateRange: DateRange;
  startDate: string;
  endDate: string;
  projectIds: string[];
  companyIds: string[];
  entityIds: string[];
  currency: string;
  transactionType: 'all' | 'income' | 'expense';
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export const Reports: React.FC<ReportsProps> = ({
  transactions,
  projects,
  companies,
  entities,
  contracts,
  users
}) => {
  const [activeReportType, setActiveReportType] = useState<ReportType>('financial');
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: 'month',
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    projectIds: [],
    companyIds: [],
    entityIds: [],
    currency: 'all',
    transactionType: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [reportCurrency, setReportCurrency] = useState<Currency | 'TRY'>('TRY'); // Rapor gösterim para birimi

  // Tarih aralığı hesaplama
  const getDateRange = (range: DateRange) => {
    const today = new Date();
    switch (range) {
      case 'today':
        return { start: format(today, 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
      case 'week':
        return { start: format(subDays(today, 7), 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
      case 'month':
        return { start: format(startOfMonth(today), 'yyyy-MM-dd'), end: format(endOfMonth(today), 'yyyy-MM-dd') };
      case 'quarter':
        const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
        return { start: format(quarterStart, 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
      case 'year':
        return { start: format(startOfYear(today), 'yyyy-MM-dd'), end: format(endOfYear(today), 'yyyy-MM-dd') };
      default:
        return { start: filters.startDate, end: filters.endDate };
    }
  };

  // Filtrelenmiş veriler
  const filteredData = useMemo(() => {
    let filtered = [...transactions];

    // Tarih filtresi
    const dateRange = getDateRange(filters.dateRange);
    filtered = filtered.filter(t => {
      const txDate = format(new Date(t.date), 'yyyy-MM-dd');
      return txDate >= dateRange.start && txDate <= dateRange.end;
    });

    // Proje filtresi
    if (filters.projectIds.length > 0) {
      filtered = filtered.filter(t => filters.projectIds.includes(t.projectId));
    }

    // Şirket filtresi
    if (filters.companyIds.length > 0) {
      const projectIds = projects
        .filter(p => filters.companyIds.includes(p.companyId))
        .map(p => p.id);
      filtered = filtered.filter(t => projectIds.includes(t.projectId));
    }

    // Para birimi filtresi
    if (filters.currency !== 'all') {
      filtered = filtered.filter(t => t.currency === filters.currency);
    }

    // İşlem tipi filtresi
    if (filters.transactionType !== 'all') {
      filtered = filtered.filter(t => t.type === filters.transactionType);
    }

    return filtered;
  }, [transactions, filters, projects]);

  // Finansal Özet - Çoklu döviz desteği ile
  const financialSummary = useMemo(() => {
    // Para birimine göre grupla
    const byCurrency = filteredData.reduce((acc, t) => {
      if (!acc[t.currency]) {
        acc[t.currency] = { income: 0, expense: 0, taxes: 0, transactions: [] };
      }
      acc[t.currency].transactions.push(t);
      return acc;
    }, {} as Record<Currency, { income: number; expense: number; taxes: number; transactions: Transaction[] }>);

    // Her para birimi için hesapla
    const currencySummaries: Record<Currency, any> = {} as any;
    
    (['TRY', 'USD', 'EUR', 'GBP'] as Currency[]).forEach(currency => {
      const data = byCurrency[currency] || { income: 0, expense: 0, taxes: 0, transactions: [] };
      
      const income = data.transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const expense = data.transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const taxes = data.transactions.reduce((sum, t) => {
        if (t.taxes) {
          return sum + t.taxes.reduce((s, tax) => s + tax.amount, 0);
        }
        return sum;
      }, 0);

      // KDV Analizi
      const vatAnalysis = {
        totalVatIncluded: data.transactions
          .filter(t => t.isVatIncluded)
          .reduce((sum, t) => sum + t.amount, 0),
        totalVatExcluded: data.transactions
          .filter(t => !t.isVatIncluded)
          .reduce((sum, t) => sum + t.amount, 0),
        incomeVat: data.transactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => {
            if (t.taxes) {
              return sum + t.taxes.reduce((s, tax) => s + tax.amount, 0);
            }
            return sum;
          }, 0),
        expenseVat: data.transactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => {
            if (t.taxes) {
              return sum + t.taxes.reduce((s, tax) => s + tax.amount, 0);
            }
            return sum;
          }, 0),
        netVat: 0
      };
      vatAnalysis.netVat = vatAnalysis.incomeVat - vatAnalysis.expenseVat;

      currencySummaries[currency] = {
        income,
        expense,
        taxes,
        net: income - expense, // Net = Gelir - Gider (vergiler ayrı gösterilir)
        transactionCount: data.transactions.length,
        vatAnalysis
      };
    });

    // Tüm para birimlerini TRY'ye çevirerek toplam hesapla (varsayılan)
    const totalInTRY = {
      income: filteredData
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + (t.amount * t.exchangeRate), 0),
      expense: filteredData
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (t.amount * t.exchangeRate), 0),
      taxes: filteredData.reduce((sum, t) => {
        if (t.taxes) {
          return sum + t.taxes.reduce((s, tax) => s + (tax.amount * t.exchangeRate), 0);
        }
        return sum;
      }, 0),
      vatAnalysis: {
        totalVatIncluded: filteredData
          .filter(t => t.isVatIncluded)
          .reduce((sum, t) => sum + (t.amount * t.exchangeRate), 0),
        totalVatExcluded: filteredData
          .filter(t => !t.isVatIncluded)
          .reduce((sum, t) => sum + (t.amount * t.exchangeRate), 0),
        incomeVat: filteredData
          .filter(t => t.type === 'income')
          .reduce((sum, t) => {
            if (t.taxes) {
              return sum + t.taxes.reduce((s, tax) => s + (tax.amount * t.exchangeRate), 0);
            }
            return sum;
          }, 0),
        expenseVat: filteredData
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => {
            if (t.taxes) {
              return sum + t.taxes.reduce((s, tax) => s + (tax.amount * t.exchangeRate), 0);
            }
            return sum;
          }, 0),
        netVat: 0
      },
      transactionCount: filteredData.length
    };
    totalInTRY.vatAnalysis.netVat = totalInTRY.vatAnalysis.incomeVat - totalInTRY.vatAnalysis.expenseVat;
    totalInTRY.net = totalInTRY.income - totalInTRY.expense;

    // Seçili para birimi için özet
    const selectedSummary = reportCurrency === 'TRY' 
      ? { ...totalInTRY, currency: 'TRY' as Currency }
      : (currencySummaries[reportCurrency] || {
          income: 0,
          expense: 0,
          taxes: 0,
          net: 0,
          transactionCount: 0,
          vatAnalysis: { totalVatIncluded: 0, totalVatExcluded: 0, incomeVat: 0, expenseVat: 0, netVat: 0 },
          currency: reportCurrency
        });

    return {
      ...selectedSummary,
      byCurrency: currencySummaries, // Tüm para birimleri için ayrı özetler
      totalInTRY // TRY'de toplam (karşılaştırma için)
    };
  }, [filteredData, reportCurrency]);

  // Aylık trend verisi
  const monthlyTrend = useMemo(() => {
    const grouped = filteredData.reduce((acc, t) => {
      const month = format(new Date(t.date), 'yyyy-MM');
      if (!acc[month]) {
        acc[month] = { month, income: 0, expense: 0 };
      }
      const amountTRY = t.amount * t.exchangeRate;
      if (t.type === 'income') {
        acc[month].income += amountTRY;
      } else {
        acc[month].expense += amountTRY;
      }
      return acc;
    }, {} as Record<string, { month: string; income: number; expense: number }>);

    return Object.values(grouped)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(item => ({
        ...item,
        net: item.income - item.expense,
        monthLabel: format(new Date(item.month + '-01'), 'MMM yyyy', { locale: tr })
      }));
  }, [filteredData]);

  // Kategori bazlı dağılım
  const categoryDistribution = useMemo(() => {
    const grouped = filteredData.reduce((acc, t) => {
      if (!acc[t.category]) {
        acc[t.category] = { name: t.category, income: 0, expense: 0 };
      }
      const amountTRY = t.amount * t.exchangeRate;
      if (t.type === 'income') {
        acc[t.category].income += amountTRY;
      } else {
        acc[t.category].expense += amountTRY;
      }
      return acc;
    }, {} as Record<string, { name: string; income: number; expense: number }>);

    return Object.values(grouped).map(item => ({
      name: item.name,
      value: item.income + item.expense,
      income: item.income,
      expense: item.expense
    })).sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // Proje bazlı performans
  const projectPerformance = useMemo(() => {
    const projectMap = projects.reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {} as Record<string, Project>);

    const grouped = filteredData.reduce((acc, t) => {
      const project = projectMap[t.projectId];
      if (!project) return acc;

      if (!acc[project.id]) {
        acc[project.id] = {
          id: project.id,
          name: project.name,
          code: project.code,
          budget: project.budget,
          income: 0,
          expense: 0,
          progress: project.progress || 0
        };
      }

      const amountTRY = t.amount * t.exchangeRate;
      if (t.type === 'income') {
        acc[project.id].income += amountTRY;
      } else {
        acc[project.id].expense += amountTRY;
      }

      return acc;
    }, {} as Record<string, any>);

      return Object.values(grouped).map((p: any) => ({
      ...p,
      net: p.income - p.expense,
      budgetUtilization: p.budget > 0 ? (p.expense / p.budget) * 100 : 0 // Sadece gider/bütçe
    })).sort((a: any, b: any) => b.net - a.net);
  }, [filteredData, projects]);

  // Cari hesap özeti
  const entitySummary = useMemo(() => {
    const entityMap = entities.reduce((acc, e) => {
      acc[e.id] = e;
      return acc;
    }, {} as Record<string, Entity>);

    const projectMap = projects.reduce((acc, p) => {
      if (p.customerId) {
        acc[p.id] = p.customerId;
      }
      return acc;
    }, {} as Record<string, string>);

    const grouped = filteredData.reduce((acc, t) => {
      const entityId = projectMap[t.projectId];
      if (!entityId) return acc;

      if (!acc[entityId]) {
        acc[entityId] = {
          id: entityId,
          name: entityMap[entityId]?.name || 'Bilinmiyor',
          income: 0,
          expense: 0
        };
      }

      const amountTRY = t.amount * t.exchangeRate;
      if (t.type === 'income') {
        acc[entityId].income += amountTRY;
      } else {
        acc[entityId].expense += amountTRY;
      }

      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).map((e: any) => ({
      ...e,
      net: e.income - e.expense
    })).sort((a: any, b: any) => Math.abs(b.net) - Math.abs(a.net));
  }, [filteredData, projects, entities]);

  // Export fonksiyonları
  const exportToCSV = () => {
    const headers = ['Tarih', 'Proje', 'Tip', 'Kategori', 'Tutar (KDV Hariç)', 'KDV Dahil/Hariç', 'KDV Tutarı', 'Para Birimi', 'Kur', 'TRY Tutarı', 'Açıklama'];
    const rows = filteredData.map(t => {
      const project = projects.find(p => p.id === t.projectId);
      const totalTax = t.taxes ? t.taxes.reduce((sum, tax) => sum + (tax.amount * t.exchangeRate), 0) : 0;
      return [
        format(new Date(t.date), 'dd.MM.yyyy'),
        project?.name || '-',
        t.type === 'income' ? 'Gelir' : 'Gider',
        t.category,
        t.amount.toFixed(2),
        t.isVatIncluded ? 'KDV Dahil' : 'KDV Hariç',
        totalTax.toFixed(2),
        t.currency,
        t.exchangeRate.toFixed(4),
        (t.amount * t.exchangeRate).toFixed(2),
        t.description
      ];
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rapor_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    window.print();
  };

  // Özel rapor CSV export fonksiyonu
  const exportCustomReportToCSV = () => {
    const cols = selectedColumns.length === 0 
      ? ['date', 'project', 'type', 'category', 'amount', 'currency', 'amountTRY', 'description']
      : selectedColumns;

    const colLabels: Record<string, string> = {
      date: 'Tarih',
      project: 'Proje',
      type: 'Tip',
      category: 'Kategori',
      amount: 'Tutar',
      currency: 'Para Birimi',
      exchangeRate: 'Kur',
      amountTRY: 'TRY Tutarı',
      vat: 'KDV',
      totalAmount: 'Toplam',
      description: 'Açıklama',
      invoiceNumber: 'Fatura No',
      bankAccount: 'Banka Hesabı',
      bankCard: 'Banka Kartı',
      entity: 'Cari Hesap',
      company: 'Şirket'
    };

    const headers = cols.map(col => colLabels[col] || col);
    const rows = filteredData.map(t => {
      const project = projects.find(p => p.id === t.projectId);
      const company = project ? companies.find(c => c.id === project.companyId) : null;
      const totalTax = t.taxes ? t.taxes.reduce((sum, tax) => sum + (tax.amount * t.exchangeRate), 0) : 0;
      const totalAmount = (t.amount * t.exchangeRate) + totalTax;
      
      const rowData: Record<string, any> = {
        date: format(new Date(t.date), 'dd.MM.yyyy'),
        project: project?.name || '-',
        type: t.type === 'income' ? 'Gelir' : 'Gider',
        category: t.category,
        amount: t.amount.toFixed(2),
        currency: t.currency,
        exchangeRate: t.exchangeRate.toFixed(4),
        amountTRY: (t.amount * t.exchangeRate).toFixed(2),
        vat: totalTax.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        description: t.description || '',
        invoiceNumber: t.invoiceNumber || '',
        bankAccount: t.bankAccount?.accountName || '',
        bankCard: t.bankCard?.cardName || '',
        entity: project?.customerId ? entities.find(e => e.id === project.customerId)?.name || '' : '',
        company: company?.name || ''
      };

      return cols.map(col => rowData[col] || '');
    });

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const handleDateRangeChange = (range: DateRange) => {
    const dates = getDateRange(range);
    setFilters({ ...filters, dateRange: range, startDate: dates.start, endDate: dates.end });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Raporlama Modülü</h2>
          <p className="text-sm text-slate-500 mt-1">Kapsamlı finansal ve operasyonel raporlar</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <Filter size={16} />
            Filtreler
          </button>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <Download size={16} />
            Excel
          </button>
          <button
            onClick={exportToPDF}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <Printer size={16} />
            Yazdır
          </button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
        {[
          { id: 'financial', label: 'Finansal Raporlar', icon: DollarSign },
          { id: 'project', label: 'Proje Raporları', icon: Briefcase },
          { id: 'contract', label: 'Sözleşme Raporları', icon: FileSignature },
          { id: 'entity', label: 'Cari Hesap Raporları', icon: Users },
          { id: 'custom', label: 'Özel Rapor', icon: Settings }
        ].map(type => (
          <button
            key={type.id}
            onClick={() => setActiveReportType(type.id as ReportType)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition flex items-center justify-center gap-2 ${
              activeReportType === type.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <type.icon size={16} />
            {type.label}
          </button>
        ))}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-800">Filtreler</h3>
            <button onClick={() => setShowFilters(false)} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tarih Aralığı */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Tarih Aralığı</label>
              <select
                className="w-full p-2 border rounded-lg text-sm"
                value={filters.dateRange}
                onChange={(e) => handleDateRangeChange(e.target.value as DateRange)}
              >
                <option value="today">Bugün</option>
                <option value="week">Son 7 Gün</option>
                <option value="month">Bu Ay</option>
                <option value="quarter">Bu Çeyrek</option>
                <option value="year">Bu Yıl</option>
                <option value="custom">Özel Tarih</option>
              </select>
            </div>

            {filters.dateRange === 'custom' && (
              <>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    className="w-full p-2 border rounded-lg text-sm"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Bitiş Tarihi</label>
                  <input
                    type="date"
                    className="w-full p-2 border rounded-lg text-sm"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  />
                </div>
              </>
            )}

            {/* Para Birimi Filtresi */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Para Birimi (Filtre)</label>
              <select
                className="w-full p-2 border rounded-lg text-sm"
                value={filters.currency}
                onChange={(e) => setFilters({ ...filters, currency: e.target.value })}
              >
                <option value="all">Tümü</option>
                <option value="TRY">TRY</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>

            {/* Rapor Gösterim Para Birimi */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Rapor Para Birimi</label>
              <select
                className="w-full p-2 border rounded-lg text-sm"
                value={reportCurrency}
                onChange={(e) => setReportCurrency(e.target.value as Currency)}
              >
                <option value="TRY">TRY (Tümü TRY'ye çevrilmiş toplam)</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
              <p className="text-xs text-slate-400 mt-1">Raporların hangi para biriminde gösterileceği</p>
            </div>

            {/* İşlem Tipi */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">İşlem Tipi</label>
              <select
                className="w-full p-2 border rounded-lg text-sm"
                value={filters.transactionType}
                onChange={(e) => setFilters({ ...filters, transactionType: e.target.value as any })}
              >
                <option value="all">Tümü</option>
                <option value="income">Gelir</option>
                <option value="expense">Gider</option>
              </select>
            </div>

            {/* Proje Filtresi */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Proje</label>
              <select
                className="w-full p-2 border rounded-lg text-sm"
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    setFilters({
                      ...filters,
                      projectIds: [...filters.projectIds, e.target.value]
                    });
                  }
                }}
              >
                <option value="">Tüm Projeler</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Şirket Filtresi */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Şirket</label>
              <select
                className="w-full p-2 border rounded-lg text-sm"
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    setFilters({
                      ...filters,
                      companyIds: [...filters.companyIds, e.target.value]
                    });
                  }
                }}
              >
                <option value="">Tüm Şirketler</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Seçili Filtreler */}
          {(filters.projectIds.length > 0 || filters.companyIds.length > 0) && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex flex-wrap gap-2">
                {filters.projectIds.map(id => {
                  const project = projects.find(p => p.id === id);
                  return project ? (
                    <span key={id} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs flex items-center gap-2">
                      {project.name}
                      <button onClick={() => setFilters({ ...filters, projectIds: filters.projectIds.filter(i => i !== id) })}>
                        <X size={12} />
                      </button>
                    </span>
                  ) : null;
                })}
                {filters.companyIds.map(id => {
                  const company = companies.find(c => c.id === id);
                  return company ? (
                    <span key={id} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs flex items-center gap-2">
                      {company.name}
                      <button onClick={() => setFilters({ ...filters, companyIds: filters.companyIds.filter(i => i !== id) })}>
                        <X size={12} />
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FINANCIAL REPORTS */}
      {activeReportType === 'financial' && (
        <div className="space-y-6">
          {/* Özet Kartlar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-500">Toplam Gelir (KDV Hariç)</span>
                <TrendingUp className="text-green-500" size={20} />
              </div>
              <div className="text-2xl font-bold text-slate-800">
                {formatCurrency(financialSummary.income, reportCurrency === 'TRY' ? 'TRY' : reportCurrency)}
              </div>
              {reportCurrency === 'TRY' && financialSummary.byCurrency && (
                <div className="text-xs text-slate-400 mt-1">
                  {Object.entries(financialSummary.byCurrency).map(([curr, data]: [string, any]) => 
                    data.income > 0 ? `${formatCurrency(data.income, curr as Currency)} ` : ''
                  )}
                </div>
              )}
              {financialSummary.vatAnalysis.incomeVat > 0 && (
                <div className="text-xs text-green-600 mt-1">+ {formatCurrency(financialSummary.vatAnalysis.incomeVat)} KDV</div>
              )}
              <div className="text-xs text-slate-400 mt-1">{financialSummary.transactionCount} işlem</div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-500">Toplam Gider (KDV Hariç)</span>
                <TrendingDown className="text-red-500" size={20} />
              </div>
              <div className="text-2xl font-bold text-slate-800">
                {formatCurrency(financialSummary.expense, reportCurrency === 'TRY' ? 'TRY' : reportCurrency)}
              </div>
              {reportCurrency === 'TRY' && financialSummary.byCurrency && (
                <div className="text-xs text-slate-400 mt-1">
                  {Object.entries(financialSummary.byCurrency).map(([curr, data]: [string, any]) => 
                    data.expense > 0 ? `${formatCurrency(data.expense, curr as Currency)} ` : ''
                  )}
                </div>
              )}
              {financialSummary.vatAnalysis.expenseVat > 0 && (
                <div className="text-xs text-red-600 mt-1">
                  + {formatCurrency(financialSummary.vatAnalysis.expenseVat, reportCurrency === 'TRY' ? 'TRY' : reportCurrency)} KDV
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-500">Toplam KDV</span>
                <FileText className="text-orange-500" size={20} />
              </div>
              <div className="text-2xl font-bold text-slate-800">
                {formatCurrency(financialSummary.taxes, reportCurrency === 'TRY' ? 'TRY' : reportCurrency)}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Gelir: {formatCurrency(financialSummary.vatAnalysis.incomeVat, reportCurrency === 'TRY' ? 'TRY' : reportCurrency)} | 
                Gider: {formatCurrency(financialSummary.vatAnalysis.expenseVat, reportCurrency === 'TRY' ? 'TRY' : reportCurrency)}
              </div>
            </div>

            <div className={`bg-white rounded-xl border p-6 ${financialSummary.net >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-500">Net Durum</span>
                {financialSummary.net >= 0 ? (
                  <ArrowUpRight className="text-green-500" size={20} />
                ) : (
                  <ArrowDownRight className="text-red-500" size={20} />
                )}
              </div>
              <div className={`text-2xl font-bold ${financialSummary.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(financialSummary.net, reportCurrency === 'TRY' ? 'TRY' : reportCurrency)}
              </div>
              <div className="text-xs text-slate-400 mt-1">Kar / Zarar</div>
            </div>
          </div>

          {/* KDV Analiz Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-slate-500 text-xs mb-1">KDV Dahil İşlemler</p>
              <h3 className="text-xl font-bold text-slate-800">
                {formatCurrency(financialSummary.vatAnalysis.totalVatIncluded, reportCurrency === 'TRY' ? 'TRY' : reportCurrency)}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {filteredData.filter(t => t.isVatIncluded).length} işlem
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-slate-500 text-xs mb-1">KDV Hariç İşlemler</p>
              <h3 className="text-xl font-bold text-slate-800">
                {formatCurrency(financialSummary.vatAnalysis.totalVatExcluded, reportCurrency === 'TRY' ? 'TRY' : reportCurrency)}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {filteredData.filter(t => !t.isVatIncluded).length} işlem
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-slate-500 text-xs mb-1">Gelir KDV</p>
              <h3 className="text-xl font-bold text-green-600">
                {formatCurrency(financialSummary.vatAnalysis.incomeVat, reportCurrency === 'TRY' ? 'TRY' : reportCurrency)}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Tahsil edilen</p>
            </div>

            <div className={`rounded-xl border p-5 ${financialSummary.vatAnalysis.netVat >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className="text-slate-500 text-xs mb-1">Net KDV Durumu</p>
              <h3 className={`text-xl font-bold ${financialSummary.vatAnalysis.netVat >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {financialSummary.vatAnalysis.netVat >= 0 ? '+' : ''}
                {formatCurrency(financialSummary.vatAnalysis.netVat, reportCurrency === 'TRY' ? 'TRY' : reportCurrency)}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {financialSummary.vatAnalysis.netVat >= 0 ? 'Ödenecek' : 'İade Edilecek'}
              </p>
            </div>
          </div>

          {/* Grafikler */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Aylık Trend */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Aylık Trend Analizi</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthLabel" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="#10b981" name="Gelir" strokeWidth={2} />
                  <Line type="monotone" dataKey="expense" stroke="#ef4444" name="Gider" strokeWidth={2} />
                  <Line type="monotone" dataKey="net" stroke="#3b82f6" name="Net" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Kategori Dağılımı */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Kategori Bazlı Dağılım</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={categoryDistribution.slice(0, 6)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryDistribution.slice(0, 6).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

            {/* Gelir-Gider Karşılaştırması */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Gelir-Gider Karşılaştırması</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthLabel" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="income" fill="#10b981" name="Gelir" />
                  <Bar dataKey="expense" fill="#ef4444" name="Gider" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Kategori Detay */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Kategori Detay Analizi</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryDistribution.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="income" fill="#10b981" name="Gelir" />
                  <Bar dataKey="expense" fill="#ef4444" name="Gider" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detaylı Tablo */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800">İşlem Detayları</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-3 text-left font-medium">Tarih</th>
                    <th className="p-3 text-left font-medium">Proje</th>
                    <th className="p-3 text-left font-medium">Tip</th>
                    <th className="p-3 text-left font-medium">Kategori</th>
                    <th className="p-3 text-right font-medium">Tutar (KDV {filteredData[0]?.isVatIncluded ? 'Dahil' : 'Hariç'})</th>
                    <th className="p-3 text-right font-medium">KDV</th>
                    <th className="p-3 text-right font-medium">TRY Tutarı</th>
                    <th className="p-3 text-left font-medium">Açıklama</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.slice(0, 50).map(t => {
                    const project = projects.find(p => p.id === t.projectId);
                    const totalTax = t.taxes ? t.taxes.reduce((sum, tax) => sum + (tax.amount * t.exchangeRate), 0) : 0;
                    return (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-600">{format(new Date(t.date), 'dd.MM.yyyy')}</td>
                        <td className="p-3 text-slate-700">{project?.name || '-'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            t.type === 'income' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {t.type === 'income' ? 'Gelir' : 'Gider'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">{t.category}</td>
                        <td className="p-3 text-right text-slate-700">
                          <div className="flex flex-col items-end">
                            <span>{formatCurrency(t.amount)} {t.currency}</span>
                            <span className="text-xs text-slate-400">
                              {t.isVatIncluded ? '(KDV Dahil)' : '(KDV Hariç)'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-right text-orange-600 font-medium">
                          {totalTax > 0 ? formatCurrency(totalTax) : '-'}
                        </td>
                        <td className="p-3 text-right font-medium text-slate-800">
                          {formatCurrency(t.amount * t.exchangeRate)}
                        </td>
                        <td className="p-3 text-slate-600">{t.description}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PROJECT REPORTS */}
      {activeReportType === 'project' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Proje Performans Analizi</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-3 text-left font-medium">Proje Kodu</th>
                    <th className="p-3 text-left font-medium">Proje Adı</th>
                    <th className="p-3 text-right font-medium">Bütçe</th>
                    <th className="p-3 text-right font-medium">Gelir</th>
                    <th className="p-3 text-right font-medium">Gider</th>
                    <th className="p-3 text-right font-medium">Net</th>
                    <th className="p-3 text-right font-medium">Bütçe Kullanımı</th>
                    <th className="p-3 text-right font-medium">İlerleme</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectPerformance.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-700">{p.code}</td>
                      <td className="p-3 text-slate-700">{p.name}</td>
                      <td className="p-3 text-right text-slate-600">{formatCurrency(p.budget)}</td>
                      <td className="p-3 text-right text-green-600">{formatCurrency(p.income)}</td>
                      <td className="p-3 text-right text-red-600">{formatCurrency(p.expense)}</td>
                      <td className={`p-3 text-right font-medium ${p.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {formatCurrency(p.net)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-24 bg-slate-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${p.budgetUtilization > 100 ? 'bg-red-500' : 'bg-blue-500'}`}
                              style={{ width: `${Math.min(p.budgetUtilization, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-600 w-12 text-right">
                            {p.budgetUtilization.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-24 bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-purple-500 h-2 rounded-full"
                              style={{ width: `${p.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-600 w-12 text-right">{p.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Proje Karşılaştırma Grafiği */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Proje Karşılaştırması</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={projectPerformance.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="code" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="income" fill="#10b981" name="Gelir" />
                <Bar dataKey="expense" fill="#ef4444" name="Gider" />
                <Bar dataKey="net" fill="#3b82f6" name="Net" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* CONTRACT REPORTS */}
      {activeReportType === 'contract' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="text-sm text-slate-500 mb-2">Toplam Sözleşme</div>
              <div className="text-2xl font-bold text-slate-800">{contracts.length}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="text-sm text-slate-500 mb-2">Aktif Sözleşme</div>
              <div className="text-2xl font-bold text-green-600">
                {contracts.filter(c => c.status === 'active').length}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="text-sm text-slate-500 mb-2">Toplam Sözleşme Tutarı (KDV Hariç)</div>
              <div className="text-2xl font-bold text-slate-800">
                {formatCurrency(contracts.reduce((sum, c) => sum + c.amount, 0))}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                KDV Dahil: {formatCurrency(
                  contracts.reduce((sum, c) => {
                    const baseAmount = c.amount;
                    // KDV dahil ise tutar zaten toplam, hariç ise %20 KDV ekle (varsayılan)
                    return sum + (c.isVatIncluded ? baseAmount : baseAmount * 1.20);
                  }, 0)
                )}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="text-sm text-slate-500 mb-2">KDV Dahil Sözleşme</div>
              <div className="text-2xl font-bold text-blue-600">
                {contracts.filter(c => c.isVatIncluded).length}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {contracts.filter(c => !c.isVatIncluded).length} KDV hariç
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Sözleşme Durum Analizi</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={[
                    { name: 'Aktif', value: contracts.filter(c => c.status === 'active').length },
                    { name: 'Tamamlandı', value: contracts.filter(c => c.status === 'completed').length },
                    { name: 'Taslak', value: contracts.filter(c => c.status === 'draft').length },
                    { name: 'İptal', value: contracts.filter(c => c.status === 'cancelled').length }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[0, 1, 2, 3].map((index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ENTITY REPORTS */}
      {activeReportType === 'entity' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Cari Hesap Özeti</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-3 text-left font-medium">Cari Hesap</th>
                    <th className="p-3 text-right font-medium">Gelir</th>
                    <th className="p-3 text-right font-medium">Gider</th>
                    <th className="p-3 text-right font-medium">Net Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entitySummary.map((e: any) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-700">{e.name}</td>
                      <td className="p-3 text-right text-green-600">{formatCurrency(e.income)}</td>
                      <td className="p-3 text-right text-red-600">{formatCurrency(e.expense)}</td>
                      <td className={`p-3 text-right font-medium ${e.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {formatCurrency(e.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM REPORTS */}
      {activeReportType === 'custom' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-slate-800">Özel Rapor Oluştur</h3>
              <button
                onClick={() => {
                  const csv = exportCustomReportToCSV();
                  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = `ozel_rapor_${format(new Date(), 'yyyy-MM-dd')}.csv`;
                  link.click();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
              >
                <Download size={16} />
                Raporu İndir
              </button>
            </div>

            {/* Kolon Seçimi */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">Gösterilecek Kolonlar</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { key: 'date', label: 'Tarih' },
                  { key: 'project', label: 'Proje' },
                  { key: 'type', label: 'Tip' },
                  { key: 'category', label: 'Kategori' },
                  { key: 'amount', label: 'Tutar' },
                  { key: 'currency', label: 'Para Birimi' },
                  { key: 'exchangeRate', label: 'Kur' },
                  { key: 'amountTRY', label: 'TRY Tutarı' },
                  { key: 'vat', label: 'KDV' },
                  { key: 'totalAmount', label: 'Toplam Tutar' },
                  { key: 'description', label: 'Açıklama' },
                  { key: 'invoiceNumber', label: 'Fatura No' },
                  { key: 'bankAccount', label: 'Banka Hesabı' },
                  { key: 'bankCard', label: 'Banka Kartı' },
                  { key: 'entity', label: 'Cari Hesap' },
                  { key: 'company', label: 'Şirket' }
                ].map(col => (
                  <label key={col.key} className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedColumns.includes(col.key) || selectedColumns.length === 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedColumns([...selectedColumns, col.key]);
                        } else {
                          setSelectedColumns(selectedColumns.filter(c => c !== col.key));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded"
                    />
                    <span className="text-sm text-slate-700">{col.label}</span>
                  </label>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setSelectedColumns([
                    'date', 'project', 'type', 'category', 'amount', 'currency', 'amountTRY', 'description'
                  ])}
                  className="text-xs px-3 py-1 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                >
                  Varsayılan Seç
                </button>
                <button
                  onClick={() => setSelectedColumns([])}
                  className="text-xs px-3 py-1 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                >
                  Tümünü Temizle
                </button>
                <button
                  onClick={() => setSelectedColumns([
                    'date', 'project', 'type', 'category', 'amount', 'currency', 'exchangeRate', 
                    'amountTRY', 'vat', 'totalAmount', 'description', 'invoiceNumber', 'bankAccount', 
                    'bankCard', 'entity', 'company'
                  ])}
                  className="text-xs px-3 py-1 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                >
                  Tümünü Seç
                </button>
              </div>
            </div>

            {/* Özel Rapor Tablosu */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    {(selectedColumns.length === 0 ? ['date', 'project', 'type', 'category', 'amount', 'currency', 'amountTRY', 'description'] : selectedColumns).map(col => {
                      const colLabels: Record<string, string> = {
                        date: 'Tarih',
                        project: 'Proje',
                        type: 'Tip',
                        category: 'Kategori',
                        amount: 'Tutar',
                        currency: 'Para Birimi',
                        exchangeRate: 'Kur',
                        amountTRY: 'TRY Tutarı',
                        vat: 'KDV',
                        totalAmount: 'Toplam',
                        description: 'Açıklama',
                        invoiceNumber: 'Fatura No',
                        bankAccount: 'Banka Hesabı',
                        bankCard: 'Banka Kartı',
                        entity: 'Cari Hesap',
                        company: 'Şirket'
                      };
                      return (
                        <th key={col} className="p-3 text-left font-medium border border-slate-200">
                          {colLabels[col] || col}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.slice(0, 100).map(t => {
                    const project = projects.find(p => p.id === t.projectId);
                    const company = project ? companies.find(c => c.id === project.companyId) : null;
                    const totalTax = t.taxes ? t.taxes.reduce((sum, tax) => sum + (tax.amount * t.exchangeRate), 0) : 0;
                    const totalAmount = (t.amount * t.exchangeRate) + totalTax;
                    
                    const rowData: Record<string, any> = {
                      date: format(new Date(t.date), 'dd.MM.yyyy'),
                      project: project?.name || '-',
                      type: t.type === 'income' ? 'Gelir' : 'Gider',
                      category: t.category,
                      amount: formatCurrency(t.amount, t.currency),
                      currency: t.currency,
                      exchangeRate: t.exchangeRate.toFixed(4),
                      amountTRY: formatCurrency(t.amount * t.exchangeRate, 'TRY'),
                      vat: totalTax > 0 ? formatCurrency(totalTax, 'TRY') : '-',
                      totalAmount: formatCurrency(totalAmount, 'TRY'),
                      description: t.description,
                      invoiceNumber: t.invoiceNumber || '-',
                      bankAccount: t.bankAccount?.accountName || '-',
                      bankCard: t.bankCard?.cardName || '-',
                      entity: project?.customerId ? entities.find(e => e.id === project.customerId)?.name || '-' : '-',
                      company: company?.name || '-'
                    };

                    const cols = selectedColumns.length === 0 
                      ? ['date', 'project', 'type', 'category', 'amount', 'currency', 'amountTRY', 'description']
                      : selectedColumns;

                    return (
                      <tr key={t.id} className="hover:bg-slate-50">
                        {cols.map(col => (
                          <td key={col} className="p-3 text-slate-600 border border-slate-200">
                            {rowData[col] || '-'}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredData.length > 100 && (
              <div className="mt-4 text-sm text-slate-500 text-center">
                Toplam {filteredData.length} kayıt bulundu. İlk 100 kayıt gösteriliyor.
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
