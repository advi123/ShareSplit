import React, { createContext, useContext, useState, useEffect } from 'react';
import { Expense, Person, Week, GroupSettings, NavSection, Bill, User, GroupBrief } from '../types';
import { storageService } from '../services/storageService';
import { apiService } from '../services/apiService';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

interface AppContextType {
  // Auth & Multi-Group
  user: User | null;
  isAuthenticated: boolean;
  userGroups: GroupBrief[];
  activeGroupId: string;
  currentGroup: GroupBrief | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, groupName?: string, inviteCode?: string) => Promise<void>;
  logout: () => void;
  switchGroup: (groupId: string) => Promise<void>;
  createNewGroup: (name: string, currency?: string) => Promise<void>;
  joinGroupWithCode: (inviteCode: string) => Promise<void>;

  // Data
  expenses: Expense[];
  members: Person[];
  bills: Bill[];
  currentWeek: Week;
  historicalWeeks: Week[];
  settings: GroupSettings;
  activeSection: NavSection;
  activeModal: string | null;
  selectedExpense: Expense | null;
  selectedMember: Person | null;
  selectedBill: Bill | null;
  pendingReopen: { expense: Expense; week: Week } | null;
  pendingRemoveMember: Person | null;
  pendingPastWeekSettlement: Week | null;
  showInactiveMembers: boolean;
  toast: Toast | null;

  // Navigation & UI state
  setActiveSection: (section: NavSection) => void;
  openModal: (modalName: string, payload?: any) => void;
  closeModal: () => void;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  toggleShowInactiveMembers: () => void;

  // Data Actions
  loadAllData: () => Promise<void>;
  addOrUpdateExpense: (expense: Expense, forceReopen?: boolean) => Promise<void>;
  confirmReopenAndAddExpense: () => void;
  cancelReopenExpense: () => void;
  confirmPastWeekSettled: (weekId: string) => Promise<void>;
  dismissPastWeekSettledPrompt: (weekId: string) => void;
  deleteExpense: (id: string) => void;
  addMember: (name: string, nickname?: string, color?: string) => void;
  updateMember: (member: Person) => void;
  requestRemoveMember: (id: string) => void;
  confirmRemoveMember: () => void;
  cancelRemoveMember: () => void;
  reactivateMember: (id: string) => void;
  saveBill: (bill: Bill, imageData?: string) => Promise<Bill>;
  deleteBill: (billId: string, deleteRelatedExpense?: boolean) => Promise<void>;
  updateSettings: (newSettings: GroupSettings) => void;
  toggleTheme: () => void;
  closeCurrentWeek: () => void;
  resetAllData: () => void;
}

const CACHE_KEY = 'sharesplit_cache_v1';

function getInitialCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

const initialCache = getInitialCache();

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [userGroups, setUserGroups] = useState<GroupBrief[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string>(
    localStorage.getItem('sharesplit_active_group_id') || 'default-group'
  );

  // Group Data state
  const [members, setMembers] = useState<Person[]>(initialCache?.members || []);
  const [expenses, setExpenses] = useState<Expense[]>(initialCache?.expenses || []);
  const [bills, setBills] = useState<Bill[]>(initialCache?.bills || []);
  const [currentWeek, setCurrentWeek] = useState<Week>(initialCache?.currentWeek || { id: '', startDate: '', endDate: '', status: 'active' });
  const [historicalWeeks, setHistoricalWeeks] = useState<Week[]>(initialCache?.historicalWeeks || []);
  const [settings, setSettings] = useState<GroupSettings>(initialCache?.settings || {
    groupName: 'Home',
    currency: '₹',
    weekStartsOn: 'Monday',
    defaultCategory: 'Groceries',
    theme: 'light'
  });

  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [selectedMember, setSelectedMember] = useState<Person | null>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [pendingReopen, setPendingReopen] = useState<{ expense: Expense; week: Week } | null>(null);
  const [pendingRemoveMember, setPendingRemoveMember] = useState<Person | null>(null);
  const [pendingPastWeekSettlement, setPendingPastWeekSettlement] = useState<Week | null>(null);
  const [showInactiveMembers, setShowInactiveMembers] = useState<boolean>(false);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    const token = localStorage.getItem('sharesplit_token');
    if (token) {
      try {
        const authData = await apiService.auth.getMe();
        setUser(authData.user);
        setUserGroups(authData.groups);
        if (authData.active_group_id) {
          setActiveGroupId(authData.active_group_id);
          localStorage.setItem('sharesplit_active_group_id', authData.active_group_id);
        }
      } catch (err) {
        console.warn('Auto auth validation failed:', err);
      }
    }
    await loadAllData();
  };

  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  const loadAllData = async () => {
    try {
      const data = await storageService.loadAllInitial();

      setMembers(data.members);
      setExpenses(data.expenses);
      setBills(data.bills);
      setCurrentWeek(data.currentWeek);
      setHistoricalWeeks(data.historicalWeeks);
      setSettings(data.settings);

      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          members: data.members,
          expenses: data.expenses,
          bills: data.bills,
          currentWeek: data.currentWeek,
          historicalWeeks: data.historicalWeeks,
          settings: data.settings
        }));
      } catch {}

      const immediatelyPrecedingWeek = data.historicalWeeks[0];
      if (
        immediatelyPrecedingWeek &&
        immediatelyPrecedingWeek.status !== 'closed' &&
        localStorage.getItem(`sharesplit_week_settled_${immediatelyPrecedingWeek.id}`) !== 'true' &&
        sessionStorage.getItem(`sharesplit_week_dismissed_${immediatelyPrecedingWeek.id}`) !== 'true'
      ) {
        setPendingPastWeekSettlement(immediatelyPrecedingWeek);
        setActiveModal((prev) => (prev ? prev : 'confirm-past-week-settled'));
      }
    } catch (err) {
      console.error('Failed to load data from API', err);
    }
  };

  // Auth Functions
  const login = async (email: string, password: string) => {
    const res = await apiService.auth.login({ email, password });
    setUser(res.user);
    setUserGroups(res.groups);
    setActiveGroupId(res.active_group_id);
    closeModal();
    showToast(`Welcome back, ${res.user.name}!`, 'success');
    await loadAllData();
  };

  const register = async (email: string, password: string, name: string, groupName?: string, inviteCode?: string) => {
    const res = await apiService.auth.register({ email, password, name, group_name: groupName, invite_code: inviteCode });
    setUser(res.user);
    setUserGroups(res.groups);
    setActiveGroupId(res.active_group_id);
    closeModal();
    showToast(`Welcome to ShareSplit, ${res.user.name}!`, 'success');
    await loadAllData();
  };

  const logout = () => {
    apiService.auth.logout();
    setUser(null);
    setUserGroups([]);
    setActiveGroupId('default-group');
    showToast('Signed out successfully', 'info');
    loadAllData();
  };

  const switchGroup = async (groupId: string) => {
    localStorage.setItem('sharesplit_active_group_id', groupId);
    setActiveGroupId(groupId);
    const grp = userGroups.find((g) => g.id === groupId);
    showToast(`Switched to "${grp?.name || 'Group'}"`, 'info');
    await loadAllData();
  };

  const createNewGroup = async (name: string, currency = '₹') => {
    const newGrp = await apiService.groups.create(name, currency);
    setUserGroups((prev) => [...prev, newGrp]);
    await switchGroup(newGrp.id);
    closeModal();
    showToast(`Created group "${name}"! Code: ${newGrp.inviteCode}`, 'success');
  };

  const joinGroupWithCode = async (inviteCode: string) => {
    const joinedGrp = await apiService.groups.join(inviteCode);
    setUserGroups((prev) => {
      const exists = prev.some((g) => g.id === joinedGrp.id);
      return exists ? prev : [...prev, joinedGrp];
    });
    await switchGroup(joinedGrp.id);
    closeModal();
    showToast(`Joined group "${joinedGrp.name}"!`, 'success');
  };

  const currentGroup = userGroups.find((g) => g.id === activeGroupId) || null;

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now().toString();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 3500);
  };

  const openModal = (modalName: string, payload: any = null) => {
    if (modalName === 'expense-detail' || modalName === 'edit-expense') {
      setSelectedExpense(payload);
    } else if (modalName === 'member-detail' || modalName === 'edit-member') {
      setSelectedMember(payload);
    } else if (modalName === 'bill-viewer' || modalName === 'delete-bill-confirm') {
      setSelectedBill(payload);
    } else if (modalName === 'confirm-past-week-settled') {
      setPendingPastWeekSettlement(payload);
    }
    setActiveModal(modalName);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const toggleShowInactiveMembers = () => {
    setShowInactiveMembers((prev) => !prev);
  };

  const confirmPastWeekSettled = async (weekId: string) => {
    localStorage.setItem(`sharesplit_week_settled_${weekId}`, 'true');
    localStorage.setItem(`sharesplit_week_dismissed_${weekId}`, 'true');
    sessionStorage.setItem(`sharesplit_week_dismissed_${weekId}`, 'true');
    try {
      await storageService.closeWeek(weekId);
    } catch (err) {
      console.error('Failed to close week in backend:', err);
    }
    setPendingPastWeekSettlement(null);
    closeModal();
    showToast('Past week settled! Clean fresh start for this week.', 'success');
    await loadAllData();
  };

  const dismissPastWeekSettledPrompt = (weekId: string) => {
    sessionStorage.setItem(`sharesplit_week_dismissed_${weekId}`, 'true');
    setPendingPastWeekSettlement(null);
    closeModal();
  };

  const addOrUpdateExpense = async (expense: Expense, forceReopen: boolean = false) => {
    try {
      const isEditingExisting = !!(expense.id && !expense.id.startsWith('new-'));
      const { week, isClosed } = await storageService.getOrCreateWeekForDate(expense.date);

      if (isClosed && !forceReopen && !isEditingExisting) {
        setPendingReopen({ expense, week });
        openModal('reopen-week-confirm');
        return;
      }

      if (isClosed && (forceReopen || isEditingExisting)) {
        await storageService.reopenWeek(week.id);
        localStorage.removeItem(`sharesplit_week_settled_${week.id}`);
        sessionStorage.removeItem(`sharesplit_week_dismissed_${week.id}`);
        showToast(`Week ${week.startDate} to ${week.endDate} reopened to log expense.`);
      }

      if (!expense.participants || expense.participants.length === 0) {
        expense.participants = members.filter((m) => m.isActive !== false).map((m) => m.id);
      }

      expense.weekId = week.id;

      await storageService.saveExpense(expense);
      await loadAllData();
      showToast(`Expense "${expense.description}" saved!`, 'success');
      closeModal();
    } catch (err: any) {
      console.error('Failed to save expense:', err);
      showToast(err.message || 'Error saving expense. Please try again.', 'error');
    }
  };

  const confirmReopenAndAddExpense = async () => {
    if (!pendingReopen) return;
    const { expense, week } = pendingReopen;
    setPendingReopen(null);
    await addOrUpdateExpense(expense, true);
  };

  const cancelReopenExpense = () => {
    setPendingReopen(null);
    closeModal();
  };

  const deleteExpense = async (id: string) => {
    try {
      await storageService.deleteExpense(id);
      await loadAllData();
    } catch (err: any) {
      console.error('Failed to delete expense:', err);
      showToast(err.message || 'Error deleting expense', 'error');
    }
  };

  const addMember = async (name: string, nickname = '', color = 'bg-slate-500') => {
    try {
      await storageService.addMember(name.trim(), nickname.trim(), color);
      await loadAllData();
      showToast(`Added new member "${name}"`);
    } catch (err: any) {
      console.error('Failed to add member:', err);
      showToast(err.message || 'Error adding member', 'error');
    }
  };

  const updateMember = async (updatedMember: Person) => {
    try {
      await storageService.updateMember(updatedMember);
      await loadAllData();
      showToast(`Updated details for "${updatedMember.name}"`);
    } catch (err: any) {
      console.error('Failed to update member:', err);
      showToast(err.message || 'Error updating member', 'error');
    }
  };

  const requestRemoveMember = (id: string) => {
    const activeCount = members.filter((m) => m.isActive !== false).length;
    if (activeCount <= 2) {
      showToast('Group must have at least 2 active members.', 'error');
      return;
    }

    const target = members.find((m) => m.id === id);
    if (!target) return;

    setPendingRemoveMember(target);
    openModal('remove-member-confirm');
  };

  const confirmRemoveMember = async () => {
    if (pendingRemoveMember) {
      try {
        const { wasDeactivated, wasDeleted } = await storageService.removeOrDeactivateMember(
          pendingRemoveMember.id
        );
        await loadAllData();

        if (wasDeleted) {
          showToast(`Member "${pendingRemoveMember.name}" removed from group`);
        } else if (wasDeactivated) {
          showToast(
            `Member "${pendingRemoveMember.name}" has recorded expenses. Moved to past inactive members so historical math remains exact.`
          );
        }
      } catch (err: any) {
        console.error('Failed to remove member:', err);
        showToast(err.message || 'Error removing member', 'error');
      }
      setPendingRemoveMember(null);
      closeModal();
    }
  };

  const cancelRemoveMember = () => {
    setPendingRemoveMember(null);
    closeModal();
  };

  const reactivateMember = async (id: string) => {
    try {
      await storageService.reactivateMember(id);
      await loadAllData();
      const target = members.find((m) => m.id === id);
      showToast(`Reactivated "${target?.name || 'member'}"`);
      closeModal();
    } catch (err: any) {
      console.error('Failed to reactivate member:', err);
      showToast(err.message || 'Error reactivating member', 'error');
    }
  };

  const saveBill = async (bill: Bill, imageData?: string): Promise<Bill> => {
    try {
      const savedBill = await storageService.saveBill(bill, imageData);
      await loadAllData();
      return savedBill;
    } catch (err: any) {
      console.error('Failed to save bill:', err);
      showToast(err.message || 'Error saving bill', 'error');
      throw err;
    }
  };

  const deleteBill = async (billId: string, deleteRelatedExpense: boolean = false) => {
    try {
      const targetBill = bills.find((b) => b.id === billId);
      await storageService.deleteBill(billId);
      
      if (deleteRelatedExpense && targetBill?.expenseId) {
        await storageService.deleteExpense(targetBill.expenseId);
      }
      
      await loadAllData();
      showToast('Bill receipt deleted successfully');
      closeModal();
    } catch (err: any) {
      console.error('Failed to delete bill:', err);
      showToast(err.message || 'Error deleting bill', 'error');
    }
  };

  const toggleTheme = () => {
    const current = settings.theme;
    const next: 'light' | 'dark' | 'system' = current === 'dark' ? 'light' : 'dark';
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    const updated: GroupSettings = { ...settings, theme: next };
    setSettings(updated);
    storageService.saveSettings(updated).catch(() => {});
  };

  const updateSettings = async (newSettings: GroupSettings) => {
    if (newSettings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (newSettings.theme === 'light') {
      document.documentElement.classList.remove('dark');
    }
    setSettings(newSettings);
    try {
      await storageService.saveSettings(newSettings);
      showToast('Group settings updated');
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      showToast('Saved locally, but API failed', 'info');
    }
  };

  const closeCurrentWeek = async () => {
    try {
      await storageService.closeWeek(currentWeek.id);
      await loadAllData();
      showToast('Week archived! Started new week', 'success');
      closeModal();
    } catch (err: any) {
      console.error('Failed to close week:', err);
      showToast(err.message || 'Error closing week', 'error');
    }
  };

  const resetAllData = async () => {
    try {
      await storageService.clearAllDataToFreshStart();
      await loadAllData();
      showToast('Fresh start: Cleared all expenses and reset to 0 balance', 'info');
    } catch (err: any) {
      console.error('Failed to reset data:', err);
      showToast('Reset failed', 'error');
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        userGroups,
        activeGroupId,
        currentGroup,
        login,
        register,
        logout,
        switchGroup,
        createNewGroup,
        joinGroupWithCode,
        loadAllData,
        expenses,
        members,
        bills,
        currentWeek,
        historicalWeeks,
        settings,
        activeSection,
        activeModal,
        selectedExpense,
        selectedMember,
        selectedBill,
        pendingReopen,
        pendingRemoveMember,
        pendingPastWeekSettlement,
        showInactiveMembers,
        toast,
        setActiveSection,
        openModal,
        closeModal,
        showToast,
        toggleShowInactiveMembers,
        addOrUpdateExpense,
        confirmReopenAndAddExpense,
        cancelReopenExpense,
        confirmPastWeekSettled,
        dismissPastWeekSettledPrompt,
        deleteExpense,
        addMember,
        updateMember,
        requestRemoveMember,
        confirmRemoveMember,
        cancelRemoveMember,
        reactivateMember,
        saveBill,
        deleteBill,
        updateSettings,
        toggleTheme,
        closeCurrentWeek,
        resetAllData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
