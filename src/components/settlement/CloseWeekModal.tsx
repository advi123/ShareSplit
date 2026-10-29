import React from 'react';
import { AlertTriangle, Archive } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';

export const CloseWeekModal: React.FC = () => {
  const { activeModal, closeModal, closeCurrentWeek, currentWeek } = useApp();

  if (activeModal !== 'close-week') return null;

  return (
    <Modal
      isOpen={activeModal === 'close-week'}
      onClose={closeModal}
      title="Close & Archive Week?"
      subtitle={`Week: ${currentWeek.startDate} to ${currentWeek.endDate}`}
      maxWidth="md"
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Important Notice:</strong> Closing this week will compute final net balances and archive all current expenses into Weekly History. A fresh week will start immediately.
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-3">
          <button
            onClick={closeModal}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={closeCurrentWeek}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition-colors"
          >
            <Archive className="w-4 h-4" />
            <span>Close Week</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
