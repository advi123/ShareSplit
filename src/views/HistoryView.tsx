import React, { useState, useMemo } from 'react';
import { History, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Week } from '../types';
import { EmptyState } from '../components/common/EmptyState';
import { calculateNetBalances, simplifyDebts } from '../services/settlementEngine';
import { ExpenseCard } from '../components/expenses/ExpenseCard';

export const HistoryView: React.FC = () => {
  const { historicalWeeks, currentWeek, members, settings, expenses, openModal } = useApp();

  const [expandedWeekId, setExpandedWeekId] = useState<string | null>(null);

  const currency = settings.currency;

  // Combine current active week and historical weeks sorted descending by startDate
  const allWeeks = useMemo(() => {
    const list: Week[] = [];
    if (currentWeek && currentWeek.id) {
      list.push(currentWeek);
    }
    historicalWeeks.forEach((hw) => {
      if (!list.some((w) => w.id === hw.id)) {
        list.push(hw);
      }
    });
    return list.sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [currentWeek, historicalWeeks]);

  const toggleExpand = (id: string) => {
    setExpandedWeekId((prev) => (prev === id ? null : id));
  };

  const getMemberName = (id: string) => {
    const m = members.find((mem) => mem.id === id);
    return m ? m.name : 'Unknown';
  };

  const formatClosedDate = (dateStr: string) => {
    if (!dateStr) return 'Archive';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
    }
    return dateStr;
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          Weekly Settlement History
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Archived weekly settlements, contribution shares, and net transaction records
        </p>
      </div>

      {allWeeks.length === 0 ? (
        <EmptyState
          title="No archived weeks yet"
          description="Closed weeks will automatically appear here once you complete a weekly settlement."
          icon={<History className="w-6 h-6" />}
        />
      ) : (
        <div className="space-y-4">
          {allWeeks.map((week: Week) => {
            const isCurrent = week.id === currentWeek.id;
            const isPastActive = !isCurrent && week.status === 'active';
            const isExpanded = expandedWeekId === week.id;
            const weekExp = expenses.filter((e) => e.weekId === week.id);

            // Compute dynamic weekly settlement values on the fly for history display
            const netBalancesMap = calculateNetBalances(weekExp, members, true);
            const netBalancesNumeric: Record<string, number> = {};
            Object.entries(netBalancesMap).forEach(([pId, val]) => {
              netBalancesNumeric[pId] = val.netBalance;
            });
            const computedTransactions = simplifyDebts(netBalancesNumeric, weekExp, members, true);

            return (
              <div
                key={week.id}
                className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden shadow-2xs transition-all ${
                  isCurrent
                    ? 'border-indigo-300/80 dark:border-indigo-800/80 ring-1 ring-indigo-400/20'
                    : isPastActive
                    ? 'border-amber-300/80 dark:border-amber-800/80 ring-1 ring-amber-400/20'
                    : 'border-slate-200/90 dark:border-slate-800'
                }`}
              >
                {/* Week Header Row */}
                <div
                  onClick={() => toggleExpand(week.id)}
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors flex-wrap gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${
                      isCurrent
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                        : isPastActive
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}>
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          Week: {week.startDate} – {week.endDate}
                        </h4>
                        {isCurrent ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 rounded-md border border-indigo-200 dark:border-indigo-800">
                            Current Active Week
                          </span>
                        ) : isPastActive ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-md border border-amber-200 dark:border-amber-800">
                              Unclosed (Active)
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openModal('confirm-past-week-settled', week);
                              }}
                              className="px-2.5 py-0.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs transition-transform hover:scale-[1.02]"
                            >
                              Settle & Close
                            </button>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-md border border-emerald-200 dark:border-emerald-800">
                            Settled & Archived
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {isCurrent
                          ? `In Progress (${week.startDate} to ${week.endDate})`
                          : isPastActive
                          ? `Ended on ${formatClosedDate(week.endDate)} · Settlement Pending`
                          : `Closed on ${formatClosedDate(week.endDate)}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Total Spent</span>
                      <div className="text-base font-black text-slate-900 dark:text-slate-100">
                        {currency}{(week.totalSpent || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-5">
                    {/* Final Net Transactions */}
                    <div>
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        {isCurrent ? 'Current Pairwise Debts & Settlements' : 'Final Settlement Transactions Executed'}
                      </h5>
                      {computedTransactions.length > 0 ? (
                        <div className="space-y-2">
                          {computedTransactions.map((tx) => (
                            <div
                              key={tx.id}
                              className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs"
                            >
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {getMemberName(tx.from)} → {getMemberName(tx.to)}
                              </span>
                              <span className="font-bold text-brand-600 dark:text-brand-400 flex items-baseline gap-1">
                                <span>{currency}{Math.round(tx.amount).toLocaleString('en-IN')}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">No transactions required for this week.</p>
                      )}
                    </div>

                    {/* Member Net Balances */}
                    <div>
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        {isCurrent ? 'Current Member Net Balances' : 'Final Member Net Balances'}
                      </h5>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {members
                          .filter((m) => {
                            const bd = netBalancesMap[m.id];
                            return bd && (bd.totalPaid > 0 || bd.totalShare > 0 || Math.abs(bd.netBalance) > 0.005);
                          })
                          .map((m) => {
                            const bd = netBalancesMap[m.id];
                            const bal = bd.netBalance;
                            return (
                              <div
                                key={m.id}
                                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-xs"
                              >
                                <div className="text-slate-500 text-[10px] font-medium">{m.name}</div>
                                <div
                                  className={`font-bold ${
                                    bal > 0.01 ? 'text-emerald-600' : bal < -0.01 ? 'text-rose-600' : 'text-slate-500'
                                  }`}
                                >
                                  {bal > 0.01 ? `+${currency}${bal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : `${currency}${bal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Expense Log */}
                    {weekExp.length > 0 && (
                      <div>
                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                          {isCurrent ? `Current Week Expense Log (${weekExp.length})` : isPastActive ? `Past Week Expense Log (${weekExp.length})` : `Archived Expense Log (${weekExp.length})`}
                        </h5>
                        <div className="space-y-2">
                          {weekExp.map((exp) => (
                            <ExpenseCard
                              key={exp.id}
                              expense={exp}
                              members={members}
                              currency={currency}
                              onClick={() => openModal('expense-detail', exp)}
                              isArchivedWeek={!isCurrent && !isPastActive}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
