import { Person, Expense, Week, GroupSettings, Bill, AuthResponse, GroupBrief } from '../types';

export const BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://127.0.0.1:8000/api';

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

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem('sharesplit_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const groupId = localStorage.getItem('sharesplit_active_group_id');
  if (groupId) {
    headers['X-Group-Id'] = groupId;
  }
  return headers;
}

export async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const authHeaders = getAuthHeaders();
  const mergedHeaders = {
    ...authHeaders,
    ...(init?.headers || {})
  };
  return fetch(url, {
    ...init,
    headers: mergedHeaders
  });
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
  if (res.status === 204) {
    return null;
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
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
    isSettled: meta?.isSettled,
    source: e.source,
    paidBy: e.paid_by,
    totalAmount: e.total_amount,
    participants: e.participants ? e.participants.map((p: any) => p.member_id) : [],
    items: e.items
      ? e.items.map((i: any) => ({
          id: i.id,
          name: i.name,
          amount: i.amount,
          participants: i.participants ? i.participants.map((ip: any) => ip.member_id) : []
        }))
      : undefined,
    notes: decodedNotes,
    billId: e.bill_id || null,
    createdAt: e.created_at,
    weekId: e.week_id
  };
}

function normalizeGroupBrief(g: any): GroupBrief {
  return {
    id: g.id,
    name: g.name,
    currency: g.currency || '₹',
    weekStartDay: g.week_start_day || g.weekStartDay || 'Monday',
    groupType: g.group_type || g.groupType || 'home',
    group_type: g.group_type || g.groupType || 'home',
    inviteCode: g.invite_code || g.inviteCode,
    role: g.role || 'member'
  };
}

export const apiService = {
  auth: {
    async register(data: { email: string; password: string; name: string; group_name?: string; invite_code?: string }): Promise<AuthResponse> {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const dataRes = await handleResponse(res);
      if (dataRes.access_token) {
        localStorage.setItem('sharesplit_token', dataRes.access_token);
        if (dataRes.active_group_id) {
          localStorage.setItem('sharesplit_active_group_id', dataRes.active_group_id);
        }
      }
      if (dataRes.groups) {
        dataRes.groups = dataRes.groups.map(normalizeGroupBrief);
      }
      return dataRes;
    },

    async login(data: { email: string; password: string }): Promise<AuthResponse> {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const dataRes = await handleResponse(res);
      if (dataRes.access_token) {
        localStorage.setItem('sharesplit_token', dataRes.access_token);
        if (dataRes.active_group_id) {
          localStorage.setItem('sharesplit_active_group_id', dataRes.active_group_id);
        }
      }
      if (dataRes.groups) {
        dataRes.groups = dataRes.groups.map(normalizeGroupBrief);
      }
      return dataRes;
    },

    async getMe(): Promise<AuthResponse> {
      const res = await authFetch(`${BASE_URL}/auth/me`);
      const dataRes = await handleResponse(res);
      if (dataRes.groups) {
        dataRes.groups = dataRes.groups.map(normalizeGroupBrief);
      }
      return dataRes;
    },

    logout() {
      localStorage.removeItem('sharesplit_token');
      localStorage.removeItem('sharesplit_active_group_id');
      localStorage.removeItem('sharesplit_cached_data_v1');
    }
  },

  groups: {
    async create(name: string, currency = '₹', groupType: 'home' | 'trip' = 'home'): Promise<GroupBrief> {
      const res = await authFetch(`${BASE_URL}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, currency, group_type: groupType })
      });
      const data = await handleResponse(res);
      return normalizeGroupBrief(data);
    },

    async join(inviteCode: string): Promise<GroupBrief> {
      const res = await authFetch(`${BASE_URL}/groups/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: inviteCode })
      });
      const data = await handleResponse(res);
      return normalizeGroupBrief(data);
    },

    async delete(groupId: string): Promise<void> {
      const res = await authFetch(`${BASE_URL}/groups/${groupId}`, {
        method: 'DELETE'
      });
      await handleResponse(res);
    }
  },

  members: {
    async getAll(includeInactive = true): Promise<Person[]> {
      const res = await authFetch(`${BASE_URL}/members?include_inactive=${includeInactive}`);
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
      const res = await authFetch(`${BASE_URL}/members`, {
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
      const res = await authFetch(`${BASE_URL}/members/${id}`, {
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
      const res = await authFetch(`${BASE_URL}/members/${id}/reactivate`, { method: 'POST' });
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
      const res = await authFetch(`${BASE_URL}/members/${id}`, { method: 'DELETE' });
      return handleResponse(res);
    }
  },

  expenses: {
    async getOne(id: string): Promise<Expense> {
      const res = await authFetch(`${BASE_URL}/expenses/${id}`);
      if (res.status === 404) {
        const errMsg = `Expense not found. Requested ID: ${id}, Endpoint: GET /api/expenses/${id}`;
        console.error(errMsg);
        throw new Error(errMsg);
      }
      const data = await handleResponse(res);
      return parseExpenseFromApi(data);
    },

    async getAll(): Promise<Expense[]> {
      const res = await authFetch(`${BASE_URL}/expenses`);
      const data = await handleResponse(res);
      return data.map(parseExpenseFromApi);
    },

    async create(expense: Expense): Promise<Expense> {
      const meta: SplitMeta = {
        paidByMap: expense.paidByMap,
        customShares: expense.customShares,
        splitType: expense.splitType || (expense.type === 'custom' ? 'unequal' : undefined),
        isSettled: expense.isSettled
      };

      const encodedNotes = encodeNotesWithMeta(expense.notes, meta);

      const payload = {
        description: expense.description,
        total_amount: expense.totalAmount,
        paid_by: expense.paidBy,
        category: expense.category,
        date: expense.date,
        type: expense.type === 'itemized' ? 'itemized' : 'simple',
        source: expense.source,
        notes: encodedNotes,
        participants: expense.participants,
        items: expense.items
          ? expense.items.map((i) => ({
              name: i.name,
              amount: i.amount,
              participants: i.participants
            }))
          : undefined,
        bill_id: expense.billId || undefined
      };

      const res = await authFetch(`${BASE_URL}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await handleResponse(res);
      return parseExpenseFromApi(data);
    },

    async update(id: string, expense: Partial<Expense>): Promise<Expense> {
      const meta: SplitMeta = {
        paidByMap: expense.paidByMap,
        customShares: expense.customShares,
        splitType: expense.splitType || (expense.type === 'custom' ? 'unequal' : undefined),
        isSettled: expense.isSettled
      };

      const encodedNotes = encodeNotesWithMeta(expense.notes, meta);

      const payload = {
        description: expense.description,
        total_amount: expense.totalAmount,
        paid_by: expense.paidBy,
        category: expense.category,
        date: expense.date,
        type: expense.type === 'itemized' ? 'itemized' : 'simple',
        source: expense.source,
        notes: encodedNotes,
        participants: expense.participants,
        items: expense.items
          ? expense.items.map((i) => ({
              name: i.name,
              amount: i.amount,
              participants: i.participants
            }))
          : undefined,
        bill_id: expense.billId || undefined
      };

      const res = await authFetch(`${BASE_URL}/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await handleResponse(res);
      return parseExpenseFromApi(data);
    },

    async delete(id: string): Promise<void> {
      const res = await authFetch(`${BASE_URL}/expenses/${id}`, { method: 'DELETE' });
      await handleResponse(res);
    }
  },

  bills: {
    async getAll(): Promise<Bill[]> {
      const res = await authFetch(`${BASE_URL}/bills`);
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

      const res = await authFetch(`${BASE_URL}/bills/upload`, {
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
      const res = await authFetch(`${BASE_URL}/bills/${id}`, { method: 'DELETE' });
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
      const res = await authFetch(`${BASE_URL}/bills/parse-ai`, {
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
      const res = await authFetch(`${BASE_URL}/weeks`);
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
      const res = await authFetch(`${BASE_URL}/weeks/${id}/close`, { method: 'POST' });
      await handleResponse(res);
    },

    async reopen(id: string): Promise<void> {
      const res = await authFetch(`${BASE_URL}/weeks/${id}/reopen`, { method: 'POST' });
      await handleResponse(res);
    }
  },

  settings: {
    async get(): Promise<GroupSettings> {
      const res = await authFetch(`${BASE_URL}/settings`);
      const s = await handleResponse(res);
      const localTheme = localStorage.getItem('sharesplit_theme') as 'light' | 'dark' | 'system' || 'light';
      return {
        groupName: s.group_name,
        currency: s.currency,
        weekStartsOn: s.week_starts_on,
        defaultCategory: s.default_category || 'Groceries',
        theme: localTheme,
        groupType: s.group_type || 'home',
        geminiApiKey: s.gemini_api_key || undefined,
        inviteCode: s.invite_code || undefined
      };
    },

    async save(settings: GroupSettings): Promise<GroupSettings> {
      if (settings.theme) {
        localStorage.setItem('sharesplit_theme', settings.theme);
        if (settings.theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else if (settings.theme === 'light') {
          document.documentElement.classList.remove('dark');
        }
      }
      const res = await authFetch(`${BASE_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_name: settings.groupName,
          currency: settings.currency,
          week_starts_on: settings.weekStartsOn,
          default_category: settings.defaultCategory,
          gemini_api_key: settings.geminiApiKey || undefined
        })
      });
      await handleResponse(res);
      return settings;
    },

    async update(settings: GroupSettings): Promise<GroupSettings> {
      return this.save(settings);
    }
  },

  settlements: {
    async getDaily(date: string) {
      const res = await authFetch(`${BASE_URL}/settlements/daily?date=${date}`);
      return handleResponse(res);
    },
    async getWeekly(weekId: string) {
      const res = await authFetch(`${BASE_URL}/settlements/weekly/${weekId}`);
      return handleResponse(res);
    },
    async getCustom(fromDate: string, toDate: string) {
      const res = await authFetch(`${BASE_URL}/settlements/custom?from_date=${fromDate}&to_date=${toDate}`);
      return handleResponse(res);
    }
  }
};
