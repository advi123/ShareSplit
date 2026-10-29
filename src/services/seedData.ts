import { Person, Expense, Week, GroupSettings, Bill } from '../types';

export const INITIAL_MEMBERS: Person[] = [
  {
    id: 'p1',
    name: 'You',
    nickname: 'Me',
    isYou: true,
    color: 'emerald',
    avatar: 'Y',
    isActive: true,
    joinedAt: '2026-08-01'
  },
  {
    id: 'p2',
    name: 'Person B',
    nickname: 'Ben',
    color: 'indigo',
    avatar: 'B',
    isActive: true,
    joinedAt: '2026-08-01'
  },
  {
    id: 'p3',
    name: 'Person C',
    nickname: 'Chloe',
    color: 'amber',
    avatar: 'C',
    isActive: true,
    joinedAt: '2026-08-01'
  }
];

export const INITIAL_SETTINGS: GroupSettings = {
  groupName: 'Home',
  currency: '₹',
  weekStartsOn: 'Monday',
  defaultCategory: 'Groceries',
  theme: 'light'
};

export const INITIAL_CURRENT_WEEK: Week = {
  id: 'week-2026-08-10',
  startDate: '2026-08-10',
  endDate: '2026-08-16',
  status: 'active'
};

export const INITIAL_HISTORICAL_WEEKS: Week[] = [
  {
    id: 'week-2026-08-03',
    startDate: '2026-08-03',
    endDate: '2026-08-09',
    status: 'closed',
    closedAt: '2026-08-09T23:59:59Z',
    totalSpent: 5420,
    settlementSummary: {
      netBalances: { p1: 420, p2: -120, p3: -300 },
      simplifiedTransactions: [
        { id: 'tx-hist-1', from: 'p2', to: 'p1', amount: 120 },
        { id: 'tx-hist-2', from: 'p3', to: 'p1', amount: 300 }
      ]
    }
  }
];

export const INITIAL_BILLS: Bill[] = [
  {
    id: 'bill-exp-3',
    expenseId: 'exp-3',
    fileName: 'blinkit_receipt_aug12.png',
    storeName: 'Blinkit Instant Superstore',
    category: 'Blinkit',
    totalAmount: 450,
    paidBy: 'p3',
    date: '2026-08-12',
    uploadedAt: '2026-08-12T19:45:00Z',
    imageData: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600" fill="none"><rect width="400" height="600" fill="%23FAFAFA"/><rect x="20" y="20" width="360" height="560" rx="12" fill="white" stroke="%23E2E8F0" stroke-width="2"/><text x="200" y="60" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="20" fill="%230F172A">BLINKIT INSTANT</text><text x="200" y="85" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%2364748B">Order %23BLK-88291 • Aug 12, 2026</text><line x1="40" y1="110" x2="360" y2="110" stroke="%23E2E8F0" stroke-dasharray="4 4"/><text x="40" y="150" font-family="sans-serif" font-weight="bold" font-size="14" fill="%23334155">Basmati Rice 5kg</text><text x="360" y="150" text-anchor="end" font-family="sans-serif" font-weight="bold" font-size="14" fill="%230F172A">₹150.00</text><text x="40" y="170" font-family="sans-serif" font-size="11" fill="%2394A3B8">Shared by: You, Person B, Person C</text><text x="40" y="220" font-family="sans-serif" font-weight="bold" font-size="14" fill="%23334155">Full Cream Milk (2L)</text><text x="360" y="220" text-anchor="end" font-family="sans-serif" font-weight="bold" font-size="14" fill="%230F172A">₹100.00</text><text x="40" y="240" font-family="sans-serif" font-size="11" fill="%2394A3B8">Shared by: You, Person B</text><text x="40" y="290" font-family="sans-serif" font-weight="bold" font-size="14" fill="%23334155">Personal Chips %26 Soda</text><text x="360" y="290" text-anchor="end" font-family="sans-serif" font-weight="bold" font-size="14" fill="%230F172A">₹200.00</text><text x="40" y="310" font-family="sans-serif" font-size="11" fill="%2394A3B8">Shared by: Person C</text><line x1="40" y1="350" x2="360" y2="350" stroke="%230F172A" stroke-width="2"/><text x="40" y="390" font-family="sans-serif" font-weight="extrabold" font-size="16" fill="%230F172A">TOTAL AMOUNT</text><text x="360" y="390" text-anchor="end" font-family="sans-serif" font-weight="black" font-size="20" fill="%2316A34A">₹450.00</text><text x="200" y="440" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%23475569">Paid by: Person C</text><text x="200" y="530" text-anchor="middle" font-family="sans-serif" font-size="11" fill="%2394A3B8">ShareSplit Verified Digital Receipt</text></svg>`
  }
];

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    date: '2026-08-10',
    description: 'Travel to City Center',
    category: 'Travel',
    type: 'simple',
    source: 'manual',
    paidBy: 'p1',
    totalAmount: 900,
    participants: ['p1', 'p2', 'p3'],
    createdAt: '2026-08-10T10:30:00Z',
    weekId: 'week-2026-08-10'
  },
  {
    id: 'exp-2',
    date: '2026-08-11',
    description: 'Weekly Vegetables & Staples',
    category: 'Groceries',
    type: 'simple',
    source: 'manual',
    paidBy: 'p2',
    totalAmount: 600,
    participants: ['p1', 'p2', 'p3'],
    createdAt: '2026-08-11T16:15:00Z',
    weekId: 'week-2026-08-10'
  },
  {
    id: 'exp-3',
    date: '2026-08-12',
    description: 'Blinkit Instant Order',
    category: 'Blinkit',
    type: 'itemized',
    source: 'bill',
    paidBy: 'p3',
    totalAmount: 450,
    participants: ['p1', 'p2', 'p3'],
    billId: 'bill-exp-3',
    items: [
      { id: 'item-1', name: 'Basmati Rice 5kg', amount: 150, participants: ['p1', 'p2', 'p3'] },
      { id: 'item-2', name: 'Full Cream Milk (2L)', amount: 100, participants: ['p1', 'p2'] },
      { id: 'item-3', name: 'Personal Chips & Soda', amount: 200, participants: ['p3'] }
    ],
    createdAt: '2026-08-12T19:45:00Z',
    weekId: 'week-2026-08-10'
  },
  {
    id: 'exp-4',
    date: '2026-08-13',
    description: 'Group Dinner Outing',
    category: 'Food',
    type: 'simple',
    source: 'manual',
    paidBy: 'p1',
    totalAmount: 750,
    participants: ['p1', 'p2', 'p3'],
    createdAt: '2026-08-13T21:00:00Z',
    weekId: 'week-2026-08-10'
  },
  {
    id: 'exp-5',
    date: '2026-08-14',
    description: 'Cab Ride to Office',
    category: 'Travel',
    type: 'simple',
    source: 'manual',
    paidBy: 'p2',
    totalAmount: 300,
    participants: ['p1', 'p2'],
    createdAt: '2026-08-14T09:10:00Z',
    weekId: 'week-2026-08-10'
  },
  {
    id: 'exp-6',
    date: '2026-08-15',
    description: 'Supermarket Stockup',
    category: 'Groceries',
    type: 'simple',
    source: 'manual',
    paidBy: 'p3',
    totalAmount: 900,
    participants: ['p1', 'p2', 'p3'],
    createdAt: '2026-08-15T14:20:00Z',
    weekId: 'week-2026-08-10'
  }
];
