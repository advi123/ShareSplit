import React from 'react';
import { UserPlus, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MemberCard } from '../components/members/MemberCard';
import { AddEditMemberModal } from '../components/members/AddEditMemberModal';
import { Person } from '../types';

export const GroupView: React.FC = () => {
  const { members, settings, openModal, requestRemoveMember } = useApp();

  const handleOpenEdit = (m: Person) => {
    openModal('edit-member', m);
  };

  const handleOpenAdd = () => {
    openModal('add-member');
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Group & Member Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage living companions sharing expenses in group "{settings.groupName}"
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 font-bold text-xs rounded-xl shadow-2xs transition-colors duration-150"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Member</span>
        </button>
      </div>

      {/* Member Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            onEdit={() => handleOpenEdit(member)}
            onDelete={() => requestRemoveMember(member.id)}
            canDelete={members.length > 2}
          />
        ))}
      </div>

      {/* Group Info Notice */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
          <Users className="w-4 h-4 text-brand-600" />
          <span>Dynamic Group Member Support</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          ShareSplit supports dynamic member scaling. Adding or removing members dynamically adapts itemized split checklists and settlement formulas.
        </p>
      </div>

      <AddEditMemberModal />
    </div>
  );
};
