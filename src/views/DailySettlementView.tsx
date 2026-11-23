import React, { useState } from 'react';
import { Calendar, Info, Plus, Share2, Download, Camera } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateNetBalances, simplifyDebts } from '../services/settlementEngine';
import { SettlementTransactionCard } from '../components/settlement/SettlementTransactionCard';
import { ExpenseCard } from '../components/expenses/ExpenseCard';
import { EmptyState } from '../components/common/EmptyState';
import { getTodayStr } from '../utils/dateUtils';
import {
  shareOrDownloadReceipt,
  downloadReceiptImage,
  openWhatsApp
} from '../utils/shareSettlementReceipt';

export const DailySettlementView: React.FC = () => {
  const { expenses, members, settings, openModal, showToast } = useApp();

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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

  const handleShareDailyWhatsApp = () => {
    const groupName = settings.groupName || 'Flat';
    const lines = [
      `📅 *Daily Settlement: ${groupName} (${selectedDate})*`,
      `💰 *Total Spent Today:* ${currency}${dayTotal.toLocaleString('en-IN')} (${dayExpenses.length} expenses)`,
      '',
      `📋 *Who Pays Whom (Settlement):*`
    ];

    if (dayTransactions.length === 0) {
      lines.push('🎉 All settled! Everyone is completely even.');
    } else {
      const debtorMap = new Map<string, { debtorName: string; debts: { toName: string; amount: number }[]; total: number }>();
      dayTransactions.forEach((tx) => {
        const debtor = members.find((m) => m.id === tx.from);
        const creditor = members.find((m) => m.id === tx.to);
        const debtorName = debtor?.name || 'Someone';
        const toName = creditor?.name || 'Someone';
        if (!debtorMap.has(tx.from)) {
          debtorMap.set(tx.from, { debtorName, debts: [], total: 0 });
        }
        const entry = debtorMap.get(tx.from)!;
        entry.debts.push({ toName, amount: tx.amount });
        entry.total += tx.amount;
      });

      Array.from(debtorMap.values()).sort((a, b) => a.debtorName.localeCompare(b.debtorName)).forEach((entry) => {
        lines.push(`👤 *${entry.debtorName}* (Total to pay: ${currency}${Math.round(entry.total).toLocaleString('en-IN')}):`);
        entry.debts.forEach((d) => {
          lines.push(`  • Pays *${d.toName}*: ${currency}${Math.round(d.amount).toLocaleString('en-IN')}`);
        });
        lines.push('');
      });
    }

    lines.push('Shared via ShareSplit');
    openWhatsApp(lines.join('\n'));
  };

  const handleShareDailyImage = async () => {
    setIsSharing(true);
    const txs = dayTransactions.map((tx) => {
      const debtor = members.find((m) => m.id === tx.from);
      const creditor = members.find((m) => m.id === tx.to);
      return {
        fromName: debtor ? debtor.name : 'Unknown',
        toName: creditor ? creditor.name : 'Unknown',
        amount: tx.amount
      };
    });

    await shareOrDownloadReceipt(
      {
        title: `Daily Settlement: ${selectedDate}`,
        dateRange: `${dayExpenses.length} expenses recorded`,
        currency,
        transactions: txs
      },
      showToast
    );
    setIsSharing(false);
  };

  const handleDownloadDailyImage = async () => {
    setIsDownloading(true);
    const txs = dayTransactions.map((tx) => {
      const debtor = members.find((m) => m.id === tx.from);
      const creditor = members.find((m) => m.id === tx.to);
      return {
        fromName: debtor ? debtor.name : 'Unknown',
        toName: creditor ? creditor.name : 'Unknown',
        amount: tx.amount
      };
    });

    await downloadReceiptImage(
      {
        title: `Daily Settlement: ${selectedDate}`,
        dateRange: `${dayExpenses.length} expenses recorded`,
        currency,
        transactions: txs
      },
      showToast
    );
    setIsDownloading(false);
  };

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
            {members.filter((m) => m.isActive !== false).map((m) => {
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
            {members.filter((m) => m.isActive !== false).map((m) => {
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

      {/* Daily Settlement Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
            Share Daily Settlement ({selectedDate})
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Send screenshot receipt or breakdown directly on WhatsApp
          </p>
        </div>

                <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadDailyImage}
            disabled={isSharing || isDownloading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-xl border border-slate-700 shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Download receipt JPG directly"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>{isDownloading ? 'Saving...' : 'Download JPG'}</span>
          </button>

          <button
            onClick={handleShareDailyImage}
            disabled={isSharing || isDownloading}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Share receipt image directly to WhatsApp or contacts"
          >
            <Share2 className="w-4 h-4" />
            <span>{isSharing ? 'Opening...' : 'Share Image'}</span>
          </button>
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
