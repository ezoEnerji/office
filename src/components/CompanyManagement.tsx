import React, { useState } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  MapPin, 
  Phone, 
  Globe, 
  Mail, 
  X 
} from 'lucide-react';
import { Company, Currency, Project } from '../types';
import { COMPANY_COLORS, MARKET_RATES } from '../data/constants';

interface CompanyManagementProps {
  companies: Company[];
  setCompanies: (companies: Company[]) => void;
  projects: Project[];
  onRefresh?: () => void;
}

import { apiService } from '../services/api';

export const CompanyManagement: React.FC<CompanyManagementProps> = ({
  companies,
  setCompanies,
  projects,
  onRefresh
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  
  const initialFormState: Omit<Company, 'id' | 'logoColor'> = {
    name: '',
    taxNumber: '',
    baseCurrency: 'TRY',
    address: '',
    phone: '',
    email: '',
    website: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const openModal = (company?: Company) => {
    if (company) {
      setEditingCompany(company);
      setFormData({
        name: company.name,
        taxNumber: company.taxNumber,
        baseCurrency: company.baseCurrency,
        address: company.address || '',
        phone: company.phone || '',
        email: company.email || '',
        website: company.website || ''
      });
    } else {
      setEditingCompany(null);
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.taxNumber) {
      alert("Şirket adı ve vergi numarası zorunludur.");
      return;
    }

    try {
      if (editingCompany) {
        // Update
        await apiService.updateCompany(editingCompany.id, formData);
      } else {
        // Create
        await apiService.createCompany({
          ...formData,
          logoColor: COMPANY_COLORS[Math.floor(Math.random() * COMPANY_COLORS.length)]
        });
      }
      setIsModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert(error.message || 'Kayıt sırasında bir hata oluştu');
    }
  };

  const handleDelete = async (id: string) => {
    const hasActiveProjects = projects.some(p => p.companyId === id);
    if (hasActiveProjects) {
      alert("Bu şirkete bağlı aktif projeler var. Önce projeleri silin veya pasife alın.");
      return;
    }
    
    if (confirm("Şirketi silmek istediğinize emin misiniz?")) {
      try {
        await apiService.deleteCompany(id);
        if (onRefresh) onRefresh();
      } catch (error: any) {
        alert(error.message || 'Silme sırasında bir hata oluştu');
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Şirket Yönetimi</h2>
        <button 
          onClick={() => openModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-sm"
        >
          <Plus size={18} /> Yeni Şirket Ekle
        </button>
      </div>

      {/* Company List Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {companies.map(company => (
          <div key={company.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg ${company.logoColor} text-white flex items-center justify-center font-bold text-xl shadow-sm`}>
                  {company.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-800">{company.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">{company.taxNumber}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span className="text-blue-600 font-semibold">{company.baseCurrency}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                 <button 
                  onClick={() => openModal(company)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="Düzenle"
                 >
                   <Edit size={18} />
                 </button>
                 <button 
                  onClick={() => handleDelete(company.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Sil"
                 >
                   <Trash2 size={18} />
                 </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4 border-t border-slate-100 pt-4">
              <div className="flex items-start gap-2 text-slate-600">
                <MapPin size={16} className="shrink-0 mt-0.5 text-slate-400" />
                <span className="line-clamp-2">{company.address || 'Adres girilmemiş'}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone size={16} className="shrink-0 text-slate-400" />
                  <span>{company.phone || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Globe size={16} className="shrink-0 text-slate-400" />
                  <a href={company.website ? `https://${company.website}` : '#'} target="_blank" rel="noreferrer" className="hover:text-blue-600 truncate">
                    {company.website || '-'}
                  </a>
                </div>
                 <div className="flex items-center gap-2 text-slate-600">
                  <Mail size={16} className="shrink-0 text-slate-400" />
                  <span className="truncate">{company.email || '-'}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-3 flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">
               <div>Aktif Proje: <strong className="text-slate-700">{projects.filter(p => p.companyId === company.id && p.status === 'active').length}</strong></div>
               <div>Toplam Proje: <strong className="text-slate-700">{projects.filter(p => p.companyId === company.id).length}</strong></div>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">
                {editingCompany ? 'Şirket Bilgilerini Düzenle' : 'Yeni Şirket Tanımla'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sol Kolon - Temel Bilgiler */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-700 border-b pb-2 mb-4">Kurumsal Kimlik</h4>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-500 mb-1 block">Şirket Ünvanı *</span>
                    <input 
                      type="text" 
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Örn: Alpha Holding A.Ş."
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-500 mb-1 block">Vergi Numarası *</span>
                    <input 
                      type="text" 
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="10 Haneli Vergi No"
                      value={formData.taxNumber}
                      onChange={e => setFormData({...formData, taxNumber: e.target.value})}
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-500 mb-1 block">Ana Para Birimi</span>
                    <select 
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      value={formData.baseCurrency}
                      onChange={e => setFormData({...formData, baseCurrency: e.target.value as Currency})}
                    >
                       {Object.keys(MARKET_RATES).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">Tüm konsolide raporlar bu para birimine çevrilecektir.</p>
                  </label>
                </div>

                {/* Sağ Kolon - İletişim Bilgileri */}
                <div className="space-y-4">
                   <h4 className="font-semibold text-slate-700 border-b pb-2 mb-4">İletişim Bilgileri</h4>
                   <label className="block">
                    <span className="text-xs font-semibold text-slate-500 mb-1 block">Telefon</span>
                    <input 
                      type="tel" 
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="+90 ..."
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </label>
                   <label className="block">
                    <span className="text-xs font-semibold text-slate-500 mb-1 block">E-Posta</span>
                    <input 
                      type="email" 
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="info@..."
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </label>
                   <label className="block">
                    <span className="text-xs font-semibold text-slate-500 mb-1 block">Web Sitesi</span>
                    <input 
                      type="text" 
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="www.example.com"
                      value={formData.website}
                      onChange={e => setFormData({...formData, website: e.target.value})}
                    />
                  </label>
                </div>
                
                {/* Alt Kısım - Adres (Tam Genişlik) */}
                <div className="col-span-1 md:col-span-2 space-y-4">
                   <label className="block">
                    <span className="text-xs font-semibold text-slate-500 mb-1 block">Adres</span>
                    <textarea 
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                      placeholder="Açık adres..."
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-3">
               <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition"
               >
                 İptal
               </button>
               <button 
                onClick={handleSave}
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-sm hover:shadow"
               >
                 {editingCompany ? 'Değişiklikleri Kaydet' : 'Şirketi Oluştur'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

