import { Person, Expense, Week, GroupSettings, Bill } from '../types';
import { apiService } from './apiService';

export const storageService = {
  // Members
  async getMembers(includeInactive = true): Promise<Person[]> {
    return apiService.members.getAll(includeInactive);
  },

  async addMember(name: string, nickname = '', color = 'bg-slate-500'): Promise<Person> {
    return apiService.members.create(name, nickname, color);
  },

  async updateMember(member: Person): Promise<Person> {
    return apiService.members.update(member.id, member.name, member.nickname || '', member.avatar || '', member.color || '');
  },

  async reactivateMember(id: string): Promise<Person> {
    return apiService.members.reactivate(id);
  },

  async removeOrDeactivateMember(id: string): Promise<{ wasDeactivated: boolean; wasDeleted: boolean }> {
    const res = await apiService.members.delete(id);
    return {
      wasDeactivated: res.action === 'deactivated',
      wasDeleted: res.action === 'deleted'
    };
  },

  // Settings
  async getSettings(): Promise<GroupSettings> {
    return apiService.settings.get();
  },

  async saveSettings(settings: GroupSettings): Promise<GroupSettings> {
    return apiService.settings.update(settings);
  },

  // Weeks
  async getCurrentWeek(): Promise<Week> {
    const weeks = await apiService.weeks.getAll();
    try {
      const settings = await this.getSettings().catch(() => ({ weekStartsOn: 'Monday' } as any));
      const { getWeekInfoForDate } = await import('../utils/dateUtils');
      const todayStr = new Date().toISOString().split('T')[0];
      const currentWeekInfo = getWeekInfoForDate(todayStr, settings?.weekStartsOn || 'Monday');

      const matchedCurrent = weeks.find(
        (w) => (w.startDate === currentWeekInfo.startDate && w.endDate === currentWeekInfo.endDate) || w.id === currentWeekInfo.weekId
      );
      if (matchedCurrent) return matchedCurrent;
    } catch (e) {
      console.warn('Could not match current week by date', e);
    }
    const active = weeks.find((w) => w.status === 'active');
    if (active) return active;
    return weeks[0] || { id: '', startDate: '', endDate: '', status: 'active' };
  },

  async getHistoricalWeeks(): Promise<Week[]> {
    const weeks = await apiService.weeks.getAll();
    const currentWeek = await this.getCurrentWeek();
    return weeks
      .filter((w) => w.id !== currentWeek.id && w.endDate < currentWeek.startDate)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  },

  async getOrCreateWeekForDate(dateStr: string): Promise<{ week: Week; isClosed: boolean }> {
    try {
      const weeks = await apiService.weeks.getAll();
      const settings = await this.getSettings();
      const { getWeekInfoForDate } = await import('../utils/dateUtils');
      const weekInfo = getWeekInfoForDate(dateStr, settings.weekStartsOn);
      
      const matched = weeks.find((w) => w.startDate === weekInfo.startDate && w.endDate === weekInfo.endDate);
      if (matched) {
        return { week: matched, isClosed: matched.status === 'closed' };
      }
      return {
        week: {
          id: weekInfo.weekId,
          startDate: weekInfo.startDate,
          endDate: weekInfo.endDate,
          status: 'active'
        },
        isClosed: false
      };
    } catch (err) {
      console.error('Failed to resolve week for date', err);
      return {
        week: { id: '', startDate: '', endDate: '', status: 'active' },
        isClosed: false
      };
    }
  },

  async reopenWeek(weekId: string): Promise<void> {
    return apiService.weeks.reopen(weekId);
  },

  async closeWeek(weekId: string): Promise<{ newCurrentWeek: Week }> {
    await apiService.weeks.close(weekId);
    const current = await this.getCurrentWeek();
    return { newCurrentWeek: current };
  },

  // Expenses
  async getExpense(id: string): Promise<Expense> {
    return apiService.expenses.getOne(id);
  },

  async getExpenses(): Promise<Expense[]> {
    return apiService.expenses.getAll();
  },

  async saveExpense(expense: Expense): Promise<Expense> {
    if (!expense.id || expense.id.startsWith('new-')) {
      return apiService.expenses.create(expense);
    } else {
      return apiService.expenses.update(expense.id, expense);
    }
  },

  async deleteExpense(id: string): Promise<void> {
    return apiService.expenses.delete(id);
  },

  // Bills
  async getBills(): Promise<Bill[]> {
    return apiService.bills.getAll();
  },

  async saveBill(bill: Bill, imageData?: string): Promise<Bill> {
    if (!imageData) {
      throw new Error('Image data required for bill upload');
    }
    return apiService.bills.upload(bill.fileName, imageData);
  },

  async deleteBill(billId: string): Promise<void> {
    return apiService.bills.delete(billId);
  },

  async clearAllDataToFreshStart(): Promise<void> {
    await this.saveSettings({
      groupName: 'Home',
      currency: '₹',
      weekStartsOn: 'Monday',
      defaultCategory: 'Groceries',
      theme: (localStorage.getItem('sharesplit_theme') as 'light' | 'dark' | 'system') || 'light'
    });
    
    const expenses = await this.getExpenses();
    for (const e of expenses) {
      try {
        await this.deleteExpense(e.id);
      } catch {}
    }
    
    const bills = await this.getBills();
    for (const b of bills) {
      try {
        await this.deleteBill(b.id);
      } catch {}
    }
    
    const members = await this.getMembers(true);
    for (const m of members) {
      if (!['mem-you', 'mem-b', 'mem-c'].includes(m.id)) {
        try {
          await fetch(`http://127.0.0.1:8000/api/members/${m.id}`, { method: 'DELETE' });
        } catch {}
      } else if (!m.isActive) {
        try {
          await this.reactivateMember(m.id);
        } catch {}
      }
    }

    // Seed default mock expenses mapped to the correct backend member IDs ('mem-you', 'mem-b', 'mem-c')
    const seedExpenses: Omit<Expense, 'id' | 'weekId'>[] = [
      {
        date: '2026-08-10',
        description: 'Travel to City Center',
        category: 'Travel',
        type: 'simple',
        source: 'manual',
        paidBy: 'mem-you',
        totalAmount: 900,
        participants: ['mem-you', 'mem-b', 'mem-c'],
        createdAt: '2026-08-10T10:30:00Z'
      },
      {
        date: '2026-08-11',
        description: 'Weekly Vegetables & Staples',
        category: 'Groceries',
        type: 'simple',
        source: 'manual',
        paidBy: 'mem-b',
        totalAmount: 600,
        participants: ['mem-you', 'mem-b', 'mem-c'],
        createdAt: '2026-08-11T16:15:00Z'
      },
      {
        date: '2026-08-13',
        description: 'Group Dinner Outing',
        category: 'Food',
        type: 'simple',
        source: 'manual',
        paidBy: 'mem-you',
        totalAmount: 750,
        participants: ['mem-you', 'mem-b', 'mem-c'],
        createdAt: '2026-08-13T21:00:00Z'
      },
      {
        date: '2026-08-14',
        description: 'Cab Ride to Office',
        category: 'Travel',
        type: 'simple',
        source: 'manual',
        paidBy: 'mem-b',
        totalAmount: 300,
        participants: ['mem-you', 'mem-b'],
        createdAt: '2026-08-14T09:10:00Z'
      },
      {
        date: '2026-08-15',
        description: 'Supermarket Stockup',
        category: 'Groceries',
        type: 'simple',
        source: 'manual',
        paidBy: 'mem-c',
        totalAmount: 900,
        participants: ['mem-you', 'mem-b', 'mem-c'],
        createdAt: '2026-08-15T14:20:00Z'
      }
    ];

    for (const exp of seedExpenses) {
      try {
        await this.saveExpense({ ...exp, id: '' } as Expense);
      } catch (err) {
        console.error("Failed to seed expense during reset:", err);
      }
    }
  }
};
