import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  Edit, 
  Trash2, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  X,
  UserCheck,
  Truck,
  HardHat,
  Users,
  Building2
} from 'lucide-react';
import { Entity, EntityType } from '../types';
import { ENTITY_TYPE_LABELS } from '../data/constants';

import { apiService } from '../services/api';

interface EntityManagementProps {
  entities: Entity[];
  setEntities: (entities: Entity[]) => void;
  onRefresh?: () => void;
}

export const EntityManagement: React.FC<EntityManagementProps> = ({
  entities,
  setEntities,
  onRefresh
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [filterType, setFilterType] = useState<EntityType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const initialFormState: Omit<Entity, 'id'> = {
    name: '',
    type: 'supplier',
    taxOffice: '',
    taxNumber: '',
    email: '',
    phone: '',
    address: '',
    iban: '',
    bankName: '',
    status: 'active'
  };

  const [formData, setFormData] = useState(initialFormState);

  const openModal = (entity?: Entity) => {
    if (entity) {
      setEditingEntity(entity);
      setFormData({
        name: entity.name,
        type: entity.type,
        taxOffice: entity.taxOffice || '',
        taxNumber: entity.taxNumber || '',
        email: entity.email || '',
        phone: entity.phone || '',
        address: entity.address || '',
        iban: entity.iban || '',
        bankName: entity.bankName || '',
        status: entity.status
      });
    } else {
      setEditingEntity(null);
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      alert("Cari hesap adı zorunludur.");
      return;
    }

    try {
      if (editingEntity) {
        await apiService.updateEntity(editingEntity.id, formData);
      } else {
        await apiService.createEntity(formData);
      }
      setIsModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert(error.message || 'Kayıt sırasında bir hata oluştu');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bu cari hesabı silmek istediğinize emin misiniz?")) {
      try {
        await apiService.deleteEntity(id);
        if (onRefresh) onRefresh();
      } catch (error: any) {
        alert(error.message || 'Silme sırasında bir hata oluştu');
      }
    }
  };

  const filteredEntities = entities.filter(e => {
    const matchesType = filterType === 'all' || e.type === filterType;
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          e.taxNumber?.includes(searchQuery) ||
                          e.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Cari Hesap Yönetimi</h2>
        <button 
          onClick={() => openModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-sm"
        >
          <Plus size={18} /> Yeni Cari Ekle
        </button>
      </div>

      {/* Filtre ve Arama Barı */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
           <button 
             onClick={() => setFilterType('all')}
             className={`px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${filterType === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
           >
             Tümü
           </button>
           {(Object.keys(ENTITY_TYPE_LABELS) as EntityType[]).map(type => (
             <button 
               key={type}
               onClick={() => setFilterType(type)}
               className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 whitespace-nowrap ${filterType === type ? ENTITY_TYPE_LABELS[type].color + ' ring-1 ring-offset-1' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
             >
               {ENTITY_TYPE_LABELS[type].label}
             </button>
           ))}
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Ara (İsim, VKN, Email)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Entity List */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filteredEntities.map(entity => {
          const TypeIcon = ENTITY_TYPE_LABELS[entity.type].icon;
          return (
            <div key={entity.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition group">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${ENTITY_TYPE_LABELS[entity.type].color.replace('text-', 'bg-opacity-20 ')}`}>
                     <TypeIcon size={20} className={ENTITY_TYPE_LABELS[entity.type].color.split(' ')[1]} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 leading-tight mb-1">{entity.name}</h3>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className={`px-2 py-0.5 rounded ${ENTITY_TYPE_LABELS[entity.type].color}`}>
                        {ENTITY_TYPE_LABELS[entity.type].label}
                      </span>
                      {entity.status === 'passive' && <span className="px-2 py-0.5 rounded bg-red-100 text-red-700">Pasif</span>}
                      {entity.taxNumber && (
                         <span className="flex items-center gap-1 text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                           <FileText size={10} /> {entity.taxOffice ? `${entity.taxOffice} / ` : ''}{entity.taxNumber}
                         </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => openModal(entity)} className="p-2 text-slate-400 hover:text-blue-600 rounded bg-slate-50 hover:bg-blue-50">
                     <Edit size={16} />
                   </button>
                   <button onClick={() => handleDelete(entity.id)} className="p-2 text-slate-400 hover:text-red-600 rounded bg-slate-50 hover:bg-red-50">
                     <Trash2 size={16} />
                   </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mt-4 pt-4 border-t border-slate-100">
                <div className="space-y-2">
                  {entity.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone size={14} className="text-slate-400" /> {entity.phone}
                    </div>
                  )}
                  {entity.email && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail size={14} className="text-slate-400" /> {entity.email}
                    </div>
                  )}
                  {entity.address && (
                    <div className="flex items-start gap-2 text-slate-600">
                      <MapPin size={14} className="text-slate-400 mt-1" /> <span className="line-clamp-1">{entity.address}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {entity.iban && (
                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                       <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                         <CreditCard size={12} /> {entity.bankName || 'Banka'}
                       </div>
                       <div className="font-mono text-xs text-slate-700 break-all">{entity.iban}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h3 className="text-xl font-bold text-slate-800">
                {editingEntity ? 'Cari Hesabı Düzenle' : 'Yeni Cari Hesap Oluştur'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sol: Temel Bilgiler */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-700 text-sm uppercase tracking-wider border-b pb-2 mb-4">Kimlik Bilgileri</h4>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Ünvan / Ad Soyad *</label>
                    <input 
                      type="text" 
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="Örn: ABC İnşaat Ltd. Şti."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Cari Tipi</label>
                      <select 
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value as EntityType})}
                      >
                        {(Object.keys(ENTITY_TYPE_LABELS) as EntityType[]).map(t => (
                          <option key={t} value={t}>{ENTITY_TYPE_LABELS[t].label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Durum</label>
                      <select 
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        value={formData.status}
                        onChange={e => setFormData({...formData, status: e.target.value as 'active' | 'passive'})}
                      >
                        <option value="active">Aktif</option>
                        <option value="passive">Pasif</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-semibold text-slate-500 mb-1">Vergi Dairesi</label>
                       <input 
                         type="text" 
                         className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                         value={formData.taxOffice}
                         onChange={e => setFormData({...formData, taxOffice: e.target.value})}
                       />
                    </div>
                    <div>
                       <label className="block text-xs font-semibold text-slate-500 mb-1">VKN / TCKN</label>
                       <input 
                         type="text" 
                         className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                         value={formData.taxNumber}
                         onChange={e => setFormData({...formData, taxNumber: e.target.value})}
                         maxLength={11}
                       />
                    </div>
                  </div>
                </div>

                {/* Sağ: İletişim ve Finans */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-700 text-sm uppercase tracking-wider border-b pb-2 mb-4">İletişim & Finans</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-xs font-semibold text-slate-500 mb-1">Telefon</label>
                       <input 
                         type="text" 
                         className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                         value={formData.phone}
                         onChange={e => setFormData({...formData, phone: e.target.value})}
                       />
                     </div>
                     <div>
                       <label className="block text-xs font-semibold text-slate-500 mb-1">E-Posta</label>
                       <input 
                         type="email" 
                         className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                         value={formData.email}
                         onChange={e => setFormData({...formData, email: e.target.value})}
                       />
                     </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Adres</label>
                    <textarea 
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                    />
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                     <label className="block text-xs font-semibold text-slate-500 mb-1">Banka Adı</label>
                     <input 
                       type="text" 
                       className="w-full p-2 mb-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                       value={formData.bankName}
                       onChange={e => setFormData({...formData, bankName: e.target.value})}
                       placeholder="Örn: Garanti BBVA"
                     />
                     <label className="block text-xs font-semibold text-slate-500 mb-1">IBAN</label>
                     <input 
                       type="text" 
                       className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                       value={formData.iban}
                       onChange={e => setFormData({...formData, iban: e.target.value})}
                       placeholder="TR..."
                     />
                  </div>
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
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
               >
                 {editingEntity ? 'Kaydet' : 'Oluştur'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

