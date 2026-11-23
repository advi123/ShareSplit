import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, Home, Key, Eye, EyeOff, LogIn, UserPlus, Sparkles, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';

export const AuthModal: React.FC = () => {
  const { activeModal, closeModal, login, register, showToast } = useApp();
  const isOpen = activeModal === 'auth';

  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [groupChoice, setGroupChoice] = useState<'create' | 'join'>('create');
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === 'login') {
        if (!email.trim() || !password) {
          throw new Error('Please enter both email and password.');
        }
        await login(email.trim(), password);
      } else {
        if (!name.trim()) throw new Error('Please enter your name.');
        if (!email.trim()) throw new Error('Please enter a valid email.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');

        if (groupChoice === 'create' && !groupName.trim()) {
          throw new Error('Please provide a name for your group/flat.');
        }
        if (groupChoice === 'join' && !inviteCode.trim()) {
          throw new Error('Please enter the 6-character invite code from your roommates.');
        }

        await register(
          email.trim(),
          password,
          name.trim(),
          groupChoice === 'create' ? groupName.trim() : undefined,
          groupChoice === 'join' ? inviteCode.trim().toUpperCase() : undefined
        );
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={closeModal} title="">
      <div className="space-y-6 pt-1">
        {/* Brand header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 mb-2">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {tab === 'login' ? 'Welcome to ShareSplit' : 'Create Your Account'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {tab === 'login'
              ? 'Sign in to access your flat expenses, bills, and settlements'
              : 'Start tracking shared expenses with roommates & friends'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              tab === 'login'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              tab === 'register'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'register' && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Your Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Advi"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {tab === 'register' && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Group Setup
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGroupChoice('create')}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                    groupChoice === 'create'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-slate-900 dark:text-slate-100'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <Home className={`w-4 h-4 mt-0.5 ${groupChoice === 'create' ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-xs font-bold">New Group</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Start a new flat</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setGroupChoice('join')}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                    groupChoice === 'join'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-slate-900 dark:text-slate-100'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <Key className={`w-4 h-4 mt-0.5 ${groupChoice === 'join' ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-xs font-bold">Join Group</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Use invite code</div>
                  </div>
                </button>
              </div>

              {groupChoice === 'create' ? (
                <div>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Group name e.g. Flat 304, Goa Trip"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Enter Invite Code e.g. SHARE-9821"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold tracking-wider text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 uppercase"
                  />
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {tab === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>{loading ? 'Creating Account...' : 'Create Account & Continue'}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </Modal>
  );
};
