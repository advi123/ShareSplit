import React, { useState } from 'react';
import { Calendar, Info, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateNetBalances, simplifyDebts } from '../services/settlementEngine';
import { SettlementTransactionCard } from '../components/settlement/SettlementTransactionCard';
import { ExpenseCard } from '../components/expenses/ExpenseCard';
import { EmptyState } from '../components/common/EmptyState';
import { getTodayStr } from '../utils/dateUtils';

export const DailySettlementView: React.FC = () => {
  const { expenses, members, settings, openModal } = useApp();

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());

  const currency = settings.currency;
  const todayStr = getTodayStr();

  // Filter expenses for selected date (includes manual, single bills, and batch bills)
  const dayExpenses = expenses.filter((e) => e.date === selectedDate);
  const dayTotal = dayExpenses.reduce((sum, e) => sum + e.totalAmount, 0);

  // Compute daily breakdown
  const dayNetBalancesMap = calculateNetBalances(dayExpenses, members);
  const dayNetBalancesNumeric: Record<string, number> = {};
  Object.entries(dayNetBalancesMap).forEach(([pId, val]) => {
    dayNetBalancesNumeric[pId] = val.netBalance;
  });

  const dayTransactions = simplifyDebts(dayNetBalancesNumeric, dayExpenses, members);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header & Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Daily Settlement Position
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Analyze daily payments, individual shares, and net daily position for all manual & bill expenses
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Date picker */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-2xs">
            <Calendar className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
            <input
              type="date"
              max={todayStr}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </div>

          <button
            onClick={() => openModal('add-expense')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-900 dark:text-slate-100 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Informational Banner */}
      <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <strong>Informational Daily Position:</strong> Shows "If we settled today, who would pay whom and how much?". Does <em>not</em> lock the week. Users can continue adding expenses freely.
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Spent on {selectedDate}
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-1">
            {currency}{dayTotal.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{dayExpenses.length} expense(s) on this date</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Transactions Needed
          </span>
          <div className="text-2xl font-black text-brand-600 dark:text-brand-400 tracking-tight mt-1">
            {dayTransactions.length} Transfer(s)
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Simplified daily settlement</p>
        </div>
      </div>

      {/* Detailed Breakdown Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payments Made Today */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Today's Member Payments (Who Paid)
          </h3>
          <div className="space-y-2">
            {members.map((m) => {
              const bd = dayNetBalancesMap[m.id] || { totalPaid: 0 };
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800"
                >
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {m.name}
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {currency}{bd.totalPaid.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Individual Shares Today */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Today's Member Shares Incurred
          </h3>
          <div className="space-y-2">
            {members.map((m) => {
              const bd = dayNetBalancesMap[m.id] || { totalShare: 0 };
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800"
                >
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {m.name}
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {currency}{bd.totalShare.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Net Daily Settlement Transactions Card */}
      <SettlementTransactionCard
        transactions={dayTransactions}
        members={members}
        currency={currency}
        title={`Net Daily Settlement for ${selectedDate}`}
        subtitle="Simplified settlement if group closed today's accounts"
      />

      {/* Today's Expenses List */}
      <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
          Expenses Recorded on {selectedDate} ({dayExpenses.length})
        </h3>
        {dayExpenses.length === 0 ? (
          <EmptyState
            title="No expenses recorded for this day."
            description="Add your first manual or receipt expense for this date."
            actionText="+ Add Expense"
            onAction={() => openModal('add-expense')}
          />
        ) : (
          <div className="space-y-2.5">
            {dayExpenses.map((exp) => (
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
    </div>
  );
};
