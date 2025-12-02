import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Unauthorized: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-slate-400">
    <ShieldCheck size={48} className="mb-4 text-slate-300" />
    <h3 className="text-lg font-semibold text-slate-600">Yetkisiz Erişim</h3>
    <p>Bu sayfayı görüntülemek için gerekli izne sahip değilsiniz.</p>
  </div>
);

