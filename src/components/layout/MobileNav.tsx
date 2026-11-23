import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  FileText,
  PlusCircle,
  CalendarCheck,
  History,
  Users,
  Settings
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NavSection } from '../../types';

export const MobileNav: React.FC = () => {
  const { activeSection, setActiveSection, openModal, currentGroup, settings } = useApp();

  const isTrip = currentGroup?.groupType === 'trip' || settings.groupType === 'trip';

  const homeItems: Array<{ id: NavSection; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Home', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'expenses', label: 'Expenses', icon: <Receipt className="w-4 h-4" /> },
    { id: 'weekly-settlement', label: 'Weekly', icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'history', label: 'History', icon: <History className="w-4 h-4" /> },
    { id: 'bills', label: 'Bills', icon: <FileText className="w-4 h-4" /> },
    { id: 'members', label: 'Members', icon: <Users className="w-4 h-4" /> }
  ];

  const tripItems: Array<{ id: NavSection; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Trip', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'expenses', label: 'Expenses', icon: <Receipt className="w-4 h-4" /> },
    { id: 'members', label: 'Members', icon: <Users className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> }
  ];

  const items = isTrip ? tripItems : homeItems;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-1 py-1.5 shadow-lg">
      <div className="flex items-center justify-between relative max-w-md mx-auto">
        {items.map((item, index) => {
          const isActive = activeSection === item.id;
          const splitIndex = isTrip ? 2 : 3;
          
          if (index === splitIndex) {
            return (
              <React.Fragment key="add-button-mobile">
                <button
                  onClick={() => openModal('add-expense')}
                  className="flex flex-col items-center -mt-5 bg-emerald-600 text-white p-2.5 rounded-full shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 active:scale-95 transition-transform shrink-0 mx-1 cursor-pointer"
                  title="Add Expense"
                >
                  <PlusCircle className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setActiveSection(item.id)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-1 px-1 rounded-xl transition-colors cursor-pointer ${
                    isActive ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {item.icon}
                  <span className="text-[9px] leading-tight">{item.label}</span>
                </button>
              </React.Fragment>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-1 px-1 rounded-xl transition-colors cursor-pointer ${
                isActive ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {item.icon}
              <span className="text-[9px] leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
