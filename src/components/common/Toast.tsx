import React from 'react';
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Toast: React.FC = () => {
  const { toast } = useApp();

  if (!toast) return null;

  const icon =
    toast.type === 'success' ? (
      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
    ) : toast.type === 'error' ? (
      <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
    ) : (
      <Info className="w-5 h-5 text-blue-500 shrink-0" />
    );

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 text-white dark:bg-slate-800 border border-slate-700 rounded-xl shadow-xl animate-in slide-in-from-bottom-5 duration-300 max-w-md">
      {icon}
      <span className="text-sm font-medium">{toast.message}</span>
    </div>
  );
};
