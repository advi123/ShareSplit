import React, { useState } from 'react';
import { CheckCircle2, Calendar, ArrowRight, HelpCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { Week } from '../../types';
import { calculateNetBalances, simplifyDebts } from '../../services/settlementEngine';

interface Props {
  week: Week | null;
}

export const ConfirmPastWeekSettledModal: React.FC<Props> = ({ week }) => {
  const { activeModal, closeModal, confirmPastWeekSettled, dismissPastWeekSettledPrompt, expenses, members, settings } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (activeModal !== 'confirm-past-week-settled' || !week) return null;

  const currency = settings.currency;
  const weekExpenses = expenses.filter((e) => e.weekId === week.id);
  const unsettledExpenses = weekExpenses.filter((e) => !e.isSettled);

  // Compute remaining simplified transactions for this week
  const netBalancesMap = calculateNetBalances(weekExpenses, members);
  const netBalancesNumeric: Record<string, number> = {};
  Object.entries(netBalancesMap).forEach(([pId, val]) => {
    netBalancesNumeric[pId] = val.netBalance;
  });
  const pendingTransactions = simplifyDebts(netBalancesNumeric, weekExpenses, members);

  const getMemberName = (id: string) => {
    const m = members.find((mem) => mem.id === id);
    return m ? m.name : 'Unknown';
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await confirmPastWeekSettled(week.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    setIsSubmitting(true);
    try {
      await dismissPastWeekSettledPrompt(week.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={activeModal === 'confirm-past-week-settled'}
      onClose={handleDismiss}
      title="Settlement Confirmation"
      subtitle={`Week: ${week.startDate} to ${week.endDate}`}
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/60 dark:to-teal-950/60 border border-emerald-200/80 dark:border-emerald-800 flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-500 text-white shrink-0 mt-0.5 shadow-sm">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
              Did roommates clear and settle debts for the past week?
            </h4>
            <p className="text-xs text-emerald-800 dark:text-emerald-300/90 mt-1 leading-relaxed">
              This past week ({week.startDate} to {week.endDate}) has ended. Marking it as cleared will settle debts and close the week so it will not ask again. If payments are still pending, you can keep it active.
            </p>
          </div>
        </div>

        {/* Pending Transactions Summary */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Recorded Debts for Week ({unsettledExpenses.length} items)
            </span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Total Spent: {currency}{(week.totalSpent || 0).toLocaleString('en-IN')}
            </span>
          </div>

          {pendingTransactions.length > 0 ? (
            <div className="space-y-2">
              {pendingTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                    <span className="font-bold">{getMemberName(tx.from)}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold">{getMemberName(tx.to)}</span>
                  </div>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                    {currency}{Math.round(tx.amount).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-slate-500 italic">
              All expenses in this week were already settled mid-way or net balance is ₹0.
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleDismiss}
            disabled={isSubmitting}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Not Yet (Keep Active)
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all duration-200 hover:scale-[1.02] disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Closing & Settling...' : 'Yes, Cleared & Settled'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
