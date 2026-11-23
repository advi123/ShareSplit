import React from 'react';
import { AlertTriangle, UserMinus } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';

export const RemoveMemberConfirmModal: React.FC = () => {
  const {
    activeModal,
    closeModal,
    pendingRemoveMember,
    confirmRemoveMember,
    cancelRemoveMember
  } = useApp();

  if (activeModal !== 'remove-member-confirm' || !pendingRemoveMember) return null;

  return (
    <Modal
      isOpen={activeModal === 'remove-member-confirm'}
      onClose={cancelRemoveMember}
      title="Move Member to Inactive Zone?"
      subtitle={`Deactivate ${pendingRemoveMember.name} and exclude from future expense splits`}
      maxWidth="md"
    >
      <div className="space-y-5">
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs leading-relaxed flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Moved to Inactive:</strong> {pendingRemoveMember.name} will be placed in the <strong>Inactive Members</strong> section. They will no longer be included in new expenses, and you can reactivate them or permanently delete them anytime from the Inactive section.
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold text-sm">
              {pendingRemoveMember.avatar || pendingRemoveMember.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {pendingRemoveMember.name} {pendingRemoveMember.nickname ? `(${pendingRemoveMember.nickname})` : ''}
              </div>
              <div className="text-[11px] text-slate-400">
                Joined: {pendingRemoveMember.joinedAt}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-3">
          <button
            onClick={cancelRemoveMember}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={confirmRemoveMember}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm cursor-pointer"
          >
            <UserMinus className="w-4 h-4" />
            <span>Move to Inactive</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
