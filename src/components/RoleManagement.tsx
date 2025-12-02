import React, { useState } from 'react';
import { Users, ShieldCheck, Trash2, Plus, Edit, Mail, CheckCircle, X, Briefcase } from 'lucide-react';
import { Role, User, PermissionType } from '../types';
import { PERMISSIONS_LIST } from '../data/constants';
import { apiService } from '../services/api';

interface RoleManagementProps {
  roles: Role[];
  setRoles: (roles: Role[]) => void;
  users: User[];
  setUsers: (users: User[]) => void;
  onRefresh?: () => void;
  onRefreshUsers?: () => void;
}

export const RoleManagement: React.FC<RoleManagementProps> = ({
  roles,
  setRoles,
  users,
  setUsers,
  onRefresh,
  onRefreshUsers
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  
  // User Form State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState<Partial<User>>({
    name: '',
    email: '',
    title: '',
    roleId: '',
    avatar: ''
  });
  const [password, setPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  // --- ROLE OPERATIONS ---
  const togglePermission = async (roleId: string, perm: PermissionType) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;
    
    const hasPerm = role.permissions.includes(perm);
    const newPermissions = hasPerm 
      ? role.permissions.filter(p => p !== perm)
      : [...role.permissions, perm];
    
    try {
      await apiService.updateRole(roleId, {
        name: role.name,
        description: role.description,
        permissions: newPermissions
      });
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert(error.message || 'Yetki güncellenirken bir hata oluştu');
    }
  };

  const handleAddRole = async () => {
    try {
      await apiService.createRole({
        name: 'Yeni Rol',
        description: 'Rol açıklaması',
        permissions: []
      });
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert(error.message || 'Rol oluşturulurken bir hata oluştu');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (users.some(u => u.roleId === roleId)) {
      alert('Bu role sahip kullanıcılar var. Önce kullanıcıların rolünü değiştirin.');
      return;
    }
    if (confirm('Bu rolü silmek istediğinize emin misiniz?')) {
      try {
        await apiService.deleteRole(roleId);
        if (onRefresh) onRefresh();
      } catch (error: any) {
        alert(error.message || 'Rol silinirken bir hata oluştu');
      }
    }
  };

  // --- USER OPERATIONS ---
  const openUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserForm({
        name: user.name,
        email: user.email,
        title: user.title,
        roleId: user.roleId,
        avatar: user.avatar
      });
      setPassword('');
      setAvatarFile(null);
      setAvatarPreview(user.avatar);
    } else {
      setEditingUser(null);
      setUserForm({
        name: '',
        email: '',
        title: '',
        roleId: roles[0]?.id || '',
        avatar: ''
      });
      setPassword('');
      setAvatarFile(null);
      setAvatarPreview('');
    }
    setIsUserModalOpen(true);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveUser = async () => {
    if (!userForm.name || !userForm.email || !userForm.roleId) {
      alert('Lütfen zorunlu alanları doldurun.');
      return;
    }

    if (!editingUser && !password) {
      alert('Yeni kullanıcı için şifre belirleyin.');
      return;
    }

    try {
      let avatarUrl = userForm.avatar;

      // Avatar yükleme
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);
        formData.append('type', 'avatar');
        avatarUrl = await apiService.uploadFile(formData);
      }

      if (editingUser) {
        const updateData: any = {
          ...userForm,
          avatar: avatarUrl || userForm.avatar
        };
        if (password) {
          updateData.password = password;
        }
        await apiService.updateUser(editingUser.id, updateData);
      } else {
        await apiService.createUser({
          ...userForm,
          password: password,
          avatar: avatarUrl || `https://i.pravatar.cc/150?u=${Date.now()}`
        });
      }
      setIsUserModalOpen(false);
      setPassword('');
      setAvatarFile(null);
      setAvatarPreview('');
      if (onRefreshUsers) onRefreshUsers();
    } catch (error: any) {
      alert(error.message || 'Kullanıcı kaydedilirken bir hata oluştu');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) {
      try {
        await apiService.deleteUser(userId);
        if (onRefreshUsers) onRefreshUsers();
      } catch (error: any) {
        alert(error.message || 'Kullanıcı silinirken bir hata oluştu');
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Kullanıcı ve Rol Yönetimi</h2>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg w-fit mb-6">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
        >
          <div className="flex items-center gap-2">
            <Users size={16} /> Kullanıcılar
          </div>
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'roles' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} /> Roller ve Yetkiler
          </div>
        </button>
      </div>

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-semibold text-slate-700">Kullanıcı Listesi</h3>
            <button 
              onClick={() => openUserModal()}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-700 transition"
            >
              <Plus size={16} /> Yeni Kullanıcı
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="p-4 font-semibold">Kullanıcı</th>
                  <th className="p-4 font-semibold">İletişim</th>
                  <th className="p-4 font-semibold">Rol</th>
                  <th className="p-4 font-semibold text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(user => {
                  const userRole = roles.find(r => r.id === user.roleId);
                  return (
                    <tr key={user.id} className="hover:bg-slate-50 transition group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full bg-slate-200 object-cover" />
                          <div>
                            <div className="font-medium text-slate-800">{user.name}</div>
                            {user.title && <div className="text-xs text-slate-500 flex items-center gap-1"><Briefcase size={10}/> {user.title}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail size={14} className="text-slate-400" /> {user.email}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${userRole?.id === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                          {userRole?.name || 'Rol Yok'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => openUserModal(user)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Düzenle"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Sil"
                            disabled={user.roleId === 'admin' && users.filter(u => u.roleId === 'admin').length <= 1} // Son admin silinemez
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ROLES TAB */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="flex justify-end">
             <button 
              onClick={handleAddRole}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-purple-700 transition"
            >
              <Plus size={16} /> Yeni Rol Ekle
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {roles.map(role => (
              <div key={role.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 mr-4">
                    <input 
                      value={role.name}
                      onChange={(e) => setRoles(roles.map(r => r.id === role.id ? {...r, name: e.target.value} : r))}
                      className="text-lg font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 outline-none w-full mb-1"
                      placeholder="Rol Adı"
                    />
                    <input 
                      value={role.description}
                      onChange={(e) => setRoles(roles.map(r => r.id === role.id ? {...r, description: e.target.value} : r))}
                      className="text-sm text-slate-500 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 outline-none w-full"
                      placeholder="Rol Açıklaması"
                    />
                  </div>
                  {role.id !== 'admin' && (
                    <button 
                      onClick={() => handleDeleteRole(role.id)}
                      className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                    <ShieldCheck size={12} /> İzinler ve Yetkiler
                  </h4>
                  <div className="space-y-2">
                    {PERMISSIONS_LIST.map(perm => (
                      <label key={perm.key} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition border border-transparent hover:border-slate-100">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${role.permissions.includes(perm.key) ? 'bg-purple-600 border-purple-600' : 'bg-white border-slate-300'}`}>
                          {role.permissions.includes(perm.key) && <CheckCircle size={12} className="text-white" />}
                        </div>
                        <input 
                          type="checkbox" 
                          checked={role.permissions.includes(perm.key)}
                          onChange={() => togglePermission(role.id, perm.key)}
                          disabled={role.id === 'admin'}
                          className="hidden"
                        />
                        <span className={`text-sm ${role.permissions.includes(perm.key) ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                          {perm.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* USER MODAL */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">{editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}</h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="flex flex-col items-center mb-4">
                <div className="relative">
                  <img 
                    src={avatarPreview || userForm.avatar || 'https://i.pravatar.cc/150'} 
                    alt="Avatar" 
                    className="w-20 h-20 rounded-full bg-slate-100 object-cover border-2 border-slate-200" 
                  />
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full cursor-pointer hover:bg-blue-700 transition">
                    <Edit size={12} />
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-xs text-slate-400 mt-2">Profil resmi yükle</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Ad Soyad *</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded-lg"
                    value={userForm.name}
                    onChange={e => setUserForm({...userForm, name: e.target.value})}
                    placeholder="Örn: Ali Veli"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">E-posta *</label>
                  <input 
                    type="email" 
                    className="w-full p-2 border rounded-lg"
                    value={userForm.email}
                    onChange={e => setUserForm({...userForm, email: e.target.value})}
                    placeholder="ornek@sirket.com"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">
                    Şifre {editingUser ? '(Değiştirmek için doldurun)' : '*'}
                  </label>
                  <input 
                    type="password" 
                    className="w-full p-2 border rounded-lg"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={editingUser ? "Yeni şifre (opsiyonel)" : "Şifre belirleyin"}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs text-slate-500 mb-1">Ünvan</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded-lg"
                    value={userForm.title || ''}
                    onChange={e => setUserForm({...userForm, title: e.target.value})}
                    placeholder="Örn: Mühendis"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs text-slate-500 mb-1">Rol *</label>
                  <select 
                    className="w-full p-2 border rounded-lg bg-white"
                    value={userForm.roleId}
                    onChange={e => setUserForm({...userForm, roleId: e.target.value})}
                  >
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-slate-100 bg-slate-50 rounded-b-xl">
              <button 
                onClick={() => setIsUserModalOpen(false)}
                className="flex-1 py-2.5 text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition text-sm font-medium"
              >
                İptal
              </button>
              <button 
                onClick={handleSaveUser}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium shadow-sm"
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
