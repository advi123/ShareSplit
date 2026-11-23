import React, { useState, useEffect } from 'react';
import {
  Save,
  RefreshCw,
  Moon,
  Sun,
  Settings as SettingsIcon,
  Key,
  Copy,
  Check,
  Share2,
  ShieldCheck,
  Plane,
  Home,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ExpenseCategory, GroupSettings } from '../types';

const HOME_CATEGORIES: ExpenseCategory[] = [
  'Rent',
  'Groceries',
  'Blinkit',
  'Food',
  'Travel',
  'Electricity',
  'Internet',
  'Household',
  'Cleaning',
  'Entertainment',
  'Other'
];

const TRIP_CATEGORIES: ExpenseCategory[] = [
  'Travel',
  'Stay',
  'Food & Drinks',
  'Activities',
  'Shopping',
  'Other'
];

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    resetAllData,
    toggleTheme: appToggleTheme,
    currentGroup,
    deleteGroup,
    showToast
  } = useApp();

  const [formData, setFormData] = useState<GroupSettings>(settings);
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isTrip = currentGroup?.groupType === 'trip' || settings.groupType === 'trip';
  const categoriesList = isTrip ? TRIP_CATEGORIES : HOME_CATEGORIES;
  const inviteCode = currentGroup?.inviteCode || settings.inviteCode;
  const displayGroupName = currentGroup?.name || settings.groupName || 'Home';

  const handleCopyCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      showToast(`Group invite code ${inviteCode} copied!`, 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareWhatsApp = () => {
    if (inviteCode) {
      const text = `Hey! Join our "${displayGroupName}" flat expenses on ShareSplit.\n\n🔑 Invite Code: ${inviteCode}\n🌐 Open: ${window.location.origin}\n\nSign in or register and enter this code to join!`;
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    }
  };

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
  };

  const toggleTheme = () => {
    const nextTheme: GroupSettings['theme'] = formData.theme === 'dark' ? 'light' : 'dark';
    setFormData({ ...formData, theme: nextTheme });
    appToggleTheme();
  };

  return (
    <div className="space-y-6 max-w-3xl pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          Application Settings
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure group parameters, currency defaults, and UI preferences
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Compact Roommate Invite Code Row */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
              {isTrip ? (
                <Plane className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Key className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {isTrip ? 'Trip Invite Code:' : 'Flat Invite Code:'}
                </span>
                <span className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400 tracking-wider">
                  {inviteCode || 'N/A'}
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
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Share this code with {isTrip ? 'trip members' : 'roommates'} so they can join {displayGroupName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Group Preferences Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <SettingsIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Group Preferences
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Group Name
              </label>
              <input
                type="text"
                value={formData.groupName}
                onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-xs font-semibold text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Currency Symbol
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-xs font-semibold text-slate-900 dark:text-slate-100"
              >
                <option value="₹">Indian Rupee (INR ₹)</option>
                <option value="$">US Dollar (USD $)</option>
                <option value="€">Euro (EUR €)</option>
                <option value="£">British Pound (GBP £)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Week Starts On
              </label>
              <select
                value={formData.weekStartsOn}
                onChange={(e) =>
                  setFormData({ ...formData, weekStartsOn: e.target.value as 'Monday' | 'Sunday' })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-xs font-semibold text-slate-900 dark:text-slate-100"
              >
                <option value="Monday">Monday</option>
                <option value="Sunday">Sunday</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Default Expense Category
              </label>
              <select
                value={formData.defaultCategory}
                onChange={(e) =>
                  setFormData({ ...formData, defaultCategory: e.target.value as ExpenseCategory })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-xs font-semibold text-slate-900 dark:text-slate-100"
              >
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Theme Preference Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
            Appearance & Theme
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Interface Color Scheme
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Switch between Light mode and Dark mode theme
              </p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {formData.theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Dark Theme</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-slate-600" />
                  <span>Light Theme</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Danger Zone: Delete Group */}
        {currentGroup && (
          <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  <span>Delete {isTrip ? 'Group Trip' : 'Flat Group'}</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Permanently delete "{displayGroupName}" along with all its expenses, members, and settlement records.
                </p>
              </div>

              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-600 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-800 transition-colors shrink-0 cursor-pointer"
                >
                  Delete {isTrip ? 'Trip' : 'Group'}
                </button>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={async () => {
                      if (!currentGroup) return;
                      setDeleting(true);
                      try {
                        await deleteGroup(currentGroup.id);
                        setShowDeleteConfirm(false);
                      } catch (err: any) {
                        showToast(err.message || 'Failed to delete group', 'error');
                      } finally {
                        setDeleting(false);
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    {deleting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={resetAllData}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset Demo Seed Data</span>
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 rounded-xl shadow-2xs transition-colors duration-150"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
