import React, { useState } from 'react';
import { Home, Plus, Key, Check, Copy, Users, ChevronRight, Sparkles } from 'lucide-react';
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
    showToast,
    openModal
  } = useApp();

  const isOpen = activeModal === 'group-switcher';

  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'join'>('list');
  const [newGroupName, setNewGroupName] = useState('');
  const [currency, setCurrency] = useState('₹');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyCode = (code?: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Invite code ${code} copied! Share it with your roommates.`, 'success');
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setLoading(true);
    try {
      await createNewGroup(newGroupName.trim(), currency);
      setNewGroupName('');
      setActiveTab('list');
    } catch (err: any) {
      showToast(err.message || 'Could not create group', 'error');
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
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'list'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            My Groups
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'create'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            + Create New
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('join')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'join'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Join Code
          </button>
        </div>

        {/* Tab 1: Group List */}
        {activeTab === 'list' && (
          <div className="space-y-3">
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
                        className="flex items-center gap-3 text-left flex-1 min-w-0"
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                            isActive
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {grp.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {grp.name}
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

                      {/* Invite Code copy pill */}
                      {grp.inviteCode && (
                        <button
                          onClick={() => handleCopyCode(grp.inviteCode)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200/70 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-[11px] font-mono font-bold transition-all active:scale-95 shrink-0"
                          title="Copy group invite code to share with roommates"
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
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                New Group Name
              </label>
              <input
                type="text"
                required
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Flat 304, Manali Trip, Office Lunch"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Currency Symbol
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['₹', '$', '€', '£'].map((curr) => (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => setCurrency(curr)}
                    className={`py-2 rounded-xl border text-center font-bold text-sm transition-all ${
                      currency === curr
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
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
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>{loading ? 'Creating Group...' : 'Create Group'}</span>
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
