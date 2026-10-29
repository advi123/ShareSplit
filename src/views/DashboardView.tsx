import React from 'react';
import {
  TrendingUp,
  PlusCircle,
  Upload,
  ChevronRight,
  Receipt
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateNetBalances, simplifyDebts } from '../services/settlementEngine';
import { ExpenseCard } from '../components/expenses/ExpenseCard';
import { BalanceSummaryCard } from '../components/settlement/BalanceSummaryCard';
import { SettlementTransactionCard } from '../components/settlement/SettlementTransactionCard';

export const DashboardView: React.FC = () => {
  const {
    expenses,
    members,
    currentWeek,
    settings,
    openModal,
    setActiveSection
  } = useApp();

  const currency = settings.currency;

  const formatDateRange = (start: string, end: string) => {
    try {
      const s = new Date(start);
      const e = new Date(end);
      const sStr = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const eStr = e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${sStr} – ${eStr}`;
    } catch {
      return `${start} – ${end}`;
    }
  };

  // Current Week Expenses
  const weekExpenses = expenses.filter((e) => e.weekId === currentWeek.id || !e.weekId);

  // Weekly Total Spent
  const totalSpentThisWeek = weekExpenses.reduce((sum, e) => sum + e.totalAmount, 0);

  // Net Balances Breakdown for Current Week
  const netBalancesMap = calculateNetBalances(weekExpenses, members);

  // Extract numeric balances
  const netBalancesNumeric: Record<string, number> = {};
  Object.entries(netBalancesMap).forEach(([pId, val]) => {
    netBalancesNumeric[pId] = val.netBalance;
  });

  const simplifiedWeeklyTransactions = simplifyDebts(netBalancesNumeric, weekExpenses, members);

  // Today's Expenses
  const todayStr = new Date().toISOString().split('T')[0];
  const todayExpenses = weekExpenses.filter((e) => e.date === todayStr);
  const todayTotal = todayExpenses.reduce((sum, e) => sum + e.totalAmount, 0);

  // Today's Settlement calculation
  const todayNetBalancesMap = calculateNetBalances(todayExpenses, members);
  const todayNetBalancesNumeric: Record<string, number> = {};
  Object.entries(todayNetBalancesMap).forEach(([pId, val]) => {
    todayNetBalancesNumeric[pId] = val.netBalance;
  });
  const todayTransactions = simplifyDebts(todayNetBalancesNumeric, todayExpenses, members);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      {/* 1. TOP SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-4">
        {/* Total Spent */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Spent
            </span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {currency}{totalSpentThisWeek.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Current Week ({weekExpenses.length} expenses)
            </p>
          </div>
        </div>
      </div>

      {/* 2. TODAY SECTION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700 dark:bg-slate-300" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                TODAY'S ACTIVITY ({todayStr})
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Today's expenses total:{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {currency}{todayTotal.toLocaleString('en-IN')}
              </strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openModal('add-expense')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-900 dark:text-slate-100 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors"
            >
              <PlusCircle className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <span>Add Expense</span>
            </button>
            <button
              onClick={() => openModal('upload-bill')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl border border-slate-200/80 dark:border-slate-800 transition-colors"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Upload Bill</span>
            </button>
          </div>
        </div>

        {/* Today's Expenses List */}
        {todayExpenses.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800">
            <Receipt className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              No expenses recorded today ({todayStr}).
            </p>
            <button
              onClick={() => openModal('add-expense')}
              className="mt-3 text-xs font-bold text-slate-800 dark:text-slate-200 hover:underline"
            >
              + Add first expense today
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {todayExpenses.map((exp) => (
              <ExpenseCard
                key={exp.id}
                expense={exp}
                members={members}
                currency={currency}
                onClick={() => openModal('expense-detail', exp)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 3. CURRENT BALANCES & TODAY'S SETTLEMENT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BalanceSummaryCard members={members} netBalances={netBalancesNumeric} currency={currency} />

        <div className="space-y-3">
          <SettlementTransactionCard
            transactions={todayTransactions}
            members={members}
            currency={currency}
            title="Today's Position (Daily Net)"
            subtitle="Informational position for today's expenses"
          />
          <div className="flex justify-end">
            <button
              onClick={() => setActiveSection('daily-settlement')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:underline"
            >
              <span>View Full Daily Breakdown</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. WEEKLY SETTLEMENT PREVIEW CARD */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Week Summary & Settlement Preview
            </span>
            <h3 className="text-lg font-bold text-white mt-1">
              {formatDateRange(currentWeek.startDate, currentWeek.endDate)} • {currentWeek.status === 'closed' ? 'Settled & Archived' : 'In Progress'}
            </h3>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Week Expenses</span>
            <div className="text-2xl font-black text-slate-100">
              {currency}{totalSpentThisWeek.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Settlement will be calculated from all expenses recorded this week. All debts will be simplified to the minimum required transactions.
        </p>

        {/* Simplified preview count */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-400">
            Current net result:{' '}
            <strong className="text-white">
              {simplifiedWeeklyTransactions.length} simplified transfer(s) required
            </strong>
          </div>

          <button
            onClick={() => setActiveSection('weekly-settlement')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs rounded-xl shadow-md transition-colors"
          >
            <span>View Weekly Settlement</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
