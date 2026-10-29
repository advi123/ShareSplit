import React, { useState } from 'react';
import { Archive, Calendar, ShieldCheck, CheckCircle2, Plus, Sliders } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateNetBalances, simplifyDebts } from '../services/settlementEngine';
import { SettlementTransactionCard } from '../components/settlement/SettlementTransactionCard';
import { CustomSettlementCard } from '../components/settlement/CustomSettlementCard';
import { EmptyState } from '../components/common/EmptyState';

export const WeeklySettlementView: React.FC = () => {
  const { expenses, members, currentWeek, settings, openModal } = useApp();

  const [activeTab, setActiveTab] = useState<'weekly' | 'custom'>('weekly');

  const currency = settings.currency;
  const weekExpenses = expenses.filter((e) => e.weekId === currentWeek.id || !e.weekId);

  const totalSpentThisWeek = weekExpenses.reduce((sum, e) => sum + e.totalAmount, 0);

  const netBalancesMap = calculateNetBalances(weekExpenses, members);
  const netBalancesNumeric: Record<string, number> = {};
  Object.entries(netBalancesMap).forEach(([pId, val]) => {
    netBalancesNumeric[pId] = val.netBalance;
  });

  const finalSimplifiedTransactions = simplifyDebts(netBalancesNumeric, weekExpenses, members);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      {/* Top Header & Tab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            SETTLEMENT CALCULATOR
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Calculate net settlement positions for current week or custom date range
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-850 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'weekly'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Active Week</span>
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'custom'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Custom Date Range</span>
          </button>
        </div>
      </div>

      {/* Render Active Tab Content */}
      {activeTab === 'custom' ? (
        <CustomSettlementCard />
      ) : (
        /* Weekly Settlement Content */
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300 rounded-md">
                  Active Week Settlement
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{currentWeek.startDate} – {currentWeek.endDate}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => openModal('add-expense')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-900 dark:text-slate-100 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors"
              >
                <Plus className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <span>Add Expense</span>
              </button>

              <button
                onClick={() => openModal('close-week')}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 font-bold text-xs rounded-xl shadow-2xs transition-all active:scale-[0.98]"
              >
                <Archive className="w-4 h-4" />
                <span>Close Week</span>
              </button>
            </div>
          </div>

          {weekExpenses.length === 0 ? (
            <EmptyState
              title="No expenses recorded this week."
              description="Start tracking expenses for this week by adding a manual expense or uploading a bill receipt."
              actionText="+ Add Expense"
              onAction={() => openModal('add-expense')}
            />
          ) : (
            <>
              {/* Top Banner Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Total Weekly Expenses
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-1">
                    {currency}{totalSpentThisWeek.toLocaleString('en-IN')}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Sum of {weekExpenses.length} week expenses</p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Settlement Status
                  </span>
                  <div className="text-xl font-bold text-brand-600 dark:text-brand-400 tracking-tight mt-1 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-brand-500" />
                    <span>Recalculated Net</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Recalculated from all week expenses</p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Final Transactions
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-1">
                    {finalSimplifiedTransactions.length} Required
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Simplified minimum debt transfers</p>
                </div>
              </div>

              {/* Member Contributions vs Shares Breakdown */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Weekly Member Contributions & Burden Analysis
                </h3>

                <div className="space-y-3">
                  {members.map((m) => {
                    const bd = netBalancesMap[m.id] || { totalPaid: 0, totalShare: 0, netBalance: 0 };
                    return (
                      <div
                        key={m.id}
                        className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 items-center"
                      >
                        <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {m.name}
                        </div>
                        <div className="text-xs">
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">Paid</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {currency}{bd.totalPaid.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-xs">
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">Share</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {currency}{bd.totalShare.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-xs text-right sm:text-left">
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">Net Position</span>
                          <span
                            className={`font-black text-xs ${
                              bd.netBalance > 0.01
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : bd.netBalance < -0.01
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-500'
                            }`}
                          >
                            {bd.netBalance > 0.01
                              ? `+${currency}${bd.netBalance.toFixed(2)} (Receives)`
                              : bd.netBalance < -0.01
                              ? `-${currency}${Math.abs(bd.netBalance).toFixed(2)} (Owes)`
                              : 'Settled'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* FINAL SETTLEMENT */}
              <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                  <div>
                    <span className="text-xs font-black uppercase tracking-widest text-brand-400">
                      FINAL WEEKLY NET SETTLEMENT
                    </span>
                    <h3 className="text-xl font-bold text-white mt-1">
                      Minimum Necessary Debt Settlement
                    </h3>
                  </div>
                </div>

                {finalSimplifiedTransactions.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <h4 className="text-base font-bold text-emerald-200">Group is 100% Settled</h4>
                    <p className="text-xs text-emerald-300">
                      All member contributions equal their share burden. No payments needed!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {finalSimplifiedTransactions.map((tx) => {
                      const debtor = members.find((m) => m.id === tx.from);
                      const creditor = members.find((m) => m.id === tx.to);

                      const debtorName = debtor ? debtor.name : 'Unknown';
                      const creditorName = creditor ? creditor.name : 'Unknown';

                      return (
                        <div
                          key={tx.id}
                          className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md"
                        >
                          <div className="flex items-center gap-3 text-base font-extrabold">
                            <span className="text-white bg-slate-700 px-3 py-1.5 rounded-xl">
                              {debtorName}
                            </span>
                            <span className="text-brand-400 text-sm">PAYS →</span>
                            <span className="text-white bg-slate-700 px-3 py-1.5 rounded-xl">
                              {creditorName}
                            </span>
                          </div>

                          <div className="text-2xl font-black text-brand-400 tracking-tight flex items-baseline gap-1.5">
                            <span>{currency}{Math.round(tx.amount).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => openModal('close-week')}
                    className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95"
                  >
                    <Archive className="w-4 h-4 text-slate-700" />
                    <span>Close & Archive This Week</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
