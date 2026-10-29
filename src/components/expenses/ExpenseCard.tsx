import React from 'react';
import { CheckSquare, Square } from 'lucide-react';
import { Expense, Person } from '../../types';
import { CategoryIcon, getCategoryBgColor } from '../common/CategoryIcon';
import { useApp } from '../../context/AppContext';

interface Props {
  expense: Expense;
  members: Person[];
  currency: string;
  onClick: () => void;
  onToggleSettled?: (expense: Expense) => void;
  isArchivedWeek?: boolean;
}

export const ExpenseCard: React.FC<Props> = ({
  expense,
  members,
  currency,
  onClick,
  onToggleSettled,
  isArchivedWeek = false
}) => {
  const { addOrUpdateExpense, showToast } = useApp();

  const payer = members.find((m) => m.id === expense.paidBy);
  const payerName = payer ? payer.name : 'Unknown';

  const isManuallySettled = !!expense.isSettled;
  const isEffectivelySettled = isManuallySettled || isArchivedWeek;

  const handleSettledClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isArchivedWeek) return; // Closed week expenses are archived

    if (onToggleSettled) {
      onToggleSettled(expense);
    } else {
      const nextSettled = !expense.isSettled;
      const updated = { ...expense, isSettled: nextSettled };
      addOrUpdateExpense(updated);
      if (nextSettled) {
        showToast(`Marked "${expense.description}" as settled mid-way (excluded from debt accounting)`);
      } else {
        showToast(`Re-included "${expense.description}" into weekly settlement calculations`, 'info');
      }
    }
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
        isEffectivelySettled
          ? 'border-slate-200/80 dark:border-slate-800 opacity-60 hover:opacity-85'
          : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md'
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Category Icon Badge */}
        <div className={`p-3 rounded-xl shrink-0 ${getCategoryBgColor(expense.category)}`}>
          <CategoryIcon category={expense.category} className="w-5 h-5" />
        </div>

        {/* Title and details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {expense.description}
            </h4>

            {/* ONLY display "✓ Settled Mid-Way" badge if manually checked as settled mid-way! */}
            {isManuallySettled ? (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-md border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
                ✓ Settled Mid-Way
              </span>
            ) : expense.type === 'itemized' ? (
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-md border border-indigo-200/50 dark:border-indigo-800/50 shrink-0">
                Itemized ({expense.items?.length || 0} items)
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>
              Paid by <strong className="font-semibold text-slate-700 dark:text-slate-300">{payerName}</strong>
            </span>
            <span>•</span>
            <span>
              {expense.type === 'simple'
                ? `${expense.participants.length} people`
                : `${expense.items?.length || 0} items`}
            </span>
          </div>
        </div>
      </div>

      {/* Right side: Amount & Settled Button */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {currency}{expense.totalAmount.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Settled Checkbox / Button */}
        <button
          type="button"
          onClick={handleSettledClick}
          disabled={isArchivedWeek}
          title={isEffectivelySettled ? "Settled" : "Click to mark as settled mid-way"}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
            isEffectivelySettled
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-800'
              : 'bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950/40 opacity-80 hover:opacity-100'
          }`}
        >
          {isEffectivelySettled ? (
            <>
              <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Settled</span>
            </>
          ) : (
            <>
              <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Settled?</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
