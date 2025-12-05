import React from 'react';
import { 
  Building2, 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  ShieldCheck, 
  Wallet,
  FileText,
  LogOut,
  Folder,
  Receipt,
  CreditCard,
  FileCheck
} from 'lucide-react';
import { User, Role, PermissionType } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  hasPermission: (perm: PermissionType) => boolean;
  currentUser: User;
  currentRole?: Role;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  hasPermission,
  currentUser,
  currentRole,
  onLogout
}) => {
  return (
    <div className="w-64 bg-slate-900 text-white min-h-screen p-4 flex flex-col fixed top-0 left-0 bottom-0 overflow-y-auto z-10 shadow-xl">
      <div className="flex items-center gap-3 mb-8 px-2 pt-2">
        <div className="bg-blue-600 p-2 rounded-lg">
           <Building2 className="text-white" size={24} />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight">EzoOffice</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">ERP Sistemi v2.0</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5">
        {hasPermission('VIEW_DASHBOARD') && (
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm font-medium ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>
        )}
        {hasPermission('MANAGE_COMPANIES') && (
          <button 
            onClick={() => setActiveTab('companies')} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm font-medium ${activeTab === 'companies' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
          >
            <Building2 size={18} /> Şirket Yönetimi
          </button>
        )}
        {hasPermission('MANAGE_ENTITIES') && (
          <button 
            onClick={() => setActiveTab('entities')} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm font-medium ${activeTab === 'entities' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
          >
            <Users size={18} /> Cari Hesaplar
          </button>
        )}
        {hasPermission('MANAGE_PROJECTS') && (
          <button 
            onClick={() => setActiveTab('projects')} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm font-medium ${activeTab === 'projects' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
          >
            <Briefcase size={18} /> Projeler
          </button>
        )}
        {hasPermission('MANAGE_PROJECTS') && (
          <button 
            onClick={() => setActiveTab('contracts')} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm font-medium ${activeTab === 'contracts' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
          >
            <FileText size={18} /> Sözleşmeler
          </button>
        )}
        {hasPermission('MANAGE_DOCUMENTS') && (
          <button 
            onClick={() => setActiveTab('documents')} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm font-medium ${activeTab === 'documents' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
          >
            <Folder size={18} /> Dökümanlar
          </button>
        )}
        {hasPermission('VIEW_REPORTS') && (
          <button 
            onClick={() => setActiveTab('reports')} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm font-medium ${activeTab === 'reports' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
          >
            <Wallet size={18} /> Finansal Yönetim
          </button>
        )}
        {hasPermission('MANAGE_ROLES') && (
          <button 
            onClick={() => setActiveTab('roles')} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm font-medium ${activeTab === 'roles' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
          >
            <ShieldCheck size={18} /> Personel & Yetki
          </button>
        )}
        {hasPermission('MANAGE_TRANSACTIONS') && (
          <button 
            onClick={() => setActiveTab('taxes')} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm font-medium ${activeTab === 'taxes' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
          >
            <Receipt size={18} /> Vergi Yönetimi
          </button>
        )}
        {hasPermission('MANAGE_BANK_ACCOUNTS') && (
          <button 
            onClick={() => setActiveTab('bankaccounts')} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm font-medium ${activeTab === 'bankaccounts' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
          >
            <CreditCard size={18} /> Banka Hesapları
          </button>
        )}
        {hasPermission('MANAGE_INVOICES') && (
          <button 
            onClick={() => setActiveTab('invoices')} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm font-medium ${activeTab === 'invoices' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
          >
            <FileCheck size={18} /> Faturalar & Ödemeler
          </button>
        )}
      </nav>

      <div className="mt-auto pt-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2 mb-4">
          <img src={currentUser.avatar} alt="User" className="w-9 h-9 rounded-full border border-slate-600 object-cover" />
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
            <p className="text-xs text-slate-400 truncate">{currentRole?.name}</p>
          </div>
        </div>
        
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition text-sm"
        >
          <LogOut size={16} />
          Çıkış Yap
        </button>
      </div>
    </div>
  );
};
