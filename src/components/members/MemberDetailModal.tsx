import React from 'react';
import { User, Calendar, CheckCircle2, XCircle, CreditCard, PieChart, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { calculateNetBalances } from '../../services/settlementEngine';

export const MemberDetailModal: React.FC = () => {
  const {
    activeModal,
    closeModal,
    selectedMember,
    expenses,
    members,
    historicalWeeks,
    settings,
    requestRemoveMember,
    reactivateMember
  } = useApp();

  if (activeModal !== 'member-detail' || !selectedMember) return null;

  const currency = settings.currency;

  // Compute overall member stats across all active week expenses
  const netBalancesMap = calculateNetBalances(expenses, members);
  const memberStats = netBalancesMap[selectedMember.id] || {
    totalPaid: 0,
    totalShare: 0,
    netBalance: 0
  };

  // Filter expenses involving this member
  const memberExpenses = expenses.filter(
    (exp) =>
      exp.paidBy === selectedMember.id ||
      exp.participants.includes(selectedMember.id) ||
      exp.items?.some((i) => i.participants.includes(selectedMember.id))
  );

  // Historical weeks involving this member
  const memberWeeks = historicalWeeks.filter((week) => {
    const weekExp = expenses.filter((e) => e.weekId === week.id);
    return weekExp.some(
      (e) => e.paidBy === selectedMember.id || e.participants.includes(selectedMember.id)
    );
  });

  return (
    <Modal
      isOpen={activeModal === 'member-detail'}
      onClose={closeModal}
      title={selectedMember.name}
      subtitle={selectedMember.nickname ? `Nickname: "${selectedMember.nickname}"` : 'Group Member Profile'}
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Header Profile Box */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg text-white shadow-md ${
                selectedMember.isYou
                  ? 'bg-brand-600'
                  : selectedMember.color === 'indigo'
                  ? 'bg-indigo-600'
                  : selectedMember.color === 'amber'
                  ? 'bg-amber-600'
                  : 'bg-blue-600'
              }`}
            >
              {selectedMember.avatar || selectedMember.name.slice(0, 1)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {selectedMember.name}
                </h4>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md flex items-center gap-1 ${
                    selectedMember.isActive
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {selectedMember.isActive ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Active</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 text-slate-500" />
                      <span>Inactive</span>
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Joined {selectedMember.joinedAt || 'Aug 01, 2026'}</span>
              </div>
            </div>
          </div>

          {/* Toggle Active status button */}
          {!selectedMember.isYou && (
            <div>
              {selectedMember.isActive ? (
                <button
                  onClick={() => requestRemoveMember(selectedMember.id)}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 rounded-xl hover:bg-rose-100 transition-colors"
                >
                  Remove Member
                </button>
              ) : (
                <button
                  onClick={() => reactivateMember(selectedMember.id)}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl hover:bg-emerald-100 transition-colors"
                >
                  Reactivate Member
                </button>
              )}
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              <span>Total Paid</span>
            </span>
            <div className="text-sm font-black text-slate-900 dark:text-slate-100">
              {currency}{memberStats.totalPaid.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <PieChart className="w-3 h-3" />
              <span>Total Share</span>
            </span>
            <div className="text-sm font-black text-slate-900 dark:text-slate-100">
              {currency}{memberStats.totalShare.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              {memberStats.netBalance >= 0 ? (
                <ArrowUpRight className="w-3 h-3 text-emerald-500" />
              ) : (
                <ArrowDownRight className="w-3 h-3 text-rose-500" />
              )}
              <span>Net Balance</span>
            </span>
            <div
              className={`text-sm font-black ${
                memberStats.netBalance > 0.01
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : memberStats.netBalance < -0.01
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {memberStats.netBalance > 0.01
                ? `+${currency}${memberStats.netBalance.toFixed(2)}`
                : `${currency}${memberStats.netBalance.toFixed(2)}`}
            </div>
          </div>
        </div>

        {/* Recent Expenses List */}
        <div>
          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Recent Expenses Involving {selectedMember.name} ({memberExpenses.length})
          </h5>
          {memberExpenses.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No recent expenses recorded for this member.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {memberExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {exp.description}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      {exp.date} • Paid by {exp.paidBy === selectedMember.id ? 'them' : 'others'}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {currency}{exp.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historical Weeks Involvement */}
        <div>
          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Historical Settled Weeks ({memberWeeks.length})
          </h5>
          {memberWeeks.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No archived historical weeks recorded.</p>
          ) : (
            <div className="space-y-2">
              {memberWeeks.map((week) => (
                <div
                  key={week.id}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Week: {week.startDate} to {week.endDate}
                  </span>
                  <span className="font-bold text-brand-600 dark:text-brand-400">Archived</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={closeModal}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};
