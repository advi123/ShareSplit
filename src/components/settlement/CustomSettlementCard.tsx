import React, { useState } from 'react';
import { Calendar, AlertCircle, ArrowRight, Info, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { calculateNetBalances, simplifyDebts } from '../../services/settlementEngine';
import { getTodayStr } from '../../utils/dateUtils';

export const CustomSettlementCard: React.FC = () => {
  const { expenses, members, settings, currentWeek } = useApp();

  const [fromDate, setFromDate] = useState<string>(currentWeek.startDate);
  const [toDate, setToDate] = useState<string>(currentWeek.endDate);

  const currency = settings.currency;

  // Validation
  const isValidRange = fromDate <= toDate;

  // Filter expenses matching selected date range (manual & bill-based)
  const filteredExpenses = isValidRange
    ? expenses.filter((e) => e.date >= fromDate && e.date <= toDate)
    : [];

  const totalPeriodExpenses = filteredExpenses.reduce((sum, e) => sum + e.totalAmount, 0);

  // Settlement calculations
  const netBalancesMap = calculateNetBalances(filteredExpenses, members);
  const netBalancesNumeric: Record<string, number> = {};
  Object.entries(netBalancesMap).forEach(([pId, val]) => {
    netBalancesNumeric[pId] = val.netBalance;
  });

  const simplifiedTransactions = simplifyDebts(netBalancesNumeric, filteredExpenses, members);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Date Range Selector Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <span>Custom Date Range Settlement</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Calculate instant net settlement for any custom date range without creating or closing weeks.
          </p>
        </div>

        {/* Date Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Date Validation Warning */}
        {!isValidRange && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Invalid Date Range: "From Date" cannot be after "To Date".</span>
          </div>
        )}

        {/* Temporary Notice */}
        <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900 flex items-center gap-2 text-xs text-blue-900 dark:text-blue-300">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>Temporary Calculation:</strong> This custom calculation does not affect or close existing weekly accounts.
          </span>
        </div>
      </div>

      {isValidRange && (
        <>
          {/* Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Period Expenses
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-1">
                {currency}{totalPeriodExpenses.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {filteredExpenses.length} expense(s) in selected range
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Date Range
              </span>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-1">
                {fromDate} → {toDate}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Custom range selected</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Transfers Required
              </span>
              <div className="text-2xl font-black text-brand-600 dark:text-brand-400 tracking-tight mt-1">
                {simplifiedTransactions.length} Transfer(s)
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Simplified net position</p>
            </div>
          </div>

          {/* Member Payments & Shares Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Member Contributions & Share Burdens ({fromDate} to {toDate})
            </h4>

            <div className="space-y-2.5">
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
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Paid</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {currency}{bd.totalPaid.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Share</span>
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

          {/* FINAL NET SETTLEMENT CARD (WHO -> WHO -> AMOUNT) */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-brand-400">
                  FINAL NET SETTLEMENT RESULT
                </span>
                <h4 className="text-lg font-bold text-white mt-0.5">
                  Simplified Transfers for {fromDate} → {toDate}
                </h4>
              </div>
            </div>

            {simplifiedTransactions.length === 0 ? (
              <div className="p-6 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h5 className="text-base font-bold text-emerald-200">100% Settled for Selected Range</h5>
                <p className="text-xs text-emerald-300">
                  No debt transfers needed for expenses in this date range.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {simplifiedTransactions.map((tx) => {
                  const debtor = members.find((m) => m.id === tx.from);
                  const creditor = members.find((m) => m.id === tx.to);

                  const debtorName = debtor ? debtor.name : 'Unknown';
                  const creditorName = creditor ? creditor.name : 'Unknown';

                  return (
                    <div
                      key={tx.id}
                      className="p-5 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md"
                    >
                      <div className="flex items-center gap-3 text-base font-extrabold">
                        <span className="text-white bg-slate-700 px-3 py-1.5 rounded-xl">
                          {debtorName}
                        </span>
                        <ArrowRight className="w-5 h-5 text-brand-400 shrink-0" />
                        <span className="text-white bg-slate-700 px-3 py-1.5 rounded-xl">
                          {creditorName}
                        </span>
                      </div>

                      <div className="text-2xl font-black text-brand-400 tracking-tight">
                        {currency}{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
