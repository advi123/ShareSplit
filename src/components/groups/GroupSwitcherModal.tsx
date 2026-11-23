import React, { useState } from 'react';
import { Home, Plus, Key, Check, Copy, Users, ChevronRight, Sparkles, Plane, Trash2, AlertTriangle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';

export const GroupSwitcherModal: React.FC = () => {
  const {
    activeModal,
    closeModal,
    userGroups,
    activeGroupId,
    switchGroup,
    createNewGroup,
    joinGroupWithCode,
    deleteGroup,
    showToast,
    openModal
  } = useApp();

  const isOpen = activeModal === 'group-switcher';

  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'join'>('list');
  const [newGroupName, setNewGroupName] = useState('');
  const [groupType, setGroupType] = useState<'home' | 'trip'>('home');
  const [currency, setCurrency] = useState('₹');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<{ id: string; name: string } | null>(null);

  if (!isOpen) return null;

  const handleCopyCode = (code?: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Invite code ${code} copied!`, 'success');
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setLoading(true);
    try {
      await createNewGroup(newGroupName.trim(), currency, groupType);
      setNewGroupName('');
      setActiveTab('list');
    } catch (err: any) {
      showToast(err.message || 'Could not create group', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;
    setLoading(true);
    try {
      await deleteGroup(groupToDelete.id);
      setGroupToDelete(null);
    } catch (err: any) {
      showToast(err.message || 'Could not delete group', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setLoading(true);
    try {
      await joinGroupWithCode(inviteCode.trim().toUpperCase());
      setInviteCode('');
      setActiveTab('list');
    } catch (err: any) {
      showToast(err.message || 'Invalid invite code', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={closeModal} title="Switch or Manage Groups">
      <div className="space-y-5 pt-1">
        {/* Tab Switcher */}
        <div className="grid grid-cols-3 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'list'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            My Groups
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            + Create New
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('join')}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'join'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Join Code
          </button>
        </div>

        {/* Tab 1: Group List */}
        {activeTab === 'list' && (
          <div className="space-y-3">
            {groupToDelete && (
              <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/40 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                      Delete "{groupToDelete.name}"?
                    </h4>
                    <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5 leading-relaxed">
                      This will permanently delete this group, including all its expenses, members, and settlement records. This action cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setGroupToDelete(null)}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteGroup}
                    disabled={loading}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    {loading ? 'Deleting...' : 'Yes, Delete Group'}
                  </button>
                </div>
              </div>
            )}

            {userGroups.length === 0 ? (
              <div className="text-center py-6 text-slate-400 space-y-3">
                <Users className="w-8 h-8 mx-auto opacity-50" />
                <p className="text-xs">You are currently in the default group.</p>
                <button
                  onClick={() => openModal('auth')}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Sign in to create your personal groups
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {userGroups.map((grp) => {
                  const isActive = grp.id === activeGroupId;
                  const isTrip = grp.groupType === 'trip' || grp.group_type === 'trip';
                  return (
                    <div
                      key={grp.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isActive
                          ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs'
                          : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <button
                        onClick={() => {
                          switchGroup(grp.id);
                          closeModal();
                        }}
                        className="flex items-center gap-3 text-left flex-1 min-w-0 cursor-pointer"
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                            isActive
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {isTrip ? <Plane className="w-4 h-4" /> : <Home className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {grp.name}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                isTrip
                                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300'
                                  : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300'
                              }`}
                            >
                              {isTrip ? '✈️ Trip' : '🏠 Flat'}
                            </span>
                            {isActive && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Currency: {grp.currency || '₹'} • Role: {grp.role}
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Invite Code copy pill */}
                        {grp.inviteCode && (
                          <button
                            onClick={() => handleCopyCode(grp.inviteCode)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200/70 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-[11px] font-mono font-bold transition-all active:scale-95 cursor-pointer"
                            title="Copy invite code"
                          >
                            {copiedCode === grp.inviteCode ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                                <span>{grp.inviteCode}</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* Delete Group (non-default groups only) */}
                        {grp.id !== 'default-group' && (
                          <button
                            type="button"
                            onClick={() => setGroupToDelete({ id: grp.id, name: grp.name })}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                            title={`Delete group ${grp.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Create New Group */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateGroup} className="space-y-4">
            {/* Group Type Selector: Home vs Trip */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Group Type
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setGroupType('home')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    groupType === 'home'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-emerald-500 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-1.5 rounded-xl ${
                        groupType === 'home'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Home className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Home / Flat
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 leading-snug">
                    Roommate rent, groceries, utility bills & weekly settlements
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setGroupType('trip')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    groupType === 'trip'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-emerald-500 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-1.5 rounded-xl ${
                        groupType === 'trip'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Plane className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Group Trip
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 leading-snug">
                    Vacations & 2-3 day trips, simple expense calculator, overall split
                  </p>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                {groupType === 'trip' ? 'Trip Name' : 'Flat / Group Name'}
              </label>
              <input
                type="text"
                required
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder={groupType === 'trip' ? 'e.g. Goa Trip 2026, Manali Trek' : 'e.g. Flat 304, Green Heights'}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Currency Symbol
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['₹', '$', '€', '£'].map((curr) => (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => setCurrency(curr)}
                    className={`py-2 rounded-xl border text-center font-bold text-sm transition-all cursor-pointer ${
                      currency === curr
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-black shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-500 bg-white dark:bg-slate-850'
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{loading ? 'Creating...' : groupType === 'trip' ? 'Create Group Trip' : 'Create Flat Group'}</span>
            </button>
          </form>
        )}

        {/* Tab 3: Join Group with Code */}
        {activeTab === 'join' && (
          <form onSubmit={handleJoinGroup} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Roommates' Invite Code
              </label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="e.g. SHARE-9241"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold tracking-wider text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 uppercase"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Ask your flatmate or group admin to copy their 6-character code from their group switcher.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              <Key className="w-4 h-4" />
              <span>{loading ? 'Joining...' : 'Join Group'}</span>
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
};
