import { Person, Expense, Week, GroupSettings, Bill } from '../types';

const BASE_URL = 'http://127.0.0.1:8000/api';

export interface SplitMeta {
  paidByMap?: Record<string, number>;
  customShares?: Record<string, number>;
  splitType?: 'equal' | 'unequal' | 'custom' | 'itemized';
  isSettled?: boolean;
}

export function encodeNotesWithMeta(userNotes: string | undefined, meta: SplitMeta): string | undefined {
  const hasPaidMap = meta.paidByMap && Object.keys(meta.paidByMap).length > 0;
  const hasCustomShares = meta.customShares && Object.keys(meta.customShares).length > 0;
  const hasSplitType = !!meta.splitType;
  const hasIsSettled = meta.isSettled !== undefined;

  if (!hasPaidMap && !hasCustomShares && !hasSplitType && !hasIsSettled) {
    return userNotes || undefined;
  }

  const metaStr = JSON.stringify({
    paidByMap: meta.paidByMap,
    customShares: meta.customShares,
    splitType: meta.splitType,
    isSettled: meta.isSettled
  });

  const prefix = `[SPLIT_META:${metaStr}]`;
  const cleanUserNotes = (userNotes || '').replace(/\[SPLIT_META:.*?\]/g, '').trim();
  if (!cleanUserNotes) return prefix;
  return `${prefix} ${cleanUserNotes}`;
}

export function decodeNotesWithMeta(rawNotes: string | undefined): { notes?: string; meta?: SplitMeta } {
  if (!rawNotes) return { notes: undefined, meta: undefined };
  const match = rawNotes.match(/\[SPLIT_META:(.*?)\]/);
  if (!match) return { notes: rawNotes, meta: undefined };
  try {
    const meta: SplitMeta = JSON.parse(match[1]);
    const cleanNotes = rawNotes.replace(/\[SPLIT_META:.*?\]/g, '').trim() || undefined;
    return { notes: cleanNotes, meta };
  } catch (err) {
    return { notes: rawNotes, meta: undefined };
  }
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    let detail = 'API Request Failed';
    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch {}
    throw new Error(detail);
  }
  return res.json();
}

function parseExpenseFromApi(e: any): Expense {
  const { notes: decodedNotes, meta } = decodeNotesWithMeta(e.notes);

  return {
    id: e.id,
    description: e.description,
    category: e.category,
    date: e.date,
    type: meta?.splitType === 'unequal' || meta?.splitType === 'custom' ? 'custom' : e.type,
    splitType: meta?.splitType,
    paidByMap: meta?.paidByMap,
    customShares: meta?.customShares,
    isSettled: meta?.isSettled || false,
    source: e.source,
    paidBy: e.paid_by,
    totalAmount: e.total_amount,
    participants: e.participants,
    items: e.items?.map((i: any) => ({
      id: i.id,
      name: i.name,
      amount: i.amount,
      participants: i.participants
    })) || [],
    notes: decodedNotes || '',
    billId: e.bill_id,
    weekId: e.week_id,
    createdAt: e.created_at
  };
}

export const apiService = {
  members: {
    async getAll(includeInactive = true): Promise<Person[]> {
      const res = await fetch(`${BASE_URL}/members?include_inactive=${includeInactive}`);
      const data = await handleResponse(res);
      return data.map((m: any) => ({
        id: m.id,
        name: m.name,
        nickname: m.nickname || '',
        avatar: m.avatar || '',
        color: m.color || 'bg-slate-500',
        joinedAt: m.joined_at,
        isActive: m.is_active
      }));
    },

    async create(name: string, nickname = '', color = 'bg-slate-500'): Promise<Person> {
      const res = await fetch(`${BASE_URL}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, nickname, color })
      });
      const m = await handleResponse(res);
      return {
        id: m.id,
        name: m.name,
        nickname: m.nickname || '',
        avatar: m.avatar || '',
        color: m.color || 'bg-slate-500',
        joinedAt: m.joined_at,
        isActive: m.is_active
      };
    },

    async update(id: string, name: string, nickname: string, avatar: string, color: string): Promise<Person> {
      const res = await fetch(`${BASE_URL}/members/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, nickname, avatar, color })
      });
      const m = await handleResponse(res);
      return {
        id: m.id,
        name: m.name,
        nickname: m.nickname || '',
        avatar: m.avatar || '',
        color: m.color || 'bg-slate-500',
        joinedAt: m.joined_at,
        isActive: m.is_active
      };
    },

    async reactivate(id: string): Promise<Person> {
      const res = await fetch(`${BASE_URL}/members/${id}/reactivate`, { method: 'POST' });
      const m = await handleResponse(res);
      return {
        id: m.id,
        name: m.name,
        nickname: m.nickname || '',
        avatar: m.avatar || '',
        color: m.color || 'bg-slate-500',
        joinedAt: m.joined_at,
        isActive: m.is_active
      };
    },

    async delete(id: string): Promise<{ action: 'deleted' | 'deactivated' }> {
      const res = await fetch(`${BASE_URL}/members/${id}`, { method: 'DELETE' });
      return handleResponse(res);
    }
  },

  expenses: {
    async getOne(id: string): Promise<Expense> {
      const res = await fetch(`${BASE_URL}/expenses/${id}`);
      if (res.status === 404) {
        const errMsg = `Expense not found. Requested ID: ${id}, Group ID: default-group, Endpoint: GET /api/expenses/${id}`;
        console.error(errMsg);
        alert(errMsg);
        throw new Error(errMsg);
      }
      const e = await handleResponse(res);
      return parseExpenseFromApi(e);
    },

    async getAll(): Promise<Expense[]> {
      const res = await fetch(`${BASE_URL}/expenses`);
      const data = await handleResponse(res);
      return data.map(parseExpenseFromApi);
    },

    async create(expense: Omit<Expense, 'id' | 'weekId'>): Promise<Expense> {
      const encodedNotes = encodeNotesWithMeta(expense.notes, {
        paidByMap: expense.paidByMap,
        customShares: expense.customShares,
        splitType: expense.splitType,
        isSettled: expense.isSettled
      });

      const payload = {
        description: expense.description,
        category: expense.category,
        date: expense.date,
        type: expense.type,
        paid_by: expense.paidBy,
        total_amount: expense.totalAmount,
        notes: encodedNotes,
        source: expense.source || 'manual',
        bill_id: expense.billId || null,
        participants: expense.participants,
        items: expense.items?.map((i) => ({
          name: i.name,
          amount: i.amount,
          participants: i.participants
        })) || []
      };

      const res = await fetch(`${BASE_URL}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await handleResponse(res);
      return parseExpenseFromApi(data);
    },

    async update(id: string, expense: Omit<Expense, 'id' | 'weekId'>): Promise<Expense> {
      const encodedNotes = encodeNotesWithMeta(expense.notes, {
        paidByMap: expense.paidByMap,
        customShares: expense.customShares,
        splitType: expense.splitType,
        isSettled: expense.isSettled
      });

      const payload = {
        description: expense.description,
        category: expense.category,
        date: expense.date,
        type: expense.type,
        paid_by: expense.paidBy,
        total_amount: expense.totalAmount,
        notes: encodedNotes,
        source: expense.source || 'manual',
        bill_id: expense.billId || null,
        participants: expense.participants,
        items: expense.items?.map((i) => ({
          name: i.name,
          amount: i.amount,
          participants: i.participants
        })) || []
      };

      const res = await fetch(`${BASE_URL}/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await handleResponse(res);
      return parseExpenseFromApi(data);
    },

    async delete(id: string): Promise<void> {
      const res = await fetch(`${BASE_URL}/expenses/${id}`, { method: 'DELETE' });
      await handleResponse(res);
    }
  },

  bills: {
    async getAll(): Promise<Bill[]> {
      const res = await fetch(`${BASE_URL}/bills`);
      const data = await handleResponse(res);
      return data.map((b: any) => ({
        id: b.id,
        expenseId: b.expense_id || undefined,
        storeName: b.store_name || b.original_filename.replace(/\.[^/.]+$/, ''),
        fileName: b.original_filename,
        category: b.category || undefined,
        totalAmount: b.total_amount !== null && b.total_amount !== undefined ? Number(b.total_amount) : undefined,
        paidBy: b.paid_by || undefined,
        paidByName: b.paid_by_name || undefined,
        date: b.date || undefined,
        uploadedAt: b.uploaded_at,
        imageData: `${BASE_URL}/bills/${b.id}/image`
      }));
    },

    async upload(fileName: string, imageData: string): Promise<Bill> {
      const byteString = atob(imageData.split(',')[1]);
      const mimeString = imageData.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      const file = new File([blob], fileName, { type: mimeString });

      const formData = new FormData();
      formData.append('files', file);

      const res = await fetch(`${BASE_URL}/bills/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await handleResponse(res);
      const saved = data[0];
      return {
        id: saved.id,
        expenseId: saved.expense_id || undefined,
        storeName: saved.original_filename.replace(/\.[^/.]+$/, ''),
        fileName: saved.original_filename,
        uploadedAt: saved.uploaded_at,
        imageData: `${BASE_URL}/bills/${saved.id}/image`
      };
    },

    async delete(id: string): Promise<void> {
      const res = await fetch(`${BASE_URL}/bills/${id}`, { method: 'DELETE' });
      await handleResponse(res);
    },

    async parseAI(imageBase64: string, apiKey?: string): Promise<{
      storeName: string;
      category: string;
      date?: string;
      deliveryFee?: number;
      handlingFee?: number;
      discount?: number;
      items: { name: string; amount: number }[];
    }> {
      const res = await fetch(`${BASE_URL}/bills/parse-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'X-Gemini-Key': apiKey } : {})
        },
        body: JSON.stringify({
          image_base64: imageBase64,
          api_key: apiKey || undefined
        })
      });
      return handleResponse(res);
    }
  },

  weeks: {
    async getAll(): Promise<Week[]> {
      const res = await fetch(`${BASE_URL}/weeks`);
      const data = await handleResponse(res);
      return data.map((w: any) => ({
        id: w.id,
        startDate: w.start_date,
        endDate: w.end_date,
        status: w.status,
        closedAt: w.closed_at,
        totalSpent: w.total_expenses
      }));
    },

    async close(id: string): Promise<void> {
      const res = await fetch(`${BASE_URL}/weeks/${id}/close`, { method: 'POST' });
      await handleResponse(res);
    },

    async reopen(id: string): Promise<void> {
      const res = await fetch(`${BASE_URL}/weeks/${id}/reopen`, { method: 'POST' });
      await handleResponse(res);
    }
  },

  settings: {
    async get(): Promise<GroupSettings> {
      const res = await fetch(`${BASE_URL}/settings`);
      const s = await handleResponse(res);
      return {
        groupName: s.group_name,
        currency: s.currency,
        weekStartsOn: s.week_starts_on,
        defaultCategory: s.default_category,
        theme: (localStorage.getItem('sharesplit_theme') as 'light' | 'dark' | 'system') || 'light'
      };
    },

    async update(settings: GroupSettings): Promise<GroupSettings> {
      localStorage.setItem('sharesplit_theme', settings.theme);
      const res = await fetch(`${BASE_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_name: settings.groupName,
          currency: settings.currency,
          week_starts_on: settings.weekStartsOn,
          default_category: settings.defaultCategory
        })
      });
      const s = await handleResponse(res);
      return {
        groupName: s.group_name,
        currency: s.currency,
        weekStartsOn: s.week_starts_on,
        defaultCategory: s.default_category,
        theme: settings.theme
      };
    }
  },

  settlements: {
    async getDaily(date: string) {
      const res = await fetch(`${BASE_URL}/settlements/daily?date=${date}`);
      return handleResponse(res);
    },
    async getWeekly(weekId: string) {
      const res = await fetch(`${BASE_URL}/settlements/weekly/${weekId}`);
      return handleResponse(res);
    },
    async getCustom(fromDate: string, toDate: string) {
      const res = await fetch(`${BASE_URL}/settlements/custom?from_date=${fromDate}&to_date=${toDate}`);
      return handleResponse(res);
    }
  }
};
