import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { Person } from '../../types';

interface Props {
  member: Person;
  onEdit: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

export const MemberCard: React.FC<Props> = ({ member, onEdit, onDelete, canDelete }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
      <div className="flex items-center gap-3.5">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm text-white shadow-xs ${
            member.color === 'indigo'
              ? 'bg-indigo-600'
              : member.color === 'amber'
              ? 'bg-amber-600'
              : member.color === 'rose'
              ? 'bg-rose-600'
              : member.color === 'emerald'
              ? 'bg-emerald-600'
              : member.color === 'blue'
              ? 'bg-blue-600'
              : member.color?.startsWith('bg-')
              ? member.color
              : 'bg-brand-600'
          }`}
        >
          {member.avatar || member.name.slice(0, 1)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{member.name}</h4>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Group Member</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onEdit}
          className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="Edit Member"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        {canDelete && !member.isYou && (
          <button
            onClick={onDelete}
            className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors"
            title="Remove Member"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
