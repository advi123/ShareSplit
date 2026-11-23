import React from 'react';
import { Calendar, Moon, Sun, Settings as SettingsIcon, ChevronDown, User as UserIcon, LogOut, LogIn, Key, Copy, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Header: React.FC = () => {
  const {
    currentWeek,
    settings,
    toggleTheme,
    activeSection,
    setActiveSection,
    user,
    logout,
    openModal,
    currentGroup,
    showToast
  } = useApp();

  const [copied, setCopied] = React.useState(false);

  const formatDateRange = (start: string, end: string) => {
    if (!start || !end) return 'Current Week';
    try {
      const s = new Date(start);
      const e = new Date(end);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return 'Current Week';
      const sStr = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const eStr = e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${sStr} – ${eStr}`;
    } catch {
      return `${start} – ${end}`;
    }
  };

  const inviteCode = currentGroup?.inviteCode || settings.inviteCode;

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      showToast(`Group invite code ${inviteCode} copied!`, 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayGroupName = currentGroup?.name || settings.groupName || 'Home';

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Group Switcher & Active Week */}
        <div className="flex items-center gap-3">
          {/* Mobile brand icon */}
          <div className="lg:hidden w-8 h-8 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-black text-sm shadow-xs">
            S
          </div>

          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openModal('group-switcher')}
                className="flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-0.5 -ml-2 rounded-lg transition-colors group cursor-pointer"
                title="Switch or create groups"
              >
                <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate max-w-[140px] sm:max-w-[200px]">
                  {displayGroupName}
                </h2>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
              </button>

              {inviteCode && (
                <button
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/80 border border-emerald-200 dark:border-emerald-800 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
                  title="Click to copy group invite code"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Key className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                  <span>{inviteCode}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{formatDateRange(currentWeek.startDate, currentWeek.endDate)}</span>
            </div>
          </div>
        </div>

        {/* Right: Auth / Profile, Settings & Theme */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {user ? (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 pl-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <UserIcon className="w-3.5 h-3.5 text-emerald-500" />
                <span className="max-w-[70px] sm:max-w-[120px] truncate">{user.name}</span>
              </div>
              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => openModal('auth')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Settings button */}
          <button
            onClick={() => setActiveSection('settings')}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              activeSection === 'settings'
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Toggle Theme (Instant)"
          >
            {settings.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
