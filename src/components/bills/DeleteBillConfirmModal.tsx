import React from 'react';
import { AlertTriangle, Trash2, FileText } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';

export const DeleteBillConfirmModal: React.FC = () => {
  const { activeModal, closeModal, selectedBill, deleteBill } = useApp();

  if (activeModal !== 'delete-bill-confirm' || !selectedBill) return null;

  const handleDeleteBillOnly = () => {
    deleteBill(selectedBill.id, false);
  };

  const handleDeleteBoth = () => {
    deleteBill(selectedBill.id, true);
  };

  return (
    <Modal
      isOpen={activeModal === 'delete-bill-confirm'}
      onClose={closeModal}
      title="Delete Stored Bill?"
      subtitle={`Receipt: ${selectedBill.storeName || selectedBill.fileName}`}
      maxWidth="md"
    >
      <div className="space-y-5">
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs leading-relaxed flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Confirm Deletion Relationship:</strong> This bill image is linked to an expense record in your group log. Choose whether to remove only the image or delete the entire expense.
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={handleDeleteBillOnly}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-slate-500" />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Delete Bill Image Only
                </div>
                <div className="text-[11px] text-slate-400">
                  Keep the financial expense record in group calculations.
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={handleDeleteBoth}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/40 hover:bg-rose-100/60 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-4 h-4 text-rose-600" />
              <div>
                <div className="text-xs font-bold text-rose-700 dark:text-rose-300">
                  Delete Bill & Related Expense
                </div>
                <div className="text-[11px] text-rose-600/80 dark:text-rose-400">
                  Permanently remove both the receipt image and the expense record.
                </div>
              </div>
            </div>
          </button>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={closeModal}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};
