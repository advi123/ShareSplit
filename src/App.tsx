import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';
import { Toast } from './components/common/Toast';

import { DashboardView } from './views/DashboardView';
import { ExpensesView } from './views/ExpensesView';
import { BillsView } from './views/BillsView';
import { DailySettlementView } from './views/DailySettlementView';
import { WeeklySettlementView } from './views/WeeklySettlementView';
import { HistoryView } from './views/HistoryView';
import { MembersView } from './views/MembersView';
import { SettingsView } from './views/SettingsView';
import { AuthView } from './views/AuthView';

import { AddExpenseModal } from './components/expenses/AddExpenseModal';
import { BillUploadModal } from './components/expenses/BillUploadModal';
import { ExpenseDetailModal } from './components/expenses/ExpenseDetailModal';
import { CloseWeekModal } from './components/settlement/CloseWeekModal';
import { ReopenWeekModal } from './components/settlement/ReopenWeekModal';
import { RemoveMemberConfirmModal } from './components/members/RemoveMemberConfirmModal';
import { ConfirmPastWeekSettledModal } from './components/settlement/ConfirmPastWeekSettledModal';
import { AuthModal } from './components/auth/AuthModal';
import { GroupSwitcherModal } from './components/groups/GroupSwitcherModal';

const MainLayout: React.FC = () => {
  const { activeSection, pendingPastWeekSettlement } = useApp();

  const renderActiveView = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardView />;
      case 'expenses':
        return <ExpensesView />;
      case 'bills':
        return <BillsView />;
      case 'daily-settlement':
        return <DailySettlementView />;
      case 'weekly-settlement':
        return <WeeklySettlementView />;
      case 'history':
        return <HistoryView />;
      case 'members':
        return <MembersView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Desktop Persistent Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        <Header />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderActiveView()}
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Global Modals */}
      <AddExpenseModal />
      <BillUploadModal />
      <ExpenseDetailModal />
      <CloseWeekModal />
      <ReopenWeekModal />
      <RemoveMemberConfirmModal />
      <ConfirmPastWeekSettledModal week={pendingPastWeekSettlement} />
      <AuthModal />
      <GroupSwitcherModal />

      {/* Global Toast Notifications */}
      <Toast />
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, isInitializing } = useApp();

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-200 select-none">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 bg-emerald-500/15 dark:bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-72 sm:w-80 h-72 sm:h-80 bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Card / Icon */}
        <div className="relative z-10 flex flex-col items-center max-w-sm text-center">
          {/* Brand Logo & Wordmark */}
          <div className="relative group mb-3">
            <div className="absolute -inset-2 bg-radial from-emerald-500/40 via-emerald-500/20 to-transparent rounded-3xl blur-lg animate-pulse" />
            <img
              src="/icon.png"
              alt="ShareSplit"
              className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl shadow-2xl object-cover ring-1 ring-slate-900/10 dark:ring-white/10"
            />
          </div>

          <div className="mt-3 flex items-center justify-center">
            <img
              src="/logo-text-light.png"
              alt="ShareSplit"
              className="h-8 sm:h-9 w-auto object-contain dark:hidden"
            />
            <img
              src="/logo-text-dark.png"
              alt="ShareSplit"
              className="h-8 sm:h-9 w-auto object-contain hidden dark:block"
            />
          </div>

          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 max-w-[260px] sm:max-w-xs leading-relaxed">
            Smart Expense Sharing & Minimal Debt Settlement
          </p>

          {/* Smooth animated progress line */}
          <div className="w-44 sm:w-52 h-1.5 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden mt-6 relative shadow-inner">
            <div className="w-1/2 h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 rounded-full animate-loading-bar" />
          </div>

          <div className="flex items-center gap-2 mt-4 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span>Securing your shared expenses...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthView />
        <Toast />
      </>
    );
  }

  return <MainLayout />;
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
