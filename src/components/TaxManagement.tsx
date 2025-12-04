import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Edit, Trash2, X, Save, Percent, DollarSign, Calculator, Info } from 'lucide-react';
import { Tax } from '../types';
import { apiService } from '../services/api';

interface TaxManagementProps {
  taxes: Tax[];
  setTaxes: (taxes: Tax[]) => void;
  onRefresh?: () => void;
}

export const TaxManagement: React.FC<TaxManagementProps> = ({
  taxes,
  setTaxes,
  onRefresh
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<Omit<Tax, 'id'>>({
    name: '',
    code: '',
    rate: 0,
    calculationType: 'percentage',
    baseType: 'amount',
    description: '',
    isActive: true,
    order: 0
  });

  // Load taxes on mount
  useEffect(() => {
    loadTaxes();
  }, []);

  const loadTaxes = async () => {
    try {
      const data = await apiService.getTaxes();
      setTaxes(data);
    } catch (error: any) {
      console.error('Vergiler yüklenirken hata:', error);
    }
  };

  const openModal = (tax?: Tax) => {
    if (tax) {
      setEditingTax(tax);
      setFormData({
        name: tax.name,
        code: tax.code || '',
        rate: tax.rate,
        calculationType: tax.calculationType,
        baseType: tax.baseType,
        description: tax.description || '',
        isActive: tax.isActive,
        order: tax.order
      });
    } else {
      setEditingTax(null);
      setFormData({
        name: '',
        code: '',
        rate: 0,
        calculationType: 'percentage',
        baseType: 'amount',
        description: '',
        isActive: true,
        order: taxes.length
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || formData.rate === undefined) {
      alert('Vergi adı ve oranı zorunludur');
      return;
    }

    try {
      if (editingTax) {
        await apiService.updateTax(editingTax.id, formData);
      } else {
        await apiService.createTax(formData);
      }
      setIsModalOpen(false);
      setEditingTax(null);
      await loadTaxes();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert(error.message || 'Vergi kaydedilirken bir hata oluştu');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bu vergiyi silmek istediğinize emin misiniz?')) {
      try {
        await apiService.deleteTax(id);
        await loadTaxes();
        if (onRefresh) onRefresh();
      } catch (error: any) {
        alert(error.message || 'Vergi silinirken bir hata oluştu');
      }
    }
  };

  const filteredTaxes = taxes.filter(tax =>
    tax.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tax.code && tax.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getBaseTypeLabel = (baseType: string) => {
    switch (baseType) {
      case 'amount': return 'Tutar Üzerinden';
      case 'vat': return 'KDV Üzerinden';
      case 'total': return 'Toplam Tutar Üzerinden';
      default: return baseType;
    }
  };

  const getCalculationTypeLabel = (type: string) => {
    switch (type) {
      case 'percentage': return '%';
      case 'fixed': return 'Sabit';
      default: return type;
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Vergi Yönetimi</h1>
          <p className="text-sm text-slate-500 mt-1">Kullanılacak tüm vergileri yönetin</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition text-sm font-medium"
        >
          <Plus size={16} /> Yeni Vergi
        </button>
      </div>

      {/* Search */}
      <div className="p-5 bg-white border-b border-slate-200">
        <input
          type="text"
          placeholder="Vergi ara..."
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Tax List */}
      <div className="flex-1 overflow-y-auto p-5">
        {filteredTaxes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <Receipt size={64} className="mb-4 opacity-20" />
            <p>Vergi bulunamadı.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTaxes.map(tax => (
              <div
                key={tax.id}
                className={`bg-white rounded-xl border-2 p-5 transition ${
                  tax.isActive
                    ? 'border-slate-200 hover:border-blue-300 hover:shadow-md'
                    : 'border-slate-100 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-slate-800">{tax.name}</h3>
                      {tax.code && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                          {tax.code}
                        </span>
                      )}
                      {!tax.isActive && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded">
                          Pasif
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                      <div className="flex items-center gap-1">
                        <Percent size={14} />
                        <span className="font-medium">{tax.rate}</span>
                        <span className="text-slate-400">
                          {tax.calculationType === 'percentage' ? '%' : 'TL'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calculator size={14} />
                        <span>{getBaseTypeLabel(tax.baseType)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Info size={14} />
                        <span>{getCalculationTypeLabel(tax.calculationType)}</span>
                      </div>
                    </div>
                    {tax.description && (
                      <p className="text-sm text-slate-500">{tax.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => openModal(tax)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Düzenle"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(tax.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Sil"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-slate-800">
                {editingTax ? 'Vergi Düzenle' : 'Yeni Vergi'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Vergi Adı <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Örn: KDV, Stopaj, Tevkifat"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Vergi Kodu
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Örn: KDV, STOPAJ"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Oran/Tutar <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                    placeholder="Örn: 20 (KDV için %20)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Hesaplama Tipi
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.calculationType}
                    onChange={(e) => setFormData({ ...formData, calculationType: e.target.value as 'percentage' | 'fixed' })}
                  >
                    <option value="percentage">Yüzde (%)</option>
                    <option value="fixed">Sabit Tutar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Hesaplama Tabanı
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.baseType}
                  onChange={(e) => setFormData({ ...formData, baseType: e.target.value as 'amount' | 'vat' | 'total' })}
                >
                  <option value="amount">Tutar Üzerinden (Ana tutar)</option>
                  <option value="vat">KDV Üzerinden (KDV tutarından hesaplanır)</option>
                  <option value="total">Toplam Tutar Üzerinden (Vergi dahil toplam)</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  {formData.baseType === 'amount' && 'Örn: Stopaj - Ana tutar üzerinden %20'}
                  {formData.baseType === 'vat' && 'Örn: Tevkifat - KDV tutarı üzerinden %50'}
                  {formData.baseType === 'total' && 'Örn: Özel vergi - Toplam tutar üzerinden %5'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Açıklama
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Vergi hakkında açıklama..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Sıralama
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <span className="text-sm font-medium text-slate-700">Aktif</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-white border border-slate-300 rounded-lg transition"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Save size={16} /> Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

