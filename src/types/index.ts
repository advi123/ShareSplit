export type ExpenseCategory =
  | 'Rent'
  | 'Groceries'
  | 'Blinkit'
  | 'Food'
  | 'Travel'
  | 'Electricity'
  | 'Internet'
  | 'Household'
  | 'Cleaning'
  | 'Entertainment'
  | 'Other';

export interface Person {
  id: string;
  groupId?: string;
  name: string;
  nickname?: string;
  avatar?: string;
  color?: string;
  isYou?: boolean;
  isActive: boolean;
  joinedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Bill {
  id: string;
  expenseId?: string;
  fileName: string;
  imageData?: string; // Base64 / DataUrl or IndexedDB key
  uploadedAt: string;
  storeName?: string;
  category?: ExpenseCategory;
  totalAmount?: number;
  paidBy?: string;
  paidByName?: string;
  date?: string;
}

export interface ItemizedExpenseItem {
  id: string;
  name: string;
  amount: number;
  participants: string[]; // personIds
}

export interface Expense {
  id: string;
  groupId?: string;
  weekId: string;
  date: string; // ISO "YYYY-MM-DD"
  description: string;
  category: ExpenseCategory;
  type: 'manual' | 'simple' | 'itemized' | 'custom';
  splitType?: 'equal' | 'unequal' | 'custom' | 'itemized';
  source: 'manual' | 'bill';
  paidBy: string; // primary personId
  paidByMap?: Record<string, number>; // personId -> amount paid
  customShares?: Record<string, number>; // personId -> custom share amount
  isSettled?: boolean; // True if settled mid-way (excluded from debt accounting)
  totalAmount: number;
  participants: string[]; // personIds
  items?: ItemizedExpenseItem[];
  notes?: string;
  billId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Week {
  id: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  status: 'active' | 'closed';
  closedAt?: string;
  totalSpent?: number;
  settlementSummary?: {
    netBalances: Record<string, number>;
    simplifiedTransactions: SimplifiedTransaction[];
  };
}

export interface SimplifiedTransaction {
  id: string;
  from: string; // personId
  to: string; // personId
  amount: number;
}

export interface GroupSettings {
  groupName: string;
  currency: string;
  weekStartsOn: 'Monday' | 'Sunday';
  defaultCategory: ExpenseCategory;
  theme: 'light' | 'dark' | 'system';
  geminiApiKey?: string;
}

export type NavSection =
  | 'dashboard'
  | 'expenses'
  | 'bills'
  | 'daily-settlement'
  | 'weekly-settlement'
  | 'history'
  | 'members'
  | 'settings';
