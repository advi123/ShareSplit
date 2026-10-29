import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';

export const AddEditMemberModal: React.FC = () => {
  const { activeModal, closeModal, addMember, updateMember, selectedMember } = useApp();

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [color, setColor] = useState('indigo');

  const isEditing = activeModal === 'edit-member';

  useEffect(() => {
    if (isEditing && selectedMember) {
      setName(selectedMember.name);
      setNickname(selectedMember.nickname || '');
      setColor(selectedMember.color || 'indigo');
    } else {
      setName('');
      setNickname('');
      setColor('indigo');
    }
  }, [selectedMember, activeModal, isEditing]);

  if (activeModal !== 'add-member' && activeModal !== 'edit-member') return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isEditing && selectedMember) {
      updateMember({
        ...selectedMember,
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        avatar: name.trim().slice(0, 1).toUpperCase(),
        color
      });
    } else {
      addMember(name.trim(), nickname.trim(), color);
    }
  };

  return (
    <Modal
      isOpen={activeModal === 'add-member' || activeModal === 'edit-member'}
      onClose={closeModal}
      title={isEditing ? 'Edit Group Member' : 'Add Group Member'}
      subtitle={isEditing ? 'Update name, nickname, or avatar theme color' : 'Add roomies or trip companions to share expenses'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Member Name *
          </label>
          <input
            type="text"
            placeholder="e.g. Rahul Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-slate-100"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Optional Nickname
          </label>
          <input
            type="text"
            placeholder="e.g. Ray"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Avatar Theme Color
          </label>
          <div className="flex gap-3">
            {['emerald', 'indigo', 'amber', 'rose', 'blue'].map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full border-2 transition-transform ${
                  color === c ? 'scale-110 border-slate-900 dark:border-white' : 'border-transparent'
                } bg-${c === 'emerald' ? 'emerald' : c === 'indigo' ? 'indigo' : c === 'amber' ? 'amber' : c === 'rose' ? 'rose' : 'blue'}-600`}
              />
            ))}
          </div>
        </div>

        <div className="pt-3 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={closeModal}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 rounded-xl shadow-2xs transition-colors duration-150"
          >
            {isEditing ? 'Save Changes' : 'Add Member'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
