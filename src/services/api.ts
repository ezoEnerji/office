// API Service Layer - Frontend için
// Production'da mevcut protokolü kullan (HTTPS/HTTP), development'ta localhost
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    // Environment variable varsa onu kullan (trailing slash kontrolü)
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }
  
  // Production'da (browser'da çalışıyorsa) mevcut domain'i kullan
  if (typeof window !== 'undefined') {
    // Nginx reverse proxy üzerinden /api path'i kullan
    return `${window.location.protocol}//${window.location.host}/api`;
  }
  
  // Development veya SSR
  return 'http://localhost:3001/api';
};

const API_BASE_URL = getApiBaseUrl();

class ApiService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Bir hata oluştu' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    const data = await this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async getCurrentUser() {
    return this.request<any>('/auth/me');
  }

  async register(userData: any) {
    const data = await this.request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    this.setToken(data.token);
    return data;
  }

  // Users
  async getUsers() {
    return this.request<any[]>('/users');
  }

  async createUser(userData: any) {
    return this.request<any>('/users', { method: 'POST', body: JSON.stringify(userData) });
  }

  async updateUser(id: string, userData: any) {
    return this.request<any>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(userData) });
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, { method: 'DELETE' });
  }

  // Roles
  async getRoles() {
    return this.request<any[]>('/roles');
  }

  async createRole(roleData: any) {
    return this.request<any>('/roles', { method: 'POST', body: JSON.stringify(roleData) });
  }

  async updateRole(id: string, roleData: any) {
    return this.request<any>(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(roleData) });
  }

  async deleteRole(id: string) {
    return this.request(`/roles/${id}`, { method: 'DELETE' });
  }

  // Companies
  async getCompanies() {
    return this.request<any[]>('/companies');
  }

  async createCompany(companyData: any) {
    return this.request<any>('/companies', { method: 'POST', body: JSON.stringify(companyData) });
  }

  async updateCompany(id: string, companyData: any) {
    return this.request<any>(`/companies/${id}`, { method: 'PUT', body: JSON.stringify(companyData) });
  }

  async deleteCompany(id: string) {
    return this.request(`/companies/${id}`, { method: 'DELETE' });
  }

  // Entities
  async getEntities(filters?: { type?: string; status?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    return this.request<any[]>(`/entities${params ? `?${params}` : ''}`);
  }

  async createEntity(entityData: any) {
    return this.request<any>('/entities', { method: 'POST', body: JSON.stringify(entityData) });
  }

  async updateEntity(id: string, entityData: any) {
    return this.request<any>(`/entities/${id}`, { method: 'PUT', body: JSON.stringify(entityData) });
  }

  async deleteEntity(id: string) {
    return this.request(`/entities/${id}`, { method: 'DELETE' });
  }

  // Projects
  async getProjects(filters?: { companyId?: string; status?: string; search?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    return this.request<any[]>(`/projects${params ? `?${params}` : ''}`);
  }

  async getProject(id: string) {
    return this.request<any>(`/projects/${id}`);
  }

  async createProject(projectData: any) {
    return this.request<any>('/projects', { method: 'POST', body: JSON.stringify(projectData) });
  }

  async updateProject(id: string, projectData: any) {
    return this.request<any>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(projectData) });
  }

  async deleteProject(id: string) {
    return this.request(`/projects/${id}`, { method: 'DELETE' });
  }

  // Contracts
  async getContracts(filters?: { projectId?: string; type?: string; status?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    return this.request<any[]>(`/contracts${params ? `?${params}` : ''}`);
  }

  async createContract(contractData: any) {
    return this.request<any>('/contracts', { method: 'POST', body: JSON.stringify(contractData) });
  }

  async updateContract(id: string, contractData: any) {
    return this.request<any>(`/contracts/${id}`, { method: 'PUT', body: JSON.stringify(contractData) });
  }

  async deleteContract(id: string) {
    return this.request(`/contracts/${id}`, { method: 'DELETE' });
  }

  // Transactions
  async getTransactions(filters?: { projectId?: string; contractId?: string; type?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    return this.request<any[]>(`/transactions${params ? `?${params}` : ''}`);
  }

  async createTransaction(transactionData: any) {
    return this.request<any>('/transactions', { method: 'POST', body: JSON.stringify(transactionData) });
  }

  async updateTransaction(id: string, transactionData: any) {
    return this.request<any>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(transactionData) });
  }

  async deleteTransaction(id: string) {
    return this.request(`/transactions/${id}`, { method: 'DELETE' });
  }

  // Documents
  async getDocuments(filters?: { category?: string; relatedId?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    return this.request<any[]>(`/documents${params ? `?${params}` : ''}`);
  }

  async uploadDocument(file: File, metadata: { name?: string; category?: string; relatedId?: string }) {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata.name) formData.append('name', metadata.name);
    if (metadata.category) formData.append('category', metadata.category);
    if (metadata.relatedId) formData.append('relatedId', metadata.relatedId);

    const token = this.getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Bir hata oluştu' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async deleteDocument(id: string) {
    return this.request(`/documents/${id}`, { method: 'DELETE' });
  }

  // File Upload (Local - deprecated, use uploadToGoogleDrive)
  async uploadFile(formData: FormData, type: 'avatar' | 'contract' | 'document' | 'general' = 'general'): Promise<string> {
    const token = this.getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/uploads?type=${type}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Bir hata oluştu' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.url || data.path;
  }

  // Google Drive Upload
  async uploadToGoogleDrive(
    file: File,
    options: {
      category: 'project' | 'contract' | 'document' | 'general';
      projectId?: string;
      projectCode?: string;
      projectName?: string;
      contractId?: string;
      contractCode?: string;
      contractName?: string;
      transactionId?: string;
      documentName?: string;
    }
  ): Promise<{ fileId: string; fileName: string; webViewLink: string; downloadUrl: string }> {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', options.category);
    if (options.projectId) formData.append('projectId', options.projectId);
    if (options.projectCode) formData.append('projectCode', options.projectCode);
    if (options.projectName) formData.append('projectName', options.projectName);
    if (options.contractId) formData.append('contractId', options.contractId);
    if (options.contractCode) formData.append('contractCode', options.contractCode);
    if (options.contractName) formData.append('contractName', options.contractName);
    if (options.transactionId) formData.append('transactionId', options.transactionId);
    if (options.documentName) formData.append('documentName', options.documentName);

    const response = await fetch(`${API_BASE_URL}/googledrive/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Bir hata oluştu' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  // Get all files from uploads directory (deprecated - use getDocuments instead)
  async getAllFiles() {
    // Artık Google Drive kullanıyoruz, bu yüzden veritabanındaki dökümanları döndürüyoruz
    return this.getDocuments();
  }

  // Get all documents from database
  async getDocuments(category?: string, relatedId?: string) {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (relatedId) params.append('relatedId', relatedId);
    const query = params.toString();
    return this.request<any[]>(`/documents${query ? `?${query}` : ''}`);
  }

  // Upload document (Google Drive)
  async uploadDocument(
    file: File,
    options: {
      category: string;
      relatedId?: string;
      name?: string;
    }
  ): Promise<{ fileId: string; fileName: string; webViewLink: string; downloadUrl: string }> {
    return this.uploadToGoogleDrive(file, {
      category: 'document',
      documentName: options.category
    });
  }

  // Delete file from Google Drive
  async deleteGoogleDriveFile(fileId: string) {
    return this.request(`/googledrive/${fileId}`, { method: 'DELETE' });
  }

  // Taxes
  async getTaxes() {
    return this.request<any[]>(`/taxes`);
  }

  async getActiveTaxes() {
    return this.request<any[]>(`/taxes/active`);
  }

  async getTax(id: string) {
    return this.request<any>(`/taxes/${id}`);
  }

  async createTax(data: any) {
    return this.request<any>(`/taxes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTax(id: string, data: any) {
    return this.request<any>(`/taxes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTax(id: string) {
    return this.request(`/taxes/${id}`, { method: 'DELETE' });
  }

  // Bank Branches
  async getBankBranches(companyId: string) {
    return this.request<any[]>(`/bankaccounts/branches/${companyId}`);
  }

  async getBankBranch(id: string) {
    return this.request<any>(`/bankaccounts/branches/branch/${id}`);
  }

  async createBankBranch(data: any) {
    return this.request<any>(`/bankaccounts/branches`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBankBranch(id: string, data: any) {
    return this.request<any>(`/bankaccounts/branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBankBranch(id: string) {
    return this.request(`/bankaccounts/branches/${id}`, { method: 'DELETE' });
  }

  // Bank Accounts
  async getBankAccounts(companyId: string) {
    return this.request<any[]>(`/bankaccounts/accounts/${companyId}`);
  }

  async getBankAccount(id: string) {
    return this.request<any>(`/bankaccounts/accounts/account/${id}`);
  }

  async createBankAccount(data: any) {
    return this.request<any>(`/bankaccounts/accounts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBankAccount(id: string, data: any) {
    return this.request<any>(`/bankaccounts/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBankAccount(id: string) {
    return this.request(`/bankaccounts/accounts/${id}`, { method: 'DELETE' });
  }

  // Bank Cards
  async getBankCards(companyId: string) {
    return this.request<any[]>(`/bankaccounts/cards/${companyId}`);
  }

  async getBankCard(id: string) {
    return this.request<any>(`/bankaccounts/cards/card/${id}`);
  }

  async createBankCard(data: any) {
    return this.request<any>(`/bankaccounts/cards`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBankCard(id: string, data: any) {
    return this.request<any>(`/bankaccounts/cards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBankCard(id: string) {
    return this.request(`/bankaccounts/cards/${id}`, { method: 'DELETE' });
  }

  // Invoices
  async getInvoices(params?: { companyId?: string; projectId?: string; entityId?: string; invoiceType?: string; status?: string; startDate?: string; endDate?: string }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
    }
    return this.request<any[]>(`/invoices${queryParams.toString() ? '?' + queryParams.toString() : ''}`);
  }

  async getInvoice(id: string) {
    return this.request<any>(`/invoices/${id}`);
  }

  async createInvoice(data: any) {
    return this.request<any>(`/invoices`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInvoice(id: string, data: any) {
    return this.request<any>(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteInvoice(id: string) {
    return this.request(`/invoices/${id}`, { method: 'DELETE' });
  }

  async getInvoicePayments(invoiceId: string) {
    return this.request<any[]>(`/invoices/${invoiceId}/payments`);
  }

  // Payments
  async getPayments(params?: { invoiceId?: string; bankAccountId?: string; bankCardId?: string; status?: string; startDate?: string; endDate?: string }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
    }
    return this.request<any[]>(`/payments${queryParams.toString() ? '?' + queryParams.toString() : ''}`);
  }

  async getPayment(id: string) {
    return this.request<any>(`/payments/${id}`);
  }

  async createPayment(data: any) {
    return this.request<any>(`/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePayment(id: string, data: any) {
    return this.request<any>(`/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePayment(id: string) {
    return this.request(`/payments/${id}`, { method: 'DELETE' });
  }
}

export const apiService = new ApiService();

