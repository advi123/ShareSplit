import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  PlusCircle,
  Upload,
  ChevronRight,
  Receipt,
  History,
  Plane,
  Users,
  ArrowRight,
  Share2,
  CheckCircle2,
  Copy,
  Check,
  DollarSign,
  Download
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateNetBalances, simplifyDebts } from '../services/settlementEngine';
import { ExpenseCard } from '../components/expenses/ExpenseCard';
import { BalanceSummaryCard } from '../components/settlement/BalanceSummaryCard';
import { SettlementTransactionCard } from '../components/settlement/SettlementTransactionCard';
import {
  shareOrDownloadReceipt,
  downloadReceiptImage,
  openWhatsApp
} from '../utils/shareSettlementReceipt';
import { Person } from '../types';

export const DashboardView: React.FC = () => {
  const {
    expenses,
    members,
    currentWeek,
    settings,
    currentGroup,
    openModal,
    setActiveSection,
    showToast
  } = useApp();

  const isTrip = currentGroup?.groupType === 'trip' || settings.groupType === 'trip';
  const currency = settings.currency;
  const activeMembers = members.filter((m) => m.isActive !== false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [isSharingImage, setIsSharingImage] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);

  // -------------------------------------------------------------
  // TRIP MODE CALCULATIONS (Simple Overall Trip Expense Calculator)
  // -------------------------------------------------------------
  const tripExpenses = expenses;
  const totalTripSpent = tripExpenses.reduce((sum, e) => sum + e.totalAmount, 0);
  const perPersonShare = activeMembers.length > 0 ? totalTripSpent / activeMembers.length : 0;

  const tripNetBalancesMap = calculateNetBalances(tripExpenses, members);
  const tripNetNumeric: Record<string, number> = {};
  Object.entries(tripNetBalancesMap).forEach(([pId, val]) => {
    tripNetNumeric[pId] = val.netBalance;
  });

  const tripDebts = simplifyDebts(tripNetNumeric, tripExpenses, members);

  // Group trip debts by debtor (the person who owes)
  const groupedTripDebts = useMemo(() => {
    const map = new Map<
      string,
      {
        payer: Person;
        debts: { to: string; toName: string; amount: number }[];
        total: number;
      }
    >();

    tripDebts.forEach((debt) => {
      const payerMem = members.find((m) => m.id === debt.from) || {
        id: debt.from,
        name: 'Unknown',
        nickname: '',
        color: 'bg-rose-500',
        joinedAt: '',
        isActive: true
      };
      const toMem = members.find((m) => m.id === debt.to);
      const toName = toMem?.name || 'Someone';

      if (!map.has(debt.from)) {
        map.set(debt.from, { payer: payerMem, debts: [], total: 0 });
      }
      const entry = map.get(debt.from)!;
      entry.debts.push({ to: debt.to, toName, amount: debt.amount });
      entry.total += debt.amount;
    });

    return Array.from(map.values()).sort((a, b) => a.payer.name.localeCompare(b.payer.name));
  }, [tripDebts, members]);

  const handleShareTripWhatsApp = () => {
    const tripName = currentGroup?.name || settings.groupName || 'Trip';
    const lines = [
      `✈️ *Trip Settlement: ${tripName}*`,
      `💰 *Total Spent:* ${currency}${totalTripSpent.toLocaleString('en-IN')} (${tripExpenses.length} expenses)`,
      `👥 *Per Person Average:* ${currency}${Math.round(perPersonShare).toLocaleString('en-IN')}`,
      '',
      `📋 *Who Pays Whom (Settlement):*`
    ];

    if (groupedTripDebts.length === 0) {
      lines.push('🎉 All settled! Everyone is completely even.');
    } else {
      groupedTripDebts.forEach((group) => {
        lines.push(`👤 *${group.payer.name}* (Total to pay: ${currency}${group.total.toFixed(2)}):`);
        group.debts.forEach((d) => {
          lines.push(`  • Pays *${d.toName}*: ${currency}${d.amount.toFixed(2)}`);
        });
        lines.push('');
      });
    }

    lines.push('Shared via ShareSplit');
    openWhatsApp(lines.join('\n'));
  };

  const handleCopyTripSummary = () => {
    const tripName = currentGroup?.name || settings.groupName || 'Trip';
    const lines = [
      `✈️ Trip Settlement: ${tripName}`,
      `Total Spent: ${currency}${totalTripSpent.toLocaleString('en-IN')}`,
      `Per Person Average: ${currency}${Math.round(perPersonShare).toLocaleString('en-IN')}`,
      '',
      `Settlement:`
    ];

    if (groupedTripDebts.length === 0) {
      lines.push('All settled! Everyone is even.');
    } else {
      groupedTripDebts.forEach((group) => {
        lines.push(`${group.payer.name} (Total to pay: ${currency}${group.total.toFixed(2)}):`);
        group.debts.forEach((d) => {
          lines.push(`  • Pays ${d.toName}: ${currency}${d.amount.toFixed(2)}`);
        });
      });
    }

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedSummary(true);
    showToast('Trip settlement summary copied!', 'success');
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handleShareTripImage = async () => {
    setIsSharingImage(true);
    const tripName = currentGroup?.name || settings.groupName || 'Trip';
    const txs: { fromName: string; toName: string; amount: number }[] = [];
    groupedTripDebts.forEach((group) => {
      group.debts.forEach((d) => {
        txs.push({
          fromName: group.payer.name,
          toName: d.toName,
          amount: d.amount
        });
      });
    });

    await shareOrDownloadReceipt(
      {
        title: `Trip Settlement: ${tripName}`,
        dateRange: `${tripExpenses.length} trip expenses`,
        currency,
        transactions: txs
      },
      showToast
    );
    setIsSharingImage(false);
  };

  const handleDownloadTripImage = async () => {
    setIsDownloadingImage(true);
    const tripName = currentGroup?.name || settings.groupName || 'Trip';
    const txs: { fromName: string; toName: string; amount: number }[] = [];
    groupedTripDebts.forEach((group) => {
      group.debts.forEach((d) => {
        txs.push({
          fromName: group.payer.name,
          toName: d.toName,
          amount: d.amount
        });
      });
    });

    await downloadReceiptImage(
      {
        title: `Trip Settlement: ${tripName}`,
        dateRange: `${tripExpenses.length} trip expenses`,
        currency,
        transactions: txs
      },
      showToast
    );
    setIsDownloadingImage(false);
  };

  // -------------------------------------------------------------
  // HOME / FLAT MODE CALCULATIONS
  // -------------------------------------------------------------

  const formatDateRange = (start: string, end: string) => {
    if (!start || !end) return 'Current Week';
    try {
      const s = new Date(start);
      const e = new Date(end);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return 'Current Week';
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

  const handleShareWeeklyWhatsApp = () => {
    const groupName = currentGroup?.name || settings.groupName || 'Flat';
    const lines = [
      `🏠 *Weekly Settlement: ${groupName}*`,
      `📅 *Period:* ${currentWeek.startDate} to ${currentWeek.endDate}`,
      `💰 *Total Spent:* ${currency}${totalSpentThisWeek.toLocaleString('en-IN')}`,
      '',
      `📋 *Who Pays Whom (Settlement):*`
    ];

    if (simplifiedWeeklyTransactions.length === 0) {
      lines.push('🎉 All settled! Everyone is completely even.');
    } else {
      const debtorMap = new Map<string, { debtorName: string; debts: { toName: string; amount: number }[]; total: number }>();
      simplifiedWeeklyTransactions.forEach((tx) => {
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

  const handleShareWeeklyImage = async () => {
    const txs = simplifiedWeeklyTransactions.map((tx) => {
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
        title: 'Weekly Net Settlement',
        dateRange: `${currentWeek.startDate} to ${currentWeek.endDate}`,
        currency,
        transactions: txs
      },
      showToast
    );
  };

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

  // -------------------------------------------------------------
  // RENDER: STREAMLINED TRIP CALCULATOR VIEW
  // -------------------------------------------------------------
  if (isTrip) {
    return (
      <div className="space-y-6 pb-12 animate-in fade-in duration-300">
        {/* Trip Top Header Banner */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 text-[11px] font-bold">
                <Plane className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Trip Expense Calculator</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800">
                ✈️ Trip
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              {currentGroup?.name || settings.groupName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Simple vacation split • {activeMembers.length} members • {tripExpenses.length} total expenses
            </p>
          </div>

          <div className="flex items-center">
            <button
              onClick={() => openModal('add-expense')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 font-bold text-xs rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Trip Expense</span>
            </button>
          </div>
        </div>

        {/* 3-Column Quick Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Trip Spent
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {currency}{totalTripSpent.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Across all {tripExpenses.length} trip expenses
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Average Per Person
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {currency}{Math.round(perPersonShare).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Split equally among {activeMembers.length} members
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Transfers to Settle
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {tripDebts.length} {tripDebts.length === 1 ? 'Transfer' : 'Transfers'}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {tripDebts.length === 0 ? 'Everyone is even!' : 'Minimum payments needed'}
            </p>
          </div>
        </div>

        {/* TRIP SETTLEMENT: Who Owes Whom (Grouped by Payer) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Trip Settlement (Who Pays Whom)</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Simplified settlement to close out all debts for this trip with minimal transfers
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopyTripSummary}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copiedSummary ? 'Copied' : 'Copy Split'}</span>
              </button>

              <button
                onClick={handleDownloadTripImage}
                disabled={isSharingImage || isDownloadingImage}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-xl border border-slate-700 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Download receipt JPG directly"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>{isDownloadingImage ? 'Saving...' : 'Download JPG'}</span>
              </button>

              <button
                onClick={handleShareTripImage}
                disabled={isSharingImage || isDownloadingImage}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Share settlement receipt image directly to WhatsApp"
              >
                <Share2 className="w-4 h-4" />
                <span>{isSharingImage ? 'Opening...' : 'Share Image'}</span>
              </button>
            </div>
          </div>

          {groupedTripDebts.length === 0 ? (
            <div className="py-8 text-center space-y-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/60">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <div className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                All Settled Up!
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 max-w-sm mx-auto">
                No debts remain for this trip. Everyone is completely even.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {groupedTripDebts.map((group) => (
                <div
                  key={group.payer.id}
                  className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/60 space-y-3 shadow-2xs"
                >
                  {/* Payer Header Row */}
                  <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-extrabold text-xs flex items-center justify-center shrink-0">
                        {group.payer.name.slice(0, 1)}
                      </div>
                      <div>
                        <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                          {group.payer.name}
                        </span>
                        <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/60 uppercase">
                          Owes
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Total To Pay</span>
                      <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                        {currency}{group.total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* List of who this person pays */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {group.debts.map((item, dIdx) => (
                      <div
                        key={`${group.payer.id}-${item.to}-${dIdx}`}
                        className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                            Pays
                          </span>
                          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {item.toName.slice(0, 1)}
                          </div>
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {item.toName}
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {currency}{item.amount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* WHO PAID WHAT & NET POSITIONS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
            Member Positions on this Trip
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeMembers.map((mem) => {
              const pos = tripNetBalancesMap[mem.id] || { totalPaid: 0, totalShare: 0, netBalance: 0 };
              const isPositive = pos.netBalance > 0.01;
              const isNegative = pos.netBalance < -0.01;

              return (
                <div
                  key={mem.id}
                  className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center">
                        {mem.name.slice(0, 1)}
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {mem.name}
                      </span>
                    </div>

                    <span
                      className={`text-xs font-black ${
                        isPositive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isNegative
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {isPositive ? `+${currency}${pos.netBalance.toFixed(2)}` : isNegative ? `-${currency}${Math.abs(pos.netBalance).toFixed(2)}` : 'Even'}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span>Paid: {currency}{pos.totalPaid.toFixed(2)}</span>
                    <span>Share: {currency}{pos.totalShare.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* TRIP EXPENSES LIST */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Trip Expenses ({tripExpenses.length})
            </h3>
            <button
              onClick={() => openModal('add-expense')}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              + Add Expense
            </button>
          </div>

          {tripExpenses.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800">
              <Receipt className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                No expenses added yet for this trip.
              </p>
              <button
                onClick={() => openModal('add-expense')}
                className="mt-3 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Add First Trip Expense
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tripExpenses.map((exp) => (
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
  }

  // -------------------------------------------------------------
  // RENDER: STANDARD HOME / FLAT DASHBOARD VIEW
  // -------------------------------------------------------------
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

        {/* Simplified preview count & Action buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-400">
            Current net result:{' '}
            <strong className="text-white">
              {simplifiedWeeklyTransactions.length} simplified transfer(s) required
            </strong>
          </div>

          <div className="flex flex-wrap items-center gap-2">

            <button
              onClick={() => setActiveSection('history')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 text-slate-200 hover:bg-slate-700 font-bold text-xs rounded-xl transition-colors border border-slate-700 cursor-pointer"
              title="View archived past weeks"
            >
              <History className="w-3.5 h-3.5 text-brand-400" />
              <span>Weekly History</span>
            </button>

            <button
              onClick={() => setActiveSection('weekly-settlement')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
            >
              <span>Settlement</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
