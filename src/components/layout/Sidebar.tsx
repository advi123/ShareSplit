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
  Upload
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NavSection } from '../../types';

export const Sidebar: React.FC = () => {
  const { activeSection, setActiveSection, openModal, settings, currentGroup } = useApp();

  const isTrip = currentGroup?.groupType === 'trip' || settings.groupType === 'trip';

  const homeNavItems: Array<{ id: NavSection; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'expenses', label: 'Expenses', icon: <Receipt className="w-4 h-4" /> },
    { id: 'bills', label: 'Bills Archive', icon: <FileText className="w-4 h-4" /> },
    { id: 'daily-settlement', label: 'Daily Settlement', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'weekly-settlement', label: 'Weekly Settlement', icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'history', label: 'Weekly History', icon: <History className="w-4 h-4" /> },
    { id: 'members', label: 'Group Members', icon: <Users className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> }
  ];

  const tripNavItems: Array<{ id: NavSection; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Trip Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'expenses', label: 'Expenses', icon: <Receipt className="w-4 h-4" /> },
    { id: 'members', label: 'Trip Members', icon: <Users className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> }
  ];

  const navItems = isTrip ? tripNavItems : homeNavItems;

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 min-h-screen shrink-0 sticky top-0 h-screen z-20">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center font-extrabold text-lg shadow-sm">
            {isTrip ? '✈' : 'S'}
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              ShareSplit
            </h1>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <span>{isTrip ? 'Trip:' : 'Flat:'}</span>
              <span className="truncate max-w-[120px]">{currentGroup?.name || settings.groupName}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Clean White / Neutral Action Buttons */}
      <div className="p-4 space-y-2">
        <button
          onClick={() => openModal('add-expense')}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{isTrip ? 'Add Trip Expense' : 'Add Expense'}</span>
        </button>
        {!isTrip && (
          <button
            onClick={() => openModal('upload-bill')}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl border border-slate-200/80 dark:border-slate-800 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Upload Bill</span>
          </button>
        )}
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
    </aside>
  );
};
