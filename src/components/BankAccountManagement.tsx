import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Building2,
  CreditCard,
  Wallet,
  MapPin,
  X,
  ChevronDown,
  ChevronRight,
  Search
} from 'lucide-react';
import { Company, BankBranch, BankAccount, BankCard, Currency } from '../types';
import { apiService } from '../services/api';
import { formatCurrency } from '../utils/helpers';

interface BankAccountManagementProps {
  companies: Company[];
  hasPermission: (perm: string) => boolean;
  onRefresh?: () => void;
}

type TabType = 'branches' | 'accounts' | 'cards';

export const BankAccountManagement: React.FC<BankAccountManagementProps> = ({
  companies,
  hasPermission,
  onRefresh
}) => {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('branches');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data states
  const [branches, setBranches] = useState<BankBranch[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [cards, setCards] = useState<BankCard[]>([]);
  
  // Modal states
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  
  const [editingBranch, setEditingBranch] = useState<BankBranch | null>(null);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [editingCard, setEditingCard] = useState<BankCard | null>(null);
  
  // Form states
  const [branchForm, setBranchForm] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    city: '',
    district: '',
    isActive: true
  });
  
  const [accountForm, setAccountForm] = useState({
    accountName: '',
    accountNumber: '',
    iban: '',
    currency: 'TRY' as Currency,
    accountType: 'checking' as 'checking' | 'savings' | 'deposit' | 'foreign',
    bankName: '',
    branchId: '',
    balance: 0,
    isActive: true,
    description: ''
  });
  
  const [cardForm, setCardForm] = useState({
    cardName: '',
    cardNumber: '',
    cardType: 'credit' as 'credit' | 'debit' | 'prepaid',
    bankName: '',
    accountId: '',
    expiryDate: '',
    limit: 0,
    isActive: true,
    description: ''
  });

  // Load data when company changes
  useEffect(() => {
    if (selectedCompany) {
      loadData();
    } else {
      setBranches([]);
      setAccounts([]);
      setCards([]);
    }
  }, [selectedCompany, activeTab]);

  const loadData = async () => {
    if (!selectedCompany) return;
    
    try {
      if (activeTab === 'branches') {
        const data = await apiService.getBankBranches(selectedCompany.id);
        setBranches(data);
      } else if (activeTab === 'accounts') {
        const data = await apiService.getBankAccounts(selectedCompany.id);
        setAccounts(data);
      } else if (activeTab === 'cards') {
        const data = await apiService.getBankCards(selectedCompany.id);
        setCards(data);
      }
    } catch (error: any) {
      alert('Veri yüklenirken hata oluştu: ' + error.message);
    }
  };

  // Branch handlers
  const openBranchModal = (branch?: BankBranch) => {
    if (branch) {
      setEditingBranch(branch);
      setBranchForm({
        name: branch.name,
        code: branch.code || '',
        address: branch.address || '',
        phone: branch.phone || '',
        email: branch.email || '',
        city: branch.city || '',
        district: branch.district || '',
        isActive: branch.isActive
      });
    } else {
      setEditingBranch(null);
      setBranchForm({
        name: '',
        code: '',
        address: '',
        phone: '',
        email: '',
        city: '',
        district: '',
        isActive: true
      });
    }
    setIsBranchModalOpen(true);
  };

  const handleSaveBranch = async () => {
    if (!selectedCompany || !branchForm.name) {
      alert('Şube adı zorunludur.');
      return;
    }

    try {
      const data = { ...branchForm, companyId: selectedCompany.id };
      if (editingBranch) {
        await apiService.updateBankBranch(editingBranch.id, data);
      } else {
        await apiService.createBankBranch(data);
      }
      setIsBranchModalOpen(false);
      loadData();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert('Kayıt sırasında hata oluştu: ' + error.message);
    }
  };

  const handleDeleteBranch = async (id: string) => {
    if (!confirm('Bu şubeyi silmek istediğinizden emin misiniz?')) return;
    try {
      await apiService.deleteBankBranch(id);
      loadData();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert('Silme işlemi sırasında hata oluştu: ' + error.message);
    }
  };

  // Account handlers
  const openAccountModal = (account?: BankAccount) => {
    if (account) {
      setEditingAccount(account);
      setAccountForm({
        accountName: account.accountName,
        accountNumber: account.accountNumber,
        iban: account.iban || '',
        currency: account.currency,
        accountType: account.accountType,
        bankName: account.bankName,
        branchId: account.branchId || '',
        balance: account.balance,
        isActive: account.isActive,
        description: account.description || ''
      });
    } else {
      setEditingAccount(null);
      setAccountForm({
        accountName: '',
        accountNumber: '',
        iban: '',
        currency: 'TRY',
        accountType: 'checking',
        bankName: '',
        branchId: '',
        balance: 0,
        isActive: true,
        description: ''
      });
    }
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = async () => {
    if (!selectedCompany || !accountForm.accountName || !accountForm.accountNumber || !accountForm.bankName) {
      alert('Hesap adı, hesap numarası ve banka adı zorunludur.');
      return;
    }

    try {
      const data = { 
        ...accountForm, 
        companyId: selectedCompany.id,
        branchId: accountForm.branchId || null
      };
      if (editingAccount) {
        await apiService.updateBankAccount(editingAccount.id, data);
      } else {
        await apiService.createBankAccount(data);
      }
      setIsAccountModalOpen(false);
      loadData();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert('Kayıt sırasında hata oluştu: ' + error.message);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Bu hesabı silmek istediğinizden emin misiniz?')) return;
    try {
      await apiService.deleteBankAccount(id);
      loadData();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert('Silme işlemi sırasında hata oluştu: ' + error.message);
    }
  };

  // Card handlers
  const openCardModal = (card?: BankCard) => {
    if (card) {
      setEditingCard(card);
      setCardForm({
        cardName: card.cardName,
        cardNumber: card.cardNumber || '',
        cardType: card.cardType,
        bankName: card.bankName,
        accountId: card.accountId || '',
        expiryDate: card.expiryDate ? card.expiryDate.split('T')[0] : '',
        limit: card.limit || 0,
        isActive: card.isActive,
        description: card.description || ''
      });
    } else {
      setEditingCard(null);
      setCardForm({
        cardName: '',
        cardNumber: '',
        cardType: 'credit',
        bankName: '',
        accountId: '',
        expiryDate: '',
        limit: 0,
        isActive: true,
        description: ''
      });
    }
    setIsCardModalOpen(true);
  };

  const handleSaveCard = async () => {
    if (!selectedCompany || !cardForm.cardName || !cardForm.bankName) {
      alert('Kart adı ve banka adı zorunludur.');
      return;
    }

    try {
      const data = { 
        ...cardForm, 
        companyId: selectedCompany.id,
        accountId: cardForm.accountId || null,
        expiryDate: cardForm.expiryDate ? new Date(cardForm.expiryDate).toISOString() : null,
        limit: cardForm.limit || null
      };
      if (editingCard) {
        await apiService.updateBankCard(editingCard.id, data);
      } else {
        await apiService.createBankCard(data);
      }
      setIsCardModalOpen(false);
      loadData();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert('Kayıt sırasında hata oluştu: ' + error.message);
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!confirm('Bu kartı silmek istediğinizden emin misiniz?')) return;
    try {
      await apiService.deleteBankCard(id);
      loadData();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert('Silme işlemi sırasında hata oluştu: ' + error.message);
    }
  };

  // Filter data
  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.code && b.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const filteredAccounts = accounts.filter(a => 
    a.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.accountNumber.includes(searchQuery) ||
    (a.iban && a.iban.toLowerCase().includes(searchQuery.toLowerCase())) ||
    a.bankName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredCards = cards.filter(c => 
    c.cardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.cardNumber && c.cardNumber.includes(searchQuery)) ||
    c.bankName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Banka Hesap Yönetimi</h1>
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
                onClick={() => { setActiveTab('branches'); setSearchQuery(''); }}
                className={`px-6 py-3 font-medium transition ${
                  activeTab === 'branches'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapPin size={18} />
                  Şubeler ({branches.length})
                </div>
              </button>
              <button
                onClick={() => { setActiveTab('accounts'); setSearchQuery(''); }}
                className={`px-6 py-3 font-medium transition ${
                  activeTab === 'accounts'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Wallet size={18} />
                  Hesaplar ({accounts.length})
                </div>
              </button>
              <button
                onClick={() => { setActiveTab('cards'); setSearchQuery(''); }}
                className={`px-6 py-3 font-medium transition ${
                  activeTab === 'cards'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard size={18} />
                  Kartlar ({cards.length})
                </div>
              </button>
            </div>

            {/* Search and Actions */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
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
              
              {hasPermission('MANAGE_BANK_ACCOUNTS') && (
                <button
                  onClick={() => {
                    if (activeTab === 'branches') openBranchModal();
                    else if (activeTab === 'accounts') openAccountModal();
                    else if (activeTab === 'cards') openCardModal();
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition text-sm font-medium"
                >
                  <Plus size={16} />
                  {activeTab === 'branches' && 'Yeni Şube'}
                  {activeTab === 'accounts' && 'Yeni Hesap'}
                  {activeTab === 'cards' && 'Yeni Kart'}
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-5">
              {/* Branches Tab */}
              {activeTab === 'branches' && (
                <div className="space-y-3">
                  {filteredBranches.length > 0 ? (
                    filteredBranches.map(branch => (
                      <div key={branch.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-bold text-slate-800">{branch.name}</h3>
                              {branch.code && (
                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                  {branch.code}
                                </span>
                              )}
                              {!branch.isActive && (
                                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                                  Pasif
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600">
                              {branch.city && (
                                <div className="flex items-center gap-2">
                                  <MapPin size={14} />
                                  {branch.city}{branch.district && `, ${branch.district}`}
                                </div>
                              )}
                              {branch.address && <div>{branch.address}</div>}
                              {branch.phone && <div>📞 {branch.phone}</div>}
                              {branch.email && <div>✉️ {branch.email}</div>}
                            </div>
                          </div>
                          {hasPermission('MANAGE_BANK_ACCOUNTS') && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => openBranchModal(branch)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteBranch(branch.id)}
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
                      <MapPin size={48} className="mx-auto mb-3 text-slate-200" />
                      <p>{searchQuery ? 'Arama sonucu bulunamadı' : 'Henüz şube eklenmemiş'}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Accounts Tab */}
              {activeTab === 'accounts' && (
                <div className="space-y-3">
                  {filteredAccounts.length > 0 ? (
                    filteredAccounts.map(account => (
                      <div key={account.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-bold text-slate-800">{account.accountName}</h3>
                              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                                {account.accountType === 'checking' ? 'Vadesiz' : 
                                 account.accountType === 'savings' ? 'Vadeli' :
                                 account.accountType === 'deposit' ? 'Mevduat' : 'Döviz'}
                              </span>
                              {!account.isActive && (
                                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                                  Pasif
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600 mb-2">
                              <div><span className="font-medium">Banka:</span> {account.bankName}</div>
                              {account.branch && (
                                <div><span className="font-medium">Şube:</span> {account.branch.name}</div>
                              )}
                              <div><span className="font-medium">Hesap No:</span> {account.accountNumber}</div>
                              {account.iban && (
                                <div><span className="font-medium">IBAN:</span> {account.iban}</div>
                              )}
                              <div>
                                <span className="font-medium">Bakiye:</span>{' '}
                                <span className="font-bold text-slate-800">
                                  {formatCurrency(account.balance, account.currency)}
                                </span>
                              </div>
                            </div>
                            {account.description && (
                              <div className="text-xs text-slate-500 mt-2">{account.description}</div>
                            )}
                          </div>
                          {hasPermission('MANAGE_BANK_ACCOUNTS') && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => openAccountModal(account)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteAccount(account.id)}
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
                      <p>{searchQuery ? 'Arama sonucu bulunamadı' : 'Henüz hesap eklenmemiş'}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Cards Tab */}
              {activeTab === 'cards' && (
                <div className="space-y-3">
                  {filteredCards.length > 0 ? (
                    filteredCards.map(card => (
                      <div key={card.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-bold text-slate-800">{card.cardName}</h3>
                              <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded">
                                {card.cardType === 'credit' ? 'Kredi Kartı' : 
                                 card.cardType === 'debit' ? 'Banka Kartı' : 'Ön Ödemeli'}
                              </span>
                              {!card.isActive && (
                                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                                  Pasif
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600 mb-2">
                              <div><span className="font-medium">Banka:</span> {card.bankName}</div>
                              {card.account && (
                                <div><span className="font-medium">Hesap:</span> {card.account.accountName}</div>
                              )}
                              {card.cardNumber && (
                                <div><span className="font-medium">Kart No:</span> ****{card.cardNumber}</div>
                              )}
                              {card.expiryDate && (
                                <div>
                                  <span className="font-medium">Son Kullanma:</span>{' '}
                                  {new Date(card.expiryDate).toLocaleDateString('tr-TR')}
                                </div>
                              )}
                              {card.limit && card.limit > 0 && (
                                <div>
                                  <span className="font-medium">Limit:</span>{' '}
                                  <span className="font-bold text-slate-800">
                                    {formatCurrency(card.limit, 'TRY')}
                                  </span>
                                </div>
                              )}
                            </div>
                            {card.description && (
                              <div className="text-xs text-slate-500 mt-2">{card.description}</div>
                            )}
                          </div>
                          {hasPermission('MANAGE_BANK_ACCOUNTS') && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => openCardModal(card)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteCard(card.id)}
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
                      <CreditCard size={48} className="mx-auto mb-3 text-slate-200" />
                      <p>{searchQuery ? 'Arama sonucu bulunamadı' : 'Henüz kart eklenmemiş'}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Branch Modal */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">
                {editingBranch ? 'Şube Düzenle' : 'Yeni Şube'}
              </h2>
              <button onClick={() => setIsBranchModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Şube Adı *</label>
                <input
                  type="text"
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Şube Kodu</label>
                  <input
                    type="text"
                    value={branchForm.code}
                    onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Şehir</label>
                  <input
                    type="text"
                    value={branchForm.city}
                    onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">İlçe</label>
                <input
                  type="text"
                  value={branchForm.district}
                  onChange={(e) => setBranchForm({ ...branchForm, district: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Adres</label>
                <textarea
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
                  <input
                    type="text"
                    value={branchForm.phone}
                    onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">E-posta</label>
                  <input
                    type="email"
                    value={branchForm.email}
                    onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="branchActive"
                  checked={branchForm.isActive}
                  onChange={(e) => setBranchForm({ ...branchForm, isActive: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="branchActive" className="text-sm text-slate-700">Aktif</label>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setIsBranchModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                İptal
              </button>
              <button
                onClick={handleSaveBranch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Modal */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">
                {editingAccount ? 'Hesap Düzenle' : 'Yeni Hesap'}
              </h2>
              <button onClick={() => setIsAccountModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hesap Adı *</label>
                <input
                  type="text"
                  value={accountForm.accountName}
                  onChange={(e) => setAccountForm({ ...accountForm, accountName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Banka Adı *</label>
                  <input
                    type="text"
                    value={accountForm.bankName}
                    onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Şube</label>
                  <select
                    value={accountForm.branchId}
                    onChange={(e) => setAccountForm({ ...accountForm, branchId: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Şube seçin...</option>
                    {branches.filter(b => b.isActive).map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hesap Numarası *</label>
                  <input
                    type="text"
                    value={accountForm.accountNumber}
                    onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Para Birimi</label>
                  <select
                    value={accountForm.currency}
                    onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value as Currency })}
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
                <label className="block text-sm font-medium text-slate-700 mb-1">IBAN</label>
                <input
                  type="text"
                  value={accountForm.iban}
                  onChange={(e) => setAccountForm({ ...accountForm, iban: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="TR00 0000 0000 0000 0000 0000 00"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hesap Türü</label>
                  <select
                    value={accountForm.accountType}
                    onChange={(e) => setAccountForm({ ...accountForm, accountType: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="checking">Vadesiz</option>
                    <option value="savings">Vadeli</option>
                    <option value="deposit">Mevduat</option>
                    <option value="foreign">Döviz</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bakiye</label>
                  <input
                    type="number"
                    step="0.01"
                    value={accountForm.balance}
                    onChange={(e) => setAccountForm({ ...accountForm, balance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
                <textarea
                  value={accountForm.description}
                  onChange={(e) => setAccountForm({ ...accountForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="accountActive"
                  checked={accountForm.isActive}
                  onChange={(e) => setAccountForm({ ...accountForm, isActive: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="accountActive" className="text-sm text-slate-700">Aktif</label>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                İptal
              </button>
              <button
                onClick={handleSaveAccount}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Modal */}
      {isCardModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">
                {editingCard ? 'Kart Düzenle' : 'Yeni Kart'}
              </h2>
              <button onClick={() => setIsCardModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kart Adı *</label>
                <input
                  type="text"
                  value={cardForm.cardName}
                  onChange={(e) => setCardForm({ ...cardForm, cardName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Banka Adı *</label>
                  <input
                    type="text"
                    value={cardForm.bankName}
                    onChange={(e) => setCardForm({ ...cardForm, bankName: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kart Türü</label>
                  <select
                    value={cardForm.cardType}
                    onChange={(e) => setCardForm({ ...cardForm, cardType: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="credit">Kredi Kartı</option>
                    <option value="debit">Banka Kartı</option>
                    <option value="prepaid">Ön Ödemeli</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hesap</label>
                  <select
                    value={cardForm.accountId}
                    onChange={(e) => setCardForm({ ...cardForm, accountId: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Hesap seçin...</option>
                    {accounts.filter(a => a.isActive).map(account => (
                      <option key={account.id} value={account.id}>
                        {account.accountName} - {account.bankName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kart Numarası (Son 4 hane)</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={cardForm.cardNumber}
                    onChange={(e) => setCardForm({ ...cardForm, cardNumber: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="1234"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Son Kullanma Tarihi</label>
                  <input
                    type="date"
                    value={cardForm.expiryDate}
                    onChange={(e) => setCardForm({ ...cardForm, expiryDate: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Limit (Kredi Kartı)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cardForm.limit}
                    onChange={(e) => setCardForm({ ...cardForm, limit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
                <textarea
                  value={cardForm.description}
                  onChange={(e) => setCardForm({ ...cardForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cardActive"
                  checked={cardForm.isActive}
                  onChange={(e) => setCardForm({ ...cardForm, isActive: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="cardActive" className="text-sm text-slate-700">Aktif</label>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setIsCardModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                İptal
              </button>
              <button
                onClick={handleSaveCard}
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

