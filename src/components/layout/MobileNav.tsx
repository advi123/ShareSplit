import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  FileText,
  PlusCircle,
  CalendarCheck,
  Users
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NavSection } from '../../types';

export const MobileNav: React.FC = () => {
  const { activeSection, setActiveSection, openModal } = useApp();

  const items: Array<{ id: NavSection; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'expenses', label: 'Expenses', icon: <Receipt className="w-5 h-5" /> },
    { id: 'bills', label: 'Bills', icon: <FileText className="w-5 h-5" /> },
    { id: 'weekly-settlement', label: 'Weekly', icon: <CalendarCheck className="w-5 h-5" /> },
    { id: 'members', label: 'Members', icon: <Users className="w-5 h-5" /> }
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3 py-2">
      <div className="flex items-center justify-around relative">
        {items.map((item, index) => {
          const isActive = activeSection === item.id;
          
          if (index === 2) {
            return (
              <React.Fragment key="add-button-mobile">
                <button
                  onClick={() => openModal('add-expense')}
                  className="flex flex-col items-center -mt-6 bg-brand-600 text-white p-3 rounded-full shadow-lg shadow-brand-600/30 hover:bg-brand-700 active:scale-95 transition-transform"
                >
                  <PlusCircle className="w-6 h-6" />
                </button>

                <button
                  onClick={() => setActiveSection(item.id)}
                  className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-colors ${
                    isActive ? 'text-brand-600 dark:text-brand-400 font-bold' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {item.icon}
                  <span className="text-[10px]">{item.label}</span>
                </button>
              </React.Fragment>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-colors ${
                isActive ? 'text-brand-600 dark:text-brand-400 font-bold' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {item.icon}
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
