import React from 'react';
import { Building2, Briefcase, Users, ArrowRightLeft } from 'lucide-react';
import { User, Transaction, Project, Company, Entity, Role } from '../types';
import { PERMISSIONS_LIST } from '../data/constants';

interface DashboardProps {
  currentUser: User;
  transactions: Transaction[];
  projects: Project[];
  companies: Company[];
  entities: Entity[];
  roles: Role[];
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  transactions,
  projects,
  companies,
  entities,
  roles
}) => {
  const totalTransactions = transactions.length;
  const activeProjectCount = projects.filter(p => p.status === 'active').length;
  const companyCount = companies.length;
  const entityCount = entities.length;

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-slate-800 mb-2">Hoşgeldin, {currentUser.name}</h2>
      <p className="text-slate-500 mb-8">Holding Finansal Genel Bakış Paneli</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6 rounded-2xl shadow-lg">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Building2 size={24} />
            </div>
            <div>
              <p className="text-blue-100 text-sm">Toplam Şirket</p>
              <h3 className="text-2xl font-bold">{companyCount}</h3>
            </div>
          </div>
          <div className="text-sm text-blue-100">Holding bünyesindeki aktif şirketler</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white p-6 rounded-2xl shadow-lg">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Briefcase size={24} />
            </div>
            <div>
              <p className="text-purple-100 text-sm">Aktif Projeler</p>
              <h3 className="text-2xl font-bold">{activeProjectCount}</h3>
            </div>
          </div>
          <div className="text-sm text-purple-100">Devam eden taahhüt ve geliştirmeler</div>
        </div>

         <div className="bg-gradient-to-br from-orange-500 to-orange-700 text-white p-6 rounded-2xl shadow-lg">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Users size={24} />
            </div>
            <div>
              <p className="text-orange-100 text-sm">Cari Hesaplar</p>
              <h3 className="text-2xl font-bold">{entityCount}</h3>
            </div>
          </div>
          <div className="text-sm text-orange-100">Müşteri, Tedarikçi ve Yükleniciler</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-6 rounded-2xl shadow-lg">
           <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <ArrowRightLeft size={24} />
            </div>
            <div>
              <p className="text-emerald-100 text-sm">Son 30 Gün İşlem</p>
              <h3 className="text-2xl font-bold">{totalTransactions}</h3>
            </div>
          </div>
          <div className="text-sm text-emerald-100">Bekleyen onay bulunmuyor</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
         <h3 className="font-bold text-lg text-slate-800 mb-4">Rol ve Yetki Matrisi Özeti</h3>
         <div className="overflow-x-auto">
           <table className="w-full text-sm text-left">
             <thead className="bg-slate-50 text-slate-500 font-medium">
               <tr>
                 <th className="p-3">Rol Adı</th>
                 {PERMISSIONS_LIST.map(p => (
                   <th key={p.key} className="p-3 text-center">{p.label.split(' ')[0]}...</th>
                 ))}
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {roles.map(role => (
                 <tr key={role.id}>
                   <td className="p-3 font-medium text-slate-700">{role.name}</td>
                   {PERMISSIONS_LIST.map(p => (
                     <td key={p.key} className="p-3 text-center">
                       {role.permissions.includes(p.key) 
                         ? <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                         : <span className="inline-block w-2 h-2 rounded-full bg-slate-200"></span>
                       }
                     </td>
                   ))}
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
      </div>
    </div>
  );
};

