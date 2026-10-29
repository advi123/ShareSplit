import React from 'react';
import { UserPlus, UserCheck, UserX, Eye, Edit3, Trash2, History, RotateCcw, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateNetBalances } from '../services/settlementEngine';
import { AddEditMemberModal } from '../components/members/AddEditMemberModal';
import { MemberDetailModal } from '../components/members/MemberDetailModal';

export const MembersView: React.FC = () => {
  const {
    members,
    expenses,
    settings,
    openModal,
    requestRemoveMember,
    reactivateMember,
    showInactiveMembers,
    toggleShowInactiveMembers
  } = useApp();

  const currency = settings.currency;

  const activeMembers = members.filter((m) => m.isActive !== false);
  const inactiveMembers = members.filter((m) => m.isActive === false);

  const netBalancesMap = calculateNetBalances(expenses, members);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Members
          </h2>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
            {activeMembers.length} active · {inactiveMembers.length} inactive
          </p>
        </div>

        <div className="flex items-center gap-3">
          {inactiveMembers.length > 0 && (
            <button
              onClick={toggleShowInactiveMembers}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {showInactiveMembers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showInactiveMembers ? 'Hide Inactive' : `Show Inactive (${inactiveMembers.length})`}</span>
            </button>
          )}

          <button
            onClick={() => openModal('add-member')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 font-bold text-xs rounded-xl shadow-2xs transition-colors duration-150"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Member</span>
          </button>
        </div>
      </div>

      {/* ACTIVE MEMBERS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            ACTIVE MEMBERS ({activeMembers.length})
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeMembers.map((member) => {
            const bd = netBalancesMap[member.id] || { totalPaid: 0, totalShare: 0, netBalance: 0 };
            return (
              <div
                key={member.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Avatar & Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div
                      onClick={() => openModal('member-detail', member)}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 flex items-center justify-center font-extrabold text-base shadow-2xs group-hover:scale-105 transition-transform">
                        {member.avatar || member.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 transition-colors flex items-center gap-1.5">
                          <span>{member.name}</span>
                          {member.nickname && member.nickname !== 'Me' && (
                            <span className="text-xs font-medium text-slate-400">
                              ({member.nickname})
                            </span>
                          )}
                        </h4>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 mt-0.5">
                          <UserCheck className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Stats */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Paid</span>
                      <div className="text-xs font-black text-slate-900 dark:text-slate-100">
                        {currency}{bd.totalPaid.toFixed(2)}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Share</span>
                      <div className="text-xs font-black text-slate-900 dark:text-slate-100">
                        {currency}{bd.totalShare.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => openModal('member-detail', member)}
                    className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>History</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openModal('edit-member', member)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
                    >
                      Edit
                    </button>
                    {!member.isYou && (
                      <button
                        onClick={() => requestRemoveMember(member.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* INACTIVE MEMBERS SECTION */}
      {showInactiveMembers && (
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <UserX className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              INACTIVE MEMBERS ({inactiveMembers.length})
            </h3>
          </div>

          {inactiveMembers.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No inactive members.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {inactiveMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4 opacity-80 hover:opacity-100 transition-opacity"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-extrabold text-base">
                      {member.avatar || member.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {member.name} {member.nickname ? `(${member.nickname})` : ''}
                      </h4>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 mt-0.5">
                        Inactive
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => openModal('member-detail', member)}
                      className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>View History</span>
                    </button>

                    <button
                      onClick={() => reactivateMember(member.id)}
                      className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg dark:bg-slate-800 dark:text-slate-200 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reactivate</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddEditMemberModal />
      <MemberDetailModal />
    </div>
  );
};
