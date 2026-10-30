import React, { createContext, useContext, useState, useEffect } from 'react';
import { Expense, Person, Week, GroupSettings, NavSection, Bill } from '../types';
import { storageService } from '../services/storageService';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

interface AppContextType {
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
  closeCurrentWeek: () => void;
  resetAllData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [members, setMembers] = useState<Person[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [currentWeek, setCurrentWeek] = useState<Week>({ id: '', startDate: '', endDate: '', status: 'active' });
  const [historicalWeeks, setHistoricalWeeks] = useState<Week[]>([]);
  const [settings, setSettings] = useState<GroupSettings>({
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
    loadAllData();
  }, []);

  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  const loadAllData = async () => {
    try {
      const fetchedMembers = await storageService.getMembers();
      const fetchedExpenses = await storageService.getExpenses();
      const fetchedBills = await storageService.getBills();
      const fetchedCurrentWeek = await storageService.getCurrentWeek();
      const fetchedHistoricalWeeks = await storageService.getHistoricalWeeks();
      const fetchedSettings = await storageService.getSettings();

      setMembers(fetchedMembers);
      setExpenses(fetchedExpenses);
      setBills(fetchedBills);
      setCurrentWeek(fetchedCurrentWeek);
      setHistoricalWeeks(fetchedHistoricalWeeks);
      setSettings(fetchedSettings);

      // Only ask about the past week which is NOT closed!
      // Once entered as cleared, it is closed in the backend and never prompted again.
      // Older weeks and already-closed weeks are never prompted.
      const immediatelyPrecedingWeek = fetchedHistoricalWeeks[0];
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
    await loadAllData();
    showToast('Week cleared and closed successfully!', 'success');
    closeModal();
    setPendingPastWeekSettlement(null);
  };

  const dismissPastWeekSettledPrompt = async (weekId: string) => {
    sessionStorage.setItem(`sharesplit_week_dismissed_${weekId}`, 'true');
    closeModal();
    setPendingPastWeekSettlement(null);
    showToast('Week kept active! You can settle and close it anytime from History.', 'info');
  };

  const addOrUpdateExpense = async (expense: Expense, forceReopen = false) => {
    try {
      const isEditingExisting = !!(expense.id && !expense.id.startsWith('new-'));
      const { week, isClosed } = await storageService.getOrCreateWeekForDate(expense.date);

      if (isClosed && !forceReopen && !isEditingExisting) {
        setPendingReopen({ expense, week });
        setActiveModal('reopen-week-warning');
        return;
      }

      if (isClosed && (forceReopen || isEditingExisting)) {
        await storageService.reopenWeek(week.id);
        localStorage.removeItem(`sharesplit_week_settled_${week.id}`);
        sessionStorage.removeItem(`sharesplit_week_dismissed_${week.id}`);
      }

      // Close modal immediately and update UI optimistically (0ms response)
      closeModal();
      setPendingReopen(null);

      const isNew = !expense.id || expense.id.startsWith('new-');
      const optimisticId = isNew ? `temp-${Date.now()}` : expense.id;
      const optimisticItem: Expense = {
        ...expense,
        id: optimisticId,
        weekId: expense.weekId || week.id
      };

      setExpenses((prev) =>
        isNew ? [optimisticItem, ...prev] : prev.map((e) => (e.id === expense.id ? optimisticItem : e))
      );

      await storageService.saveExpense(expense);
      await loadAllData();
      showToast(`Expense "${expense.description}" saved!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save expense', 'error');
      await loadAllData();
    }
  };

  const confirmReopenAndAddExpense = async () => {
    if (pendingReopen) {
      await addOrUpdateExpense(pendingReopen.expense, true);
    }
  };

  const cancelReopenExpense = () => {
    setPendingReopen(null);
    closeModal();
  };

  const deleteExpense = async (id: string) => {
    try {
      const target = expenses.find((e) => e.id === id);
      // Close modal and remove from UI immediately (0ms response)
      closeModal();
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      showToast(`Deleted expense "${target?.description || 'item'}"`, 'info');

      await storageService.deleteExpense(id);
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete expense', 'error');
      await loadAllData();
    }
  };

  const addMember = async (name: string, nickname = '', color = 'indigo') => {
    try {
      await storageService.addMember(name.trim(), nickname.trim(), color);
      await loadAllData();
      showToast(`Added new member "${name}"`);
      closeModal();
    } catch (err: any) {
      showToast(err.message || 'Failed to add member', 'error');
    }
  };

  const updateMember = async (updatedMember: Person) => {
    try {
      await storageService.updateMember(updatedMember);
      await loadAllData();
      showToast(`Updated details for "${updatedMember.name}"`);
      closeModal();
    } catch (err: any) {
      showToast(err.message || 'Failed to update member', 'error');
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
    setActiveModal('remove-member-confirm');
  };

  const confirmRemoveMember = async () => {
    if (pendingRemoveMember) {
      try {
        const { wasDeactivated, wasDeleted } = await storageService.removeOrDeactivateMember(
          pendingRemoveMember.id
        );
        await loadAllData();
        if (wasDeactivated) {
          showToast(`Deactivated "${pendingRemoveMember.name}" while retaining historical records.`, 'info');
        } else if (wasDeleted) {
          showToast(`Permanently removed "${pendingRemoveMember.name}".`, 'info');
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to remove member', 'error');
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
      showToast(err.message || 'Failed to reactivate member', 'error');
    }
  };

  const saveBill = async (bill: Bill, imageData?: string): Promise<Bill> => {
    try {
      const savedBill = await storageService.saveBill(bill, imageData);
      await loadAllData();
      return savedBill;
    } catch (err: any) {
      showToast(err.message || 'Failed to upload receipt image', 'error');
      throw err;
    }
  };

  const deleteBill = async (billId: string, deleteRelatedExpense = false) => {
    try {
      const targetBill = bills.find((b) => b.id === billId);
      await storageService.deleteBill(billId);
      
      if (deleteRelatedExpense && targetBill?.expenseId) {
        await storageService.deleteExpense(targetBill.expenseId);
      }
      
      await loadAllData();
      showToast(`Deleted bill "${targetBill?.storeName || 'receipt'}"`, 'info');
      closeModal();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete bill', 'error');
    }
  };

  const updateSettings = async (newSettings: GroupSettings) => {
    try {
      await storageService.saveSettings(newSettings);
      await loadAllData();
      showToast('Group settings updated');
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    }
  };

  const closeCurrentWeek = async () => {
    try {
      await storageService.closeWeek(currentWeek.id);
      await loadAllData();
      showToast('Week archived! Started new week', 'success');
      closeModal();
      setActiveSection('history');
    } catch (err: any) {
      showToast(err.message || 'Failed to close week', 'error');
    }
  };

  const resetAllData = async () => {
    try {
      await storageService.clearAllDataToFreshStart();
      await loadAllData();
      showToast('Fresh start: Cleared all expenses and reset to 0 balance', 'info');
      closeModal();
    } catch (err: any) {
      showToast(err.message || 'Failed to reset data', 'error');
    }
  };

  return (
    <AppContext.Provider
      value={{
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
