import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  FileText, 
  Briefcase, 
  Building2, 
  Calendar, 
  CreditCard,
  X,
  Download,
  ChevronRight,
  Edit,
  Trash2,
  Upload // Added
} from 'lucide-react';
import { Contract, ContractType, ContractStatus, Project, Entity, Company, Transaction, Currency } from '../types';
import { CONTRACT_STATUS_LABELS, CONTRACT_TYPE_LABELS, MARKET_RATES } from '../data/constants';
import { formatCurrency } from '../utils/helpers';
import { apiService } from '../services/api';

interface ContractManagementProps {
  contracts: Contract[];
  setContracts: (contracts: Contract[]) => void;
  projects: Project[];
  entities: Entity[];
  companies: Company[];
  transactions: Transaction[];
  onRefresh?: () => void;
}

export const ContractManagement: React.FC<ContractManagementProps> = ({
  contracts,
  setContracts,
  projects,
  entities,
  companies,
  transactions,
  onRefresh
}) => {
  const [selectedContract, setSelectedProject] = useState<Contract | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ContractType | 'all'>('all');

  // Initial Form State
  const initialForm: Omit<Contract, 'id'> = {
    code: '',
    name: '',
    type: 'subcontractor_agreement',
    status: 'draft',
    projectId: projects[0]?.id || '',
    companyId: companies[0]?.id || '',
    entityId: entities[0]?.id || '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    amount: 0,
    currency: 'TRY',
    paymentTerms: '',
    description: '',
    attachments: [],
    isVatIncluded: false // Varsayılan: KDV hariç (kurumsal ihtiyaç)
  };

  const [formData, setFormData] = useState(initialForm);

  // --- CRUD Operations ---
  const openModal = (contract?: Contract) => {
    if (contract) {
      setEditingContract(contract);
      setFormData(contract);
    } else {
      setEditingContract(null);
      setFormData({
        ...initialForm,
        code: `CNT-${new Date().getFullYear()}-${String(contracts.length + 1).padStart(3, '0')}`
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.projectId || !formData.entityId) {
      alert("Sözleşme adı, proje ve cari seçimi zorunludur.");
      return;
    }

    try {
      if (editingContract) {
        await apiService.updateContract(editingContract.id, formData);
      } else {
        await apiService.createContract(formData);
      }
      setIsModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert(error.message || 'Kayıt sırasında bir hata oluştu');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Sözleşmeyi silmek istediğinize emin misiniz?")) {
      try {
        await apiService.deleteContract(id);
        if (onRefresh) onRefresh();
        setSelectedProject(null);
      } catch (error: any) {
        alert(error.message || 'Silme sırasında bir hata oluştu');
      }
    }
  };

  // --- Filter Logic ---
  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            c.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || c.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [contracts, searchQuery, filterType]);

  // --- Detail View Data ---
  const contractTransactions = useMemo(() => {
    if (!selectedContract) return [];
    return transactions.filter(t => t.contractId === selectedContract.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedContract, transactions]);

  const totalPaid = contractTransactions.reduce((acc, t) => acc + (t.amount * (t.currency === selectedContract?.currency ? 1 : t.exchangeRate)), 0);

  return (
    <div className="flex h-full bg-slate-50">
      {/* SOL PANEL: LİSTE */}
      <div className={`${selectedContract ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-1/3 border-r border-slate-200 bg-white`}>
        <div className="p-4 border-b border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800">Sözleşmeler</h2>
            <button onClick={() => openModal()} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              <Plus size={20} />
            </button>
          </div>
          
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Sözleşme Ara..." 
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <select 
              className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
              value={filterType}
              onChange={e => setFilterType(e.target.value as any)}
            >
              <option value="all">Tüm Tipler</option>
              {Object.entries(CONTRACT_TYPE_LABELS).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredContracts.map(contract => {
            const entity = entities.find(e => e.id === contract.entityId);
            const project = projects.find(p => p.id === contract.projectId);
            
            return (
              <div 
                key={contract.id} 
                onClick={() => setSelectedProject(contract)}
                className={`p-4 rounded-xl border cursor-pointer transition group hover:shadow-md ${selectedContract?.id === contract.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{contract.code}</span>
                    <h3 className="font-semibold text-slate-800 mt-1 group-hover:text-blue-700">{contract.name}</h3>
                  </div>
                  <div className={`p-1.5 rounded-lg ${CONTRACT_STATUS_LABELS[contract.status].color.replace('text-', 'bg-opacity-20 ')}`}>
                    {React.createElement(CONTRACT_STATUS_LABELS[contract.status].icon, { size: 16, className: CONTRACT_STATUS_LABELS[contract.status].color.split(' ')[1] })}
                  </div>
                </div>
                
                <div className="space-y-1 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Briefcase size={12} /> {project?.name}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Building2 size={12} /> {entity?.name}
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                    <span className="flex items-center gap-1"><Calendar size={12}/> {contract.endDate || 'Süresiz'}</span>
                    <span className="font-bold text-slate-700">{formatCurrency(contract.amount, contract.currency)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SAĞ PANEL: DETAY */}
      <div className={`${!selectedContract ? 'hidden lg:flex items-center justify-center' : 'flex'} flex-col flex-1 bg-slate-50 overflow-hidden`}>
        {selectedContract ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-6 flex justify-between items-start shadow-sm z-10">
              <div>
                <button onClick={() => setSelectedProject(null)} className="lg:hidden mb-2 flex items-center gap-1 text-slate-500 text-sm"><ChevronRight className="rotate-180" size={16}/> Geri</button>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-slate-800">{selectedContract.name}</h1>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border flex items-center gap-1 ${CONTRACT_STATUS_LABELS[selectedContract.status].color}`}>
                    {CONTRACT_STATUS_LABELS[selectedContract.status].label}
                  </span>
                </div>
                <p className="text-slate-500 text-sm flex items-center gap-2">
                  <span className="font-mono bg-slate-100 px-1 rounded text-xs">{selectedContract.code}</span>
                  • {CONTRACT_TYPE_LABELS[selectedContract.type].label}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openModal(selectedContract)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition border border-slate-200 bg-white">
                  <Edit size={18} />
                </button>
                <button onClick={() => handleDelete(selectedContract.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition border border-slate-200 bg-white">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Sol: Bilgiler */}
                <div className="xl:col-span-2 space-y-6">
                  {/* Özet Kartı */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <FileText size={20} className="text-slate-400" /> Sözleşme Detayları
                    </h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                      <div>
                        <span className="block text-slate-400 text-xs mb-1">İlgili Proje</span>
                        <div className="font-medium text-slate-700">{projects.find(p => p.id === selectedContract.projectId)?.name}</div>
                      </div>
                      <div>
                        <span className="block text-slate-400 text-xs mb-1">Taraf (Cari)</span>
                        <div className="font-medium text-slate-700">{entities.find(e => e.id === selectedContract.entityId)?.name}</div>
                      </div>
                      <div>
                        <span className="block text-slate-400 text-xs mb-1">Başlangıç Tarihi</span>
                        <div className="font-medium text-slate-700">{selectedContract.startDate}</div>
                      </div>
                      <div>
                        <span className="block text-slate-400 text-xs mb-1">Bitiş Tarihi</span>
                        <div className="font-medium text-slate-700">{selectedContract.endDate || 'Süresiz'}</div>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-slate-400 text-xs mb-1">Açıklama</span>
                        <p className="text-slate-600 leading-relaxed">{selectedContract.description || '-'}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-slate-400 text-xs mb-1">Ödeme Koşulları</span>
                        <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">{selectedContract.paymentTerms || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Finansal Hareketler */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <CreditCard size={20} className="text-slate-400" /> Bağlı Finansal İşlemler
                      </h3>
                      <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-1 rounded">Toplam: {formatCurrency(totalPaid, selectedContract.currency)}</span>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                          <tr>
                            <th className="p-3 rounded-l-lg">Tarih</th>
                            <th className="p-3">Açıklama</th>
                            <th className="p-3 text-right rounded-r-lg">Tutar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {contractTransactions.length > 0 ? contractTransactions.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50">
                              <td className="p-3 text-slate-500 whitespace-nowrap">{t.date}</td>
                              <td className="p-3 font-medium text-slate-700">{t.description}</td>
                              <td className="p-3 text-right font-mono text-slate-600">{formatCurrency(t.amount, t.currency)}</td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan={3} className="p-8 text-center text-slate-400 italic">Henüz bir işlem kaydı yok.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Sağ: Dosyalar ve Durum */}
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4">
                      Sözleşme Tutarı {selectedContract.isVatIncluded ? '(KDV Dahil)' : '(KDV Hariç)'}
                    </h3>
                    <div className="text-3xl font-bold text-slate-800 mb-1">{formatCurrency(selectedContract.amount, selectedContract.currency)}</div>
                    {selectedContract.isVatIncluded && (
                      <div className="text-xs text-slate-500 mb-2">KDV dahil tutar</div>
                    )}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (totalPaid / selectedContract.amount) * 100)}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Ödenen: {formatCurrency(totalPaid, selectedContract.currency)}</span>
                      <span>Kalan: {formatCurrency(selectedContract.amount - totalPaid, selectedContract.currency)}</span>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Download size={20} className="text-slate-400" /> Ekli Dosyalar
                    </h3>
                    <div className="space-y-2">
                      {selectedContract.attachments.length > 0 ? selectedContract.attachments.map((file, i) => (
                        <a key={i} href={file} target="_blank" className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition group">
                          <div className="p-2 bg-red-50 text-red-600 rounded">
                            <FileText size={16} />
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <div className="text-sm font-medium text-slate-700 truncate">Sozlesme_Ek_{i+1}.pdf</div>
                            <div className="text-[10px] text-slate-400">PDF Belgesi</div>
                          </div>
                          <Download size={16} className="text-slate-300 group-hover:text-slate-600" />
                        </a>
                      )) : (
                        <div className="text-center text-sm text-slate-400 py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                          Dosya yüklenmemiş.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-400">
            <Briefcase size={64} className="mx-auto mb-4 text-slate-200" />
            <h3 className="text-lg font-medium text-slate-600">Bir Sözleşme Seçin</h3>
            <p>Detayları görüntülemek için listeden bir sözleşme seçin veya yeni oluşturun.</p>
          </div>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">{editingContract ? 'Sözleşmeyi Düzenle' : 'Yeni Sözleşme'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">Sözleşme Kodu</span>
                  <input type="text" className="w-full p-2 border rounded-lg bg-slate-50 font-mono" value={formData.code} readOnly />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">Durum</span>
                  <select 
                    className="w-full p-2 border rounded-lg bg-white"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value as ContractStatus})}
                  >
                    {Object.entries(CONTRACT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Sözleşme Adı *</span>
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-lg" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Örn: Merkez Ofis İnşaat Sözleşmesi"
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">Proje *</span>
                  <select 
                    className="w-full p-2 border rounded-lg bg-white"
                    value={formData.projectId}
                    onChange={e => setFormData({...formData, projectId: e.target.value})}
                  >
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">Taraf (Cari) *</span>
                  <select 
                    className="w-full p-2 border rounded-lg bg-white"
                    value={formData.entityId}
                    onChange={e => setFormData({...formData, entityId: e.target.value})}
                  >
                    {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">Başlangıç Tarihi</span>
                  <input type="date" className="w-full p-2 border rounded-lg" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">Bitiş Tarihi</span>
                  <input type="date" className="w-full p-2 border rounded-lg" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">Para Birimi</span>
                  <select 
                    className="w-full p-2 border rounded-lg bg-white"
                    value={formData.currency}
                    onChange={e => setFormData({...formData, currency: e.target.value as Currency})}
                  >
                    {Object.keys(MARKET_RATES).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">
                    Sözleşme Bedeli {formData.isVatIncluded ? '(KDV Dahil)' : '(KDV Hariç)'}
                  </span>
                  <input 
                    type="number" 
                    className="w-full p-2 border rounded-lg font-mono" 
                    value={formData.amount} 
                    onChange={e => setFormData({...formData, amount: Number(e.target.value)})} 
                  />
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isVatIncluded || false}
                    onChange={(e) => setFormData({ ...formData, isVatIncluded: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Tutar KDV dahil</span>
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Ödeme Koşulları</span>
                <textarea 
                  className="w-full p-2 border rounded-lg h-20 resize-none" 
                  value={formData.paymentTerms} 
                  onChange={e => setFormData({...formData, paymentTerms: e.target.value})}
                  placeholder="Örn: %30 Peşin, %70 Teslimde..."
                />
              </label>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-500">Sözleşme Dosyası</label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition cursor-pointer relative">
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        const fakeUrl = URL.createObjectURL(file);
                        setFormData({
                          ...formData, 
                          attachments: [...formData.attachments, fakeUrl]
                        });
                      }
                    }}
                  />
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-2">
                    <Upload size={20} />
                  </div>
                  <p className="text-xs font-medium text-slate-700">Dosya Seç veya Sürükle</p>
                  <p className="text-[10px] text-slate-400 mt-1">PDF (Maks 10MB)</p>
                </div>

                {formData.attachments.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {formData.attachments.map((file, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-red-500" />
                          <span className="font-medium text-slate-600">Sözleşme_Ek_{i+1}.pdf</span>
                        </div>
                        <button 
                          onClick={() => setFormData({...formData, attachments: formData.attachments.filter((_, idx) => idx !== i)})}
                          className="text-slate-400 hover:text-red-500 transition"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition">İptal</button>
              <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-sm">{editingContract ? 'Güncelle' : 'Oluştur'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

