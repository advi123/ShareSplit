import React from 'react';
import { AlertTriangle, Lock, Unlock } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';

export const ReopenWeekModal: React.FC = () => {
  const {
    activeModal,
    closeModal,
    pendingReopen,
    confirmReopenAndAddExpense,
    cancelReopenExpense
  } = useApp();

  if (activeModal !== 'reopen-week-warning' || !pendingReopen) return null;

  const { expense, week } = pendingReopen;

  return (
    <Modal
      isOpen={activeModal === 'reopen-week-warning'}
      onClose={cancelReopenExpense}
      title="Date Belongs to a Closed Week"
      subtitle={`Selected date (${expense.date}) falls into closed week ${week.startDate} – ${week.endDate}`}
      maxWidth="md"
    >
      <div className="space-y-5">
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs leading-relaxed flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Reopen Week Confirmation:</strong> This week was previously closed and settled. Adding a new expense will reopen the week's accounts and recalculate member settlement balances.
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Lock className="w-4 h-4 text-amber-500" />
            <span>Target Week: {week.startDate} to {week.endDate}</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Expense: "{expense.description}" ({expense.category}) • Total: {expense.totalAmount}
          </p>
        </div>

        <div className="pt-2 flex justify-end gap-3">
          <button
            onClick={cancelReopenExpense}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
          >
            Cancel
          </button>

          <button
            onClick={confirmReopenAndAddExpense}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm"
          >
            <Unlock className="w-4 h-4" />
            <span>Reopen Week and Add Expense</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
