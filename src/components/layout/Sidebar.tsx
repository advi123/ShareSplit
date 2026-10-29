import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  FileText,
  PlusCircle,
  CalendarDays,
  CalendarCheck,
  History,
  Users,
  Settings,
  Upload,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NavSection } from '../../types';

export const Sidebar: React.FC = () => {
  const { activeSection, setActiveSection, openModal, settings } = useApp();

  const navItems: Array<{ id: NavSection; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'expenses', label: 'Expenses', icon: <Receipt className="w-4 h-4" /> },
    { id: 'bills', label: 'Bills Archive', icon: <FileText className="w-4 h-4" /> },
    { id: 'daily-settlement', label: 'Daily Settlement', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'weekly-settlement', label: 'Weekly Settlement', icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'history', label: 'Weekly History', icon: <History className="w-4 h-4" /> },
    { id: 'members', label: 'Group Members', icon: <Users className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> }
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 min-h-screen shrink-0 sticky top-0 h-screen z-20">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center font-extrabold text-lg shadow-sm">
            S
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              ShareSplit
            </h1>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Group: {settings.groupName}
            </p>
          </div>
        </div>
      </div>

      {/* Clean White / Neutral Action Buttons */}
      <div className="p-4 space-y-2">
        <button
          onClick={() => openModal('add-expense')}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-900 dark:text-slate-100 font-semibold text-xs rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs transition-all active:scale-[0.98]"
        >
          <PlusCircle className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          <span>Add Expense</span>
        </button>
        <button
          onClick={() => openModal('upload-bill')}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl border border-slate-200/80 dark:border-slate-800 transition-all"
        >
          <Upload className="w-4 h-4 text-slate-500" />
          <span>Upload Bill</span>
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Main Menu
        </div>
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold border border-slate-200 dark:border-slate-700 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span className={isActive ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Phase 1 Complete</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
            IndexedDB receipts & dynamic settlement calculations.
          </p>
        </div>
      </div>
    </aside>
  );
};
