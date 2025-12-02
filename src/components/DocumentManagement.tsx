import React, { useState } from 'react';
import { 
  FileText, Image, FileSpreadsheet, File, Folder, 
  Upload, Search, Grid, List, MoreVertical, Download, Trash2, Plus, X, Users
} from 'lucide-react';
import { Document, User, Project, Contract } from '../types';
import { apiService } from '../services/api';

interface DocumentManagementProps {
  documents: Document[];
  setDocuments: (docs: Document[]) => void;
  users: User[];
  projects: Project[];
  contracts: Contract[];
  onRefresh?: () => void;
}

export const DocumentManagement: React.FC<DocumentManagementProps> = ({
  documents,
  setDocuments,
  users,
  projects,
  contracts,
  onRefresh
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [allFiles, setAllFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Upload Form State
  const [uploadForm, setUploadForm] = useState<{
    file: File | null;
    category: Document['category'];
    relatedId: string;
  }>({
    file: null,
    category: 'general',
    relatedId: ''
  });

  // Load all files from uploads directory
  React.useEffect(() => {
    const loadAllFiles = async () => {
      setIsLoading(true);
      try {
        const files = await apiService.getAllFiles();
        setAllFiles(files);
      } catch (error) {
        console.error('Dosyalar yüklenirken hata:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadAllFiles();
  }, []);

  const categories = [
    { id: 'all', label: 'Tüm Dosyalar', icon: Folder, color: 'text-blue-500' },
    { id: 'contract', label: 'Sözleşmeler', icon: FileText, color: 'text-emerald-500' },
    { id: 'invoice', label: 'Faturalar', icon: FileSpreadsheet, color: 'text-orange-500' },
    { id: 'project', label: 'Proje Dosyaları', icon: Folder, color: 'text-purple-500' },
    { id: 'personnel', label: 'Personel Belgeleri', icon: Users, color: 'text-indigo-500' },
    { id: 'general', label: 'Genel', icon: File, color: 'text-slate-500' },
  ];

  const getFileIcon = (type: Document['type']) => {
    switch (type) {
      case 'pdf': return <FileText className="text-red-500" size={24} />;
      case 'image': return <Image className="text-blue-500" size={24} />;
      case 'spreadsheet': return <FileSpreadsheet className="text-green-500" size={24} />;
      default: return <File className="text-slate-500" size={24} />;
    }
  };

  // Combine database documents and files from uploads directory
  const allDocuments = React.useMemo(() => {
    const dbDocs = documents.map(doc => ({ ...doc, source: 'database' }));
    const fileDocs = allFiles
      .filter(file => !documents.some(doc => doc.url === file.url))
      .map(file => ({
        id: file.id,
        name: file.name,
        type: file.type,
        size: file.size,
        uploadDate: file.uploadDate,
        uploaderId: file.uploaderId,
        category: file.category,
        relatedId: file.relatedId,
        url: file.url,
        source: 'filesystem' as const
      }));
    return [...dbDocs, ...fileDocs];
  }, [documents, allFiles]);

  const filteredDocuments = allDocuments.filter(doc => {
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Gerçek input change handler
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadForm({ ...uploadForm, file: e.target.files[0] });
    }
  };

  // Handle file upload
  const handleFileUpload = async () => {
    if (!uploadForm.file) {
      alert('Lütfen bir dosya seçin');
      return;
    }

    try {
      await apiService.uploadDocument(uploadForm.file, {
        category: uploadForm.category,
        relatedId: uploadForm.relatedId || undefined
      });

      // Refresh documents and files
      if (onRefresh) onRefresh();
      const files = await apiService.getAllFiles();
      setAllFiles(files);
      
      setIsUploadModalOpen(false);
      setUploadForm({ file: null, category: 'general', relatedId: '' });
    } catch (error: any) {
      alert(error.message || 'Dosya yüklenirken bir hata oluştu');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bu dökümanı silmek istediğinize emin misiniz?')) {
      try {
        await apiService.deleteDocument(id);
        if (onRefresh) onRefresh();
      } catch (error: any) {
        alert(error.message || 'Silme sırasında bir hata oluştu');
      }
    }
  };

  return (
    <div className="flex h-full bg-slate-50">
      {/* Sidebar (Categories) */}
      <div className="w-64 bg-white border-r border-slate-200 p-4 flex-shrink-0 hidden md:block">
        <button 
          onClick={() => setIsUploadModalOpen(true)}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition mb-6 shadow-sm"
        >
          <Upload size={18} /> Dosya Yükle
        </button>

        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2 px-2">Konumlar</h3>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${selectedCategory === cat.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <cat.icon size={18} className={selectedCategory === cat.id ? 'text-blue-600' : cat.color} />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <div className="md:hidden">
              {/* Mobile Menu Trigger could go here */}
              <Folder size={24} className="text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 hidden md:block">
              {categories.find(c => c.id === selectedCategory)?.label}
            </h2>
            
            <div className="relative flex-1 max-w-md ml-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="Dosya ara..."
                className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg text-sm transition outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Grid size={20} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List size={20} />
            </button>
             <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="md:hidden bg-blue-600 text-white p-2 rounded-lg"
            >
              <Upload size={20} />
            </button>
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredDocuments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Folder size={64} className="mb-4 opacity-20" />
              <p>Bu klasörde dosya bulunamadı.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredDocuments.map(doc => (
                <div key={doc.id} className="group bg-white p-4 rounded-xl border border-slate-200 hover:shadow-md transition cursor-pointer flex flex-col items-center text-center relative">
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex gap-1">
                    <a 
                      href={doc.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded"
                    >
                      <Download size={14} />
                    </a>
                    {(doc as any).source === 'database' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }} 
                        className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  
                  <div className="w-16 h-16 mb-3 flex items-center justify-center bg-slate-50 rounded-lg group-hover:scale-105 transition">
                    {getFileIcon(doc.type)}
                  </div>
                  <h3 className="text-sm font-medium text-slate-700 truncate w-full" title={doc.name}>{doc.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{doc.size} • {doc.uploadDate}</p>
                  {doc.relatedId && (
                    <span className="mt-2 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded-full truncate max-w-full">
                       {projects.find(p => p.id === doc.relatedId)?.code || contracts.find(c => c.id === doc.relatedId)?.code || 'Bağlantılı'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-medium">Dosya Adı</th>
                    <th className="p-3 font-medium">Kategori</th>
                    <th className="p-3 font-medium">Boyut</th>
                    <th className="p-3 font-medium">Tarih</th>
                    <th className="p-3 font-medium">Yükleyen</th>
                    <th className="p-3 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDocuments.map(doc => (
                    <tr key={doc.id} className="hover:bg-slate-50 group">
                      <td className="p-3 flex items-center gap-3">
                        {getFileIcon(doc.type)}
                        <span className="font-medium text-slate-700">{doc.name}</span>
                      </td>
                      <td className="p-3 text-slate-600 capitalize">{categories.find(c => c.id === doc.category)?.label}</td>
                      <td className="p-3 text-slate-500">{doc.size}</td>
                      <td className="p-3 text-slate-500">{doc.uploadDate}</td>
                      <td className="p-3 text-slate-500">
                        {doc.uploaderId ? users.find(u => u.id === doc.uploaderId)?.name : 'Bilinmiyor'}
                        {(doc as any).source === 'filesystem' && (
                          <span className="ml-2 text-xs text-slate-400">(Dosya sistemi)</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                          <a 
                            href={doc.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-slate-100 text-slate-500 rounded"
                          >
                            <Download size={16} />
                          </a>
                          {(doc as any).source === 'database' && (
                            <button 
                              onClick={() => handleDelete(doc.id)} 
                              className="p-1.5 hover:bg-red-50 text-red-500 rounded"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Dosya Yükle</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
                <select 
                  className="w-full p-2 border rounded-lg bg-white"
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({...uploadForm, category: e.target.value as any})}
                >
                  {categories.filter(c => c.id !== 'all').map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              {uploadForm.category === 'project' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">İlgili Proje</label>
                  <select 
                    className="w-full p-2 border rounded-lg bg-white"
                    value={uploadForm.relatedId}
                    onChange={(e) => setUploadForm({...uploadForm, relatedId: e.target.value})}
                  >
                    <option value="">Seçiniz...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

              {uploadForm.category === 'contract' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">İlgili Sözleşme</label>
                  <select 
                    className="w-full p-2 border rounded-lg bg-white"
                    value={uploadForm.relatedId}
                    onChange={(e) => setUploadForm({...uploadForm, relatedId: e.target.value})}
                  >
                    <option value="">Seçiniz...</option>
                    {contracts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition cursor-pointer relative">
                <input 
                  type="file" 
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={onFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                />
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
                  <Upload size={24} />
                </div>
                <p className="text-sm font-medium text-slate-700">
                  {uploadForm.file ? uploadForm.file.name : 'Dosya seçin veya sürükleyin'}
                </p>
                <p className="text-xs text-slate-400 mt-1">PDF, Görsel, Excel (Max 10MB)</p>
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-slate-100 bg-slate-50 rounded-b-xl">
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="flex-1 py-2.5 text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition text-sm font-medium"
              >
                İptal
              </button>
              <button 
                onClick={handleFileUpload}
                disabled={!uploadForm.file}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Yükle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

