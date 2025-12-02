import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Filter, 
  Download, 
  Search,
  Building2,
  Briefcase,
  FileText
} from 'lucide-react';
import { Transaction, Project, Company } from '../types';
import { formatCurrency } from '../utils/helpers';
import { MARKET_RATES } from '../data/constants';

interface FinancialManagementProps {
  transactions: Transaction[];
  projects: Project[];
  companies: Company[];
}

export const FinancialManagement: React.FC<FinancialManagementProps> = ({
  transactions,
  projects,
  companies
}) => {
  const [filterDate, setFilterDate] = useState('all'); // all, thisMonth, lastMonth, thisYear
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // --- Filtreleme Mantığı ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const project = projects.find(p => p.id === t.projectId);
      const companyId = project?.companyId;
      
      // Şirket Filtresi
      if (filterCompany !== 'all' && companyId !== filterCompany) return false;

      // Proje Filtresi
      if (filterProject !== 'all' && t.projectId !== filterProject) return false;

      // Arama
      if (searchQuery && !t.description.toLowerCase().includes(searchQuery.toLowerCase()) && !t.category.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      // Tarih Filtresi
      const transDate = new Date(t.date);
      const now = new Date();
      
      if (filterDate === 'thisMonth') {
        return transDate.getMonth() === now.getMonth() && transDate.getFullYear() === now.getFullYear();
      }
      if (filterDate === 'lastMonth') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return transDate.getMonth() === lastMonth.getMonth() && transDate.getFullYear() === lastMonth.getFullYear();
      }
      if (filterDate === 'thisYear') {
        return transDate.getFullYear() === now.getFullYear();
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filterCompany, filterProject, filterDate, searchQuery, projects]);

  // --- Hesaplamalar ---
  // Tüm tutarları TRY'ye çevirerek konsolide et (Basitlik için TRY baz alıyoruz, gerçekte çoklu döviz desteği karmaşıktır)
  // Not: transactions içinde exchangeRate var, bu kur işlem anındaki kurdur.
  // Ancak burada gösterim için her şeyi TRY'ye çevirmemiz gerekebilir veya sadece seçili para birimini gösterebiliriz.
  // Şimdilik TRY bazlı toplam gösterelim (exchangeRate * amount).
  
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + (t.amount * (t.currency === 'TRY' ? 1 : t.exchangeRate)), 0);

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + (t.amount * (t.currency === 'TRY' ? 1 : t.exchangeRate)), 0);

  const netBalance = totalIncome - totalExpense;

  // KDV Analizi
  const vatAnalysis = useMemo(() => {
    let totalVatIncluded = 0;
    let totalVatExcluded = 0;
    let totalVatAmount = 0;
    let incomeVat = 0;
    let expenseVat = 0;

    filteredTransactions.forEach(t => {
      const amountTRY = t.amount * (t.currency === 'TRY' ? 1 : t.exchangeRate);
      const taxes = t.taxes || [];
      const totalTaxAmount = taxes.reduce((sum, tax) => sum + (tax.amount * (t.currency === 'TRY' ? 1 : t.exchangeRate)), 0);
      
      if (t.isVatIncluded) {
        totalVatIncluded += amountTRY;
      } else {
        totalVatExcluded += amountTRY;
      }
      
      totalVatAmount += totalTaxAmount;
      
      if (t.type === 'income') {
        incomeVat += totalTaxAmount;
      } else {
        expenseVat += totalTaxAmount;
      }
    });

    return {
      totalVatIncluded,
      totalVatExcluded,
      totalVatAmount,
      incomeVat,
      expenseVat,
      netVat: incomeVat - expenseVat // Ödenecek/İade edilecek KDV
    };
  }, [filteredTransactions]);

  // Kategori Bazlı Dağılım
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === 'expense').forEach(t => {
      const amountTRY = t.amount * (t.currency === 'TRY' ? 1 : t.exchangeRate);
      stats[t.category] = (stats[t.category] || 0) + amountTRY;
    });
    return Object.entries(stats).sort(([, a], [, b]) => b - a); // En yüksek harcama ilk sırada
  }, [filteredTransactions]);

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Finansal Yönetim</h2>
          <p className="text-slate-500">Nakit akışı, gelir-gider takibi ve finansal analizler.</p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition shadow-sm">
          <Download size={18} /> Excel Raporu İndir
        </button>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
              <TrendingUp size={24} />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">+%12 artış</span>
          </div>
          <p className="text-slate-500 text-sm mb-1">Toplam Gelir (KDV Hariç)</p>
          <h3 className="text-3xl font-bold text-slate-800">{formatCurrency(totalIncome, 'TRY')}</h3>
          {vatAnalysis.incomeVat > 0 && (
            <p className="text-xs text-slate-400 mt-1">+ {formatCurrency(vatAnalysis.incomeVat, 'TRY')} KDV</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
              <TrendingDown size={24} />
            </div>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">Geçen ay ile aynı</span>
          </div>
          <p className="text-slate-500 text-sm mb-1">Toplam Gider (KDV Hariç)</p>
          <h3 className="text-3xl font-bold text-slate-800">{formatCurrency(totalExpense, 'TRY')}</h3>
          {vatAnalysis.expenseVat > 0 && (
            <p className="text-xs text-slate-400 mt-1">+ {formatCurrency(vatAnalysis.expenseVat, 'TRY')} KDV</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl ${netBalance >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
              <DollarSign size={24} />
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded ${netBalance >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
              {netBalance >= 0 ? 'Pozitif Akış' : 'Negatif Akış'}
            </span>
          </div>
          <p className="text-slate-500 text-sm mb-1">Net Nakit Durumu</p>
          <h3 className={`text-3xl font-bold ${netBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
            {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance, 'TRY')}
          </h3>
        </div>
      </div>

      {/* KDV Analiz Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-xs mb-1">KDV Dahil İşlemler</p>
          <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(vatAnalysis.totalVatIncluded, 'TRY')}</h3>
          <p className="text-xs text-slate-400 mt-1">
            {filteredTransactions.filter(t => t.isVatIncluded).length} işlem
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-xs mb-1">KDV Hariç İşlemler</p>
          <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(vatAnalysis.totalVatExcluded, 'TRY')}</h3>
          <p className="text-xs text-slate-400 mt-1">
            {filteredTransactions.filter(t => !t.isVatIncluded).length} işlem
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-xs mb-1">Toplam KDV</p>
          <h3 className="text-2xl font-bold text-orange-600">{formatCurrency(vatAnalysis.totalVatAmount, 'TRY')}</h3>
          <div className="flex gap-2 mt-1 text-xs">
            <span className="text-green-600">Gelir: {formatCurrency(vatAnalysis.incomeVat, 'TRY')}</span>
            <span className="text-red-600">Gider: {formatCurrency(vatAnalysis.expenseVat, 'TRY')}</span>
          </div>
        </div>

        <div className={`p-5 rounded-xl border shadow-sm ${vatAnalysis.netVat >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-slate-500 text-xs mb-1">Net KDV Durumu</p>
          <h3 className={`text-2xl font-bold ${vatAnalysis.netVat >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {vatAnalysis.netVat >= 0 ? '+' : ''}{formatCurrency(vatAnalysis.netVat, 'TRY')}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {vatAnalysis.netVat >= 0 ? 'Ödenecek' : 'İade Edilecek'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sol: İşlem Listesi ve Filtreler */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filtre Barı */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="İşlem ara..." 
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              <select 
                className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm outline-none focus:border-blue-500"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              >
                <option value="all">Tüm Zamanlar</option>
                <option value="thisMonth">Bu Ay</option>
                <option value="lastMonth">Geçen Ay</option>
                <option value="thisYear">Bu Yıl</option>
              </select>
              <select 
                className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm outline-none focus:border-blue-500"
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
              >
                <option value="all">Tüm Şirketler</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select 
                className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm outline-none focus:border-blue-500"
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
              >
                <option value="all">Tüm Projeler</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {/* Tablo */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="p-4">Tarih</th>
                    <th className="p-4">Açıklama</th>
                    <th className="p-4">Proje / Şirket</th>
                    <th className="p-4">Kategori</th>
                    <th className="p-4 text-right">Tutar</th>
                    <th className="p-4 text-right">TRY Karşılığı</th>
                    <th className="p-4 text-center">Belge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.length > 0 ? filteredTransactions.map(t => {
                    const project = projects.find(p => p.id === t.projectId);
                    const company = companies.find(c => c.id === project?.companyId);
                    const amountTRY = t.amount * (t.currency === 'TRY' ? 1 : t.exchangeRate);

                    return (
                      <tr key={t.id} className="hover:bg-slate-50 transition group">
                        <td className="p-4 text-slate-500 whitespace-nowrap">{t.date}</td>
                        <td className="p-4 font-medium text-slate-800">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${t.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            {t.description}
                          </div>
                        </td>
                        <td className="p-4 text-slate-600">
                          <div className="flex flex-col">
                            <span className="font-medium text-xs">{project?.name || '-'}</span>
                            <span className="text-[10px] text-slate-400">{company?.name}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">{t.category}</span>
                        </td>
                        <td className="p-4 text-right font-mono text-slate-600">
                          {formatCurrency(t.amount, t.currency)}
                        </td>
                        <td className={`p-4 text-right font-mono font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {t.type === 'income' ? '+' : '-'}{formatCurrency(amountTRY, 'TRY')}
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
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400">
                        Kayıt bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sağ: Analizler */}
        <div className="space-y-6">
          {/* Kategori Dağılımı */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4">Gider Dağılımı (Kategori)</h3>
            <div className="space-y-4">
              {categoryStats.length > 0 ? categoryStats.slice(0, 6).map(([cat, amount], index) => {
                const percent = (amount / totalExpense) * 100;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600 font-medium">{cat}</span>
                      <span className="text-slate-500">%{percent.toFixed(1)}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full" 
                        style={{ width: `${percent}%`, opacity: 1 - (index * 0.1) }}
                      ></div>
                    </div>
                    <div className="text-right text-xs text-slate-400 mt-0.5">{formatCurrency(amount, 'TRY')}</div>
                  </div>
                );
              }) : (
                <div className="text-slate-400 text-sm text-center py-4">Veri yok</div>
              )}
            </div>
          </div>

          {/* Bilgi Kartı */}
          <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
            <h3 className="font-bold text-indigo-800 mb-2 flex items-center gap-2">
              <Building2 size={18} /> Holding Özeti
            </h3>
            <ul className="space-y-2 text-sm text-indigo-700">
              <li className="flex justify-between">
                <span>Aktif Şirket:</span>
                <span className="font-bold">{companies.length}</span>
              </li>
              <li className="flex justify-between">
                <span>Aktif Proje:</span>
                <span className="font-bold">{projects.filter(p => p.status === 'active').length}</span>
              </li>
              <li className="flex justify-between pt-2 border-t border-indigo-200">
                <span>Ortalama Proje Bütçesi:</span>
                <span className="font-bold">
                  {projects.length > 0 
                    ? formatCurrency(projects.reduce((acc, p) => acc + (p.budget * (p.agreementCurrency === 'TRY' ? 1 : MARKET_RATES[p.agreementCurrency])), 0) / projects.length, 'TRY')
                    : '0 ₺'
                  }
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

