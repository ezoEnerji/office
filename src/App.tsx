import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  User, 
  Role, 
  Company, 
  Entity, 
  Project, 
  Transaction, 
  Contract,
  Document,
  PermissionType 
} from './types';
import { 
  INITIAL_ROLES, 
  INITIAL_USERS,
  INITIAL_DOCUMENTS
} from './data/constants';
import { formatCurrency } from './utils/helpers';
import { apiService } from './services/api';

// Components
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CompanyManagement } from './components/CompanyManagement';
import { EntityManagement } from './components/EntityManagement';
import { ProjectManagement } from './components/ProjectManagement';
import { ContractManagement } from './components/ContractManagement';
import { RoleManagement } from './components/RoleManagement';
import { FinancialManagement } from './components/FinancialManagement';
import { DocumentManagement } from './components/DocumentManagement';
import { Reports } from './components/Reports';
import { TaxManagement } from './components/TaxManagement';
import { BankAccountManagement } from './components/BankAccountManagement';
import { InvoiceManagement } from './components/InvoiceManagement';
import { Unauthorized } from './components/Unauthorized';

const App = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'companies' | 'entities' | 'projects' | 'contracts' | 'roles' | 'reports' | 'documents' | 'taxes' | 'bankaccounts' | 'invoices'>('dashboard');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Data States - Backend'den yüklenecek
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);

  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const currentRole = currentUser ? roles.find(r => r.id === currentUser.roleId) : null;
  const hasPermission = (perm: PermissionType) => currentRole?.permissions.includes(perm) ?? false;

  // Token kontrolü ve otomatik login
  useEffect(() => {
    const token = apiService.getToken();
    if (token) {
      // Token varsa önce kullanıcı bilgisini çek, sonra verileri yükle
      apiService.getCurrentUser()
        .then((user) => {
          setCurrentUser(user);
          setIsAuthenticated(true);
          return loadInitialData();
        })
        .then(() => {
          setIsLoading(false);
        })
        .catch(() => {
          // Token geçersizse temizle
          apiService.clearToken();
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'projects') {
      setSelectedProject(null);
    }
  }, [activeTab]);

  const handleLogin = async (email: string, pass: string) => {
    try {
      const data = await apiService.login(email, pass);
      setCurrentUser(data.user);
      setIsAuthenticated(true);
      setActiveTab('dashboard');
      
      // Backend'den verileri çek
      await loadInitialData();
    } catch (error: any) {
      throw new Error(error.message || 'Giriş başarısız. (Demo şifre: 123)');
    }
  };

  const loadInitialData = async () => {
    try {
      const [rolesData, usersData, companiesData, entitiesData, projectsData, contractsData, documentsData, transactionsData, taxesData] = await Promise.all([
        apiService.getRoles(),
        apiService.getUsers(),
        apiService.getCompanies(),
        apiService.getEntities(),
        apiService.getProjects(),
        apiService.getContracts(),
        apiService.getDocuments(),
        apiService.getTransactions(),
        apiService.getTaxes()
      ]);

      // Backend'den gelen verileri parse et (PostgreSQL JSON field'ları direkt obje olarak gelir)
      const parsedRoles = rolesData.map((r: any) => ({ ...r, permissions: Array.isArray(r.permissions) ? r.permissions : (r.permissions || []) }));
      setRoles(parsedRoles);
      setUsers(usersData);
      setCompanies(companiesData);
      setEntities(entitiesData);
      setProjects(projectsData.map((p: any) => ({ ...p, tags: Array.isArray(p.tags) ? p.tags : (p.tags || []) })));
      setContracts(contractsData.map((c: any) => ({ ...c, attachments: Array.isArray(c.attachments) ? c.attachments : (c.attachments || []) })));
      setDocuments(documentsData);
      setTransactions(transactionsData.map((t: any) => ({ ...t, taxes: t.taxes ? (Array.isArray(t.taxes) ? t.taxes : t.taxes) : undefined })));
      setTaxes(taxesData);

      // Login'den gelen user bilgisini koru, loadInitialData'da override etme
      // currentUser zaten handleLogin'de set edilmiş olmalı
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      throw error;
    }
  };

  const handleLogout = () => {
    apiService.clearToken();
    setIsAuthenticated(false);
    setCurrentUser(null);
    // State'leri temizle
    setRoles([]);
    setUsers([]);
    setCompanies([]);
    setEntities([]);
    setProjects([]);
    setContracts([]);
    setDocuments([]);
    setTransactions([]);
    setTaxes([]);
  };

  // CRUD Wrapper Functions - Backend API çağrıları
  const refreshData = async (type?: string) => {
    try {
      if (!type || type === 'companies') {
        const companiesData = await apiService.getCompanies();
        setCompanies(companiesData);
      }
      if (!type || type === 'entities') {
        const entitiesData = await apiService.getEntities();
        setEntities(entitiesData);
      }
      if (!type || type === 'projects') {
        const projectsData = await apiService.getProjects();
        setProjects(projectsData.map((p: any) => ({ ...p, tags: Array.isArray(p.tags) ? p.tags : (p.tags || []) })));
      }
      if (!type || type === 'contracts') {
        const contractsData = await apiService.getContracts();
        setContracts(contractsData.map((c: any) => ({ ...c, attachments: Array.isArray(c.attachments) ? c.attachments : (c.attachments || []) })));
      }
      if (!type || type === 'transactions') {
        const transactionsData = await apiService.getTransactions();
        setTransactions(transactionsData.map((t: any) => ({ ...t, taxes: t.taxes ? (Array.isArray(t.taxes) ? t.taxes : t.taxes) : undefined })));
      }
      if (!type || type === 'documents') {
        const documentsData = await apiService.getDocuments();
        setDocuments(documentsData);
      }
      if (!type || type === 'users') {
        const usersData = await apiService.getUsers();
        setUsers(usersData);
      }
      if (!type || type === 'roles') {
        const rolesData = await apiService.getRoles();
        setRoles(rolesData.map((r: any) => ({ ...r, permissions: Array.isArray(r.permissions) ? r.permissions : (r.permissions || []) })));
      }
      if (!type || type === 'taxes') {
        const taxesData = await apiService.getTaxes();
        setTaxes(taxesData);
      }
    } catch (error) {
      console.error('Veri yenileme hatası:', error);
    }
  };

  const analyzeProject = async (project: Project) => {
    if (!process.env.API_KEY) {
      alert("Lütfen API_KEY environment değişkenini ayarlayın.");
      return;
    }

    setIsAnalyzing(true);
    setAiAnalysis('');
    
    try {
      const projectTransactions = transactions.filter(t => t.projectId === project.id);
      
      let transactionSummary = projectTransactions.map(t => {
        const converted = t.amount * t.exchangeRate;
        return `- ${t.date}: ${t.description} (${t.type}) -> ${t.amount} ${t.currency} (Kur: ${t.exchangeRate}) = ${converted.toFixed(2)} ${project.agreementCurrency}`;
      }).join('\n');

      const totalIncome = projectTransactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + (t.amount * t.exchangeRate), 0);
        
      const totalExpense = projectTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + (t.amount * t.exchangeRate), 0);

      const prompt = `
        Sen uzman bir finansal analistsin. Aşağıdaki proje verilerini analiz et ve kısa, stratejik bir Türkçe rapor sun.
        
        Proje: ${project.name} (${project.code})
        Açıklama: ${project.description || 'Yok'}
        Anlaşma Para Birimi: ${project.agreementCurrency}
        Bütçe: ${formatCurrency(project.budget, project.agreementCurrency)}
        Tarihler: ${project.startDate} - ${project.endDate || 'Belirsiz'}
        Hesaplanan Toplam Gelir: ${formatCurrency(totalIncome, project.agreementCurrency)}
        Hesaplanan Toplam Gider: ${formatCurrency(totalExpense, project.agreementCurrency)}
        Öncelik: ${project.priority}
        
        İşlem Geçmişi (Döviz kurları dikkate alınmıştır):
        ${transactionSummary}
        
        Lütfen şunları yanıtla:
        1. Bütçe durumu nedir? Risk var mı?
        2. Kur hareketlerinin projeye etkisi nedir? (İşlem anındaki kurlara göre)
        3. Projenin genel gidişatı ve karlılık tahmini.
      `;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt
      });
      
      setAiAnalysis(response.text);

    } catch (error) {
      console.error("AI Error:", error);
      setAiAnalysis("Analiz sırasında bir hata oluştu. Lütfen API anahtarınızı ve internet bağlantınızı kontrol edin.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        hasPermission={hasPermission} 
        currentUser={currentUser} 
        currentRole={currentRole} 
        onLogout={handleLogout}
      />
      
      <main className="flex-1 overflow-auto bg-slate-50 ml-64">
        {activeTab === 'dashboard' && (
          hasPermission('VIEW_DASHBOARD') 
            ? <Dashboard 
                currentUser={currentUser}
                transactions={transactions}
                projects={projects}
                companies={companies}
                entities={entities}
                roles={roles}
              /> 
            : <Unauthorized />
        )}

        {activeTab === 'companies' && (
          hasPermission('MANAGE_COMPANIES') 
            ? <CompanyManagement 
                companies={companies}
                setCompanies={setCompanies}
                projects={projects}
                onRefresh={() => refreshData('companies')}
              /> 
            : <Unauthorized />
        )}

        {activeTab === 'entities' && (
          hasPermission('MANAGE_ENTITIES') 
            ? <EntityManagement 
                entities={entities}
                setEntities={setEntities}
                onRefresh={() => refreshData('entities')}
              /> 
            : <Unauthorized />
        )}

        {activeTab === 'projects' && (
          hasPermission('MANAGE_PROJECTS') || hasPermission('VIEW_REPORTS') 
            ? <ProjectManagement 
                projects={projects}
                setProjects={setProjects}
                transactions={transactions}
                setTransactions={setTransactions}
                companies={companies}
                users={users}
                entities={entities}
                contracts={contracts}
                taxes={taxes}
                selectedProject={selectedProject}
                setSelectedProject={setSelectedProject}
                analyzeProject={analyzeProject}
                aiAnalysis={aiAnalysis}
                isAnalyzing={isAnalyzing}
                hasPermission={hasPermission}
                onRefresh={() => refreshData('projects')}
                onRefreshTransactions={() => refreshData('transactions')}
              /> 
            : <Unauthorized />
        )}

        {activeTab === 'contracts' && (
          hasPermission('MANAGE_PROJECTS') 
            ? <ContractManagement 
                contracts={contracts}
                setContracts={setContracts}
                projects={projects}
                entities={entities}
                companies={companies}
                transactions={transactions}
                onRefresh={() => refreshData('contracts')}
              /> 
            : <Unauthorized />
        )}

        {activeTab === 'documents' && (
          hasPermission('MANAGE_DOCUMENTS') 
            ? <DocumentManagement 
                documents={documents}
                setDocuments={setDocuments}
                users={users}
                projects={projects}
                contracts={contracts}
                onRefresh={() => refreshData('documents')}
              /> 
            : <Unauthorized />
        )}

        {activeTab === 'roles' && (
          hasPermission('MANAGE_ROLES') 
            ? <RoleManagement 
                roles={roles}
                setRoles={setRoles}
                users={users}
                setUsers={setUsers}
                onRefresh={() => refreshData('roles')}
                onRefreshUsers={() => refreshData('users')}
              /> 
            : <Unauthorized />
        )}

        {activeTab === 'reports' && (
          hasPermission('VIEW_REPORTS') 
            ? <Reports 
                transactions={transactions}
                projects={projects}
                companies={companies}
                entities={entities}
                contracts={contracts}
                users={users}
              /> 
            : <Unauthorized />
        )}

        {activeTab === 'taxes' && (
          hasPermission('MANAGE_TRANSACTIONS') 
            ? <TaxManagement 
                taxes={taxes}
                setTaxes={setTaxes}
                onRefresh={() => refreshData('taxes')}
              /> 
            : <Unauthorized />
        )}

        {activeTab === 'bankaccounts' && (
          hasPermission('MANAGE_BANK_ACCOUNTS') 
            ? <BankAccountManagement 
                companies={companies}
                hasPermission={hasPermission}
                onRefresh={() => refreshData('companies')}
              /> 
            : <Unauthorized />
        )}
      </main>
    </div>
  );
};

export default App;
