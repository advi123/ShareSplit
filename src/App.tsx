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

import { AddExpenseModal } from './components/expenses/AddExpenseModal';
import { BillUploadModal } from './components/expenses/BillUploadModal';
import { ExpenseDetailModal } from './components/expenses/ExpenseDetailModal';
import { CloseWeekModal } from './components/settlement/CloseWeekModal';
import { ReopenWeekModal } from './components/settlement/ReopenWeekModal';
import { RemoveMemberConfirmModal } from './components/members/RemoveMemberConfirmModal';
import { ConfirmPastWeekSettledModal } from './components/settlement/ConfirmPastWeekSettledModal';

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

      {/* Global Toast Notifications */}
      <Toast />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
};

export default App;
