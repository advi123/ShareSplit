import React from 'react';
import { Trash2, Edit2, CheckSquare, Square } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { CategoryIcon, getCategoryBgColor } from '../common/CategoryIcon';
import { calculateSingleExpenseShares, calculateExpensePayments } from '../../services/settlementEngine';

export const ExpenseDetailModal: React.FC = () => {
  const { activeModal, closeModal, selectedExpense, members, settings, deleteExpense, openModal, addOrUpdateExpense, showToast } = useApp();
  const [isDeleting, setIsDeleting] = React.useState(false);

  if (activeModal !== 'expense-detail' || !selectedExpense) return null;

  const currency = settings.currency;
  const payments = calculateExpensePayments(selectedExpense);
  const shares = calculateSingleExpenseShares(selectedExpense);

  const payersList = Object.entries(payments)
    .filter(([_, amt]) => amt > 0)
    .map(([pId, amt]) => {
      const m = members.find((mem) => mem.id === pId);
      return `${m ? m.name : 'Unknown'} (${currency}${amt.toFixed(2)})`;
    });

  const payerText = payersList.length > 0 ? payersList.join(', ') : 'Unknown';

  const isCustomOrUnequal = selectedExpense.splitType === 'custom' || selectedExpense.type === 'custom' || !!selectedExpense.customShares;

  const handleToggleSettledInModal = () => {
    const nextSettled = !selectedExpense.isSettled;
    const updated = { ...selectedExpense, isSettled: nextSettled };
    addOrUpdateExpense(updated);
    if (nextSettled) {
      showToast(`Marked "${selectedExpense.description}" as settled mid-way (excluded from debt accounting)`);
    } else {
      showToast(`Re-included "${selectedExpense.description}" into weekly settlement calculations`, 'info');
    }
  };

  return (
    <Modal
      isOpen={activeModal === 'expense-detail'}
      onClose={closeModal}
      title="Expense Details"
      subtitle={`Recorded on ${selectedExpense.date}`}
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Settled Alert Banner */}
        {selectedExpense.isSettled && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between">
            <span>✓ Settled Mid-Way: Excluded from weekly debt accounting.</span>
          </div>
        )}

        {/* Header Summary Box */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${getCategoryBgColor(selectedExpense.category)}`}>
              <CategoryIcon category={selectedExpense.category} className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {selectedExpense.description}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Paid by <strong className="text-slate-700 dark:text-slate-200">{payerText}</strong> ({selectedExpense.category})
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Total</span>
            <div className="text-xl font-black text-slate-900 dark:text-slate-100">
              {currency}{selectedExpense.totalAmount.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Expense Shares & Net Contribution Breakdown */}
        {selectedExpense.type !== 'itemized' && (
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
              Participant Shares ({isCustomOrUnequal ? 'Custom Split' : 'Equal Split'})
            </h5>
            <div className="space-y-2">
              {members.map((member) => {
                const pId = member.id;
                const paidVal = payments[pId] || 0;
                const shareVal = shares[pId] || 0;
                if (paidVal <= 0 && shareVal <= 0 && !selectedExpense.participants.includes(pId)) {
                  return null;
                }

                const netVal = Number((paidVal - shareVal).toFixed(2));

                return (
                  <div
                    key={pId}
                    className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center border border-slate-200 dark:border-slate-700">
                        {member.avatar || member.name.slice(0, 1)}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {member.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Paid: {currency}{paidVal.toFixed(2)} | Share: {currency}{shareVal.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {selectedExpense.isSettled ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 font-medium">
                          Settled Mid-Way
                        </span>
                      ) : netVal > 0.009 ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                          Gets back {currency}{netVal.toFixed(2)}
                        </span>
                      ) : netVal < -0.009 ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold">
                          Owes {currency}{Math.abs(netVal).toFixed(2)}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-bold">
                          Settled
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Itemized Expense Breakdown */}
        {selectedExpense.type === 'itemized' && selectedExpense.items && (
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
              Itemized Items ({selectedExpense.items.length})
            </h5>
            <div className="space-y-2.5">
              {selectedExpense.items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {item.name}
                    </span>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                      {currency}{item.amount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>
                      Shared by:{' '}
                      <strong className="text-slate-700 dark:text-slate-300">
                        {item.participants
                          .map((pId) => {
                            const m = members.find((mem) => mem.id === pId);
                            return m ? m.name : 'Unknown';
                          })
                          .join(', ')}
                      </strong>
                    </span>
                    <span>
                      ({currency}{(item.amount / item.participants.length).toFixed(2)} each)
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total per person calculation summary */}
            <div className="mt-4 p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/50 space-y-2">
              <h6 className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
                Calculated Individual Totals
              </h6>
              {members.map((m) => {
                const totalPersonShare = shares[m.id] || 0;
                if (totalPersonShare <= 0) return null;
                return (
                  <div key={m.id} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {m.name}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {currency}{totalPersonShare.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Expense Actions */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleToggleSettledInModal}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-colors border ${
                selectedExpense.isSettled
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
              }`}
            >
              {selectedExpense.isSettled ? <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Square className="w-4 h-4 text-slate-400" />}
              <span>{selectedExpense.isSettled ? 'Settled Mid-Way' : 'Mark as Settled'}</span>
            </button>
            <button
              onClick={() => openModal('edit-expense', selectedExpense)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/60 rounded-xl transition-colors border border-brand-200/60 dark:border-brand-800/60"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit</span>
            </button>
            <button
              disabled={isDeleting}
              onClick={async () => {
                if (isDeleting) return;
                setIsDeleting(true);
                try {
                  await deleteExpense(selectedExpense.id);
                } finally {
                  setIsDeleting(false);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
            </button>
          </div>
          <button
            onClick={closeModal}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};
