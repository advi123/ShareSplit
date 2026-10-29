import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckSquare, Square, Calculator, Layers, FileText, Upload, Users, DollarSign } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { ExpenseCategory, ItemizedExpenseItem, Expense } from '../../types';
import { getTodayStr } from '../../utils/dateUtils';

const CATEGORIES: ExpenseCategory[] = [
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

export const AddExpenseModal: React.FC = () => {
  const { activeModal, closeModal, members, settings, addOrUpdateExpense, openModal, showToast, selectedExpense } = useApp();

  const isEditing = activeModal === 'edit-expense';
  const [mode, setMode] = useState<'launcher' | 'manual'>('launcher');
  const [activeTab, setActiveTab] = useState<'simple' | 'itemized'>('simple');

  const activeMembers = members.filter((m) => m.isActive !== false);
  const todayStr = getTodayStr();

  // Manual expense fields
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>(settings.defaultCategory);
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [paidBy, setPaidBy] = useState<string>('');
  const [payerMode, setPayerMode] = useState<'single' | 'multiple'>('single');
  const [paidByMap, setPaidByMap] = useState<Record<string, string>>({});

  const [splitMethod, setSplitMethod] = useState<'equal' | 'unequal'>('equal');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [customSharesMap, setCustomSharesMap] = useState<Record<string, string>>({});

  const [expenseDate, setExpenseDate] = useState<string>(todayStr);
  const [isSettled, setIsSettled] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');

  // Itemized fields
  const [itemizedTitle, setItemizedTitle] = useState('');
  const [itemizedCategory, setItemizedCategory] = useState<ExpenseCategory>('Blinkit');
  const [itemizedPaidBy, setItemizedPaidBy] = useState<string>('');
  const [items, setItems] = useState<ItemizedExpenseItem[]>([]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (activeModal === 'add-expense') {
      setMode('launcher');
      setActiveTab('simple');
      setExpenseDate(todayStr);
      setIsSettled(false);
      setCategory(settings.defaultCategory);

      const youMember = activeMembers.find((m) => m.isYou) || activeMembers[0];
      const defaultPayerId = youMember ? youMember.id : activeMembers[0]?.id || '';
      setPaidBy(defaultPayerId);
      setItemizedPaidBy(defaultPayerId);
      setPayerMode('single');

      const initialPaidMap: Record<string, string> = {};
      const initialCustomShares: Record<string, string> = {};
      activeMembers.forEach((m) => {
        initialPaidMap[m.id] = '';
        initialCustomShares[m.id] = '';
      });
      setPaidByMap(initialPaidMap);
      setCustomSharesMap(initialCustomShares);

      setSplitMethod('equal');
      setSelectedParticipants(activeMembers.map((m) => m.id));

      setItems([
        { id: '1', name: 'Item 1', amount: 0, participants: activeMembers.map((m) => m.id) }
      ]);
      setDescription('');
      setTotalAmount('');
      setItemizedTitle('');
      setNotes('');
      setErrorMsg(null);
    } else if (activeModal === 'edit-expense' && selectedExpense) {
      setMode('manual');
      setActiveTab(selectedExpense.type === 'itemized' ? 'itemized' : 'simple');
      setExpenseDate(selectedExpense.date);
      setIsSettled(!!selectedExpense.isSettled);
      setCategory(selectedExpense.category);
      setDescription(selectedExpense.description);
      setTotalAmount(selectedExpense.totalAmount.toString());
      setPaidBy(selectedExpense.paidBy);
      setSelectedParticipants(selectedExpense.participants || []);
      setNotes(selectedExpense.notes || '');

      const initialPaidMap: Record<string, string> = {};
      if (selectedExpense.paidByMap && Object.keys(selectedExpense.paidByMap).length > 0) {
        const keys = Object.keys(selectedExpense.paidByMap).filter(k => (selectedExpense.paidByMap?.[k] || 0) > 0);
        setPayerMode(keys.length > 1 ? 'multiple' : 'single');
        activeMembers.forEach((m) => {
          initialPaidMap[m.id] = selectedExpense.paidByMap?.[m.id] ? String(selectedExpense.paidByMap[m.id]) : '';
        });
      } else {
        setPayerMode('single');
        activeMembers.forEach((m) => {
          initialPaidMap[m.id] = m.id === selectedExpense.paidBy ? String(selectedExpense.totalAmount) : '';
        });
      }
      setPaidByMap(initialPaidMap);

      const initialCustomShares: Record<string, string> = {};
      if (selectedExpense.splitType === 'custom' || selectedExpense.type === 'custom' || selectedExpense.customShares) {
        setSplitMethod('unequal');
        activeMembers.forEach((m) => {
          initialCustomShares[m.id] = selectedExpense.customShares?.[m.id] ? String(selectedExpense.customShares[m.id]) : '';
        });
      } else {
        setSplitMethod('equal');
        activeMembers.forEach((m) => {
          initialCustomShares[m.id] = '';
        });
      }
      setCustomSharesMap(initialCustomShares);

      setItemizedTitle(selectedExpense.description);
      setItemizedCategory(selectedExpense.category);
      setItemizedPaidBy(selectedExpense.paidBy);
      setItems(
        selectedExpense.items && selectedExpense.items.length > 0
          ? selectedExpense.items
          : [{ id: '1', name: 'Item 1', amount: 0, participants: activeMembers.map((m) => m.id) }]
      );
      setErrorMsg(null);
    }
  }, [activeModal, selectedExpense, members, settings.defaultCategory]);

  if (activeModal !== 'add-expense' && activeModal !== 'edit-expense') return null;

  const currency = settings.currency;

  const toggleParticipantSimple = (personId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(personId) ? prev.filter((id) => id !== personId) : [...prev, personId]
    );
  };

  // Calculations for Simple tab
  const computedTotalFromPayers = payerMode === 'multiple'
    ? activeMembers.reduce((sum, m) => sum + (parseFloat(paidByMap[m.id]) || 0), 0)
    : (parseFloat(totalAmount) || 0);

  const effectiveTotalBill = computedTotalFromPayers;

  const simpleSharePerPerson =
    selectedParticipants.length > 0 ? effectiveTotalBill / selectedParticipants.length : 0;

  const computedTotalShares = splitMethod === 'unequal'
    ? activeMembers.reduce((sum, m) => sum + (parseFloat(customSharesMap[m.id]) || 0), 0)
    : effectiveTotalBill;

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: `Item ${prev.length + 1}`,
        amount: 0,
        participants: activeMembers.map((m) => m.id)
      }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      showToast('Itemized expense must have at least 1 item', 'error');
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: 'name' | 'amount', value: string | number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const toggleItemParticipant = (itemId: string, personId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const has = item.participants.includes(personId);
        return {
          ...item,
          participants: has
            ? item.participants.filter((p) => p !== personId)
            : [...item.participants, personId]
        };
      })
    );
  };

  const itemizedTotalBill = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (activeTab === 'simple') {
      if (!description.trim()) {
        setErrorMsg('Please enter a description for the expense.');
        return;
      }
      if (effectiveTotalBill <= 0) {
        setErrorMsg('Please enter a valid positive total amount.');
        return;
      }

      if (payerMode === 'single' && !paidBy) {
        setErrorMsg('Please select who paid for this expense.');
        return;
      }

      if (splitMethod === 'equal' && selectedParticipants.length === 0) {
        setErrorMsg('Simple expense must have at least one participant.');
        return;
      }

      const finalPaidByMap: Record<string, number> = {};
      if (payerMode === 'multiple') {
        let hasPayer = false;
        activeMembers.forEach((m) => {
          const val = parseFloat(paidByMap[m.id]) || 0;
          if (val > 0) hasPayer = true;
          finalPaidByMap[m.id] = val;
        });
        if (!hasPayer) {
          setErrorMsg('Please enter payment amounts for at least one member.');
          return;
        }
      } else {
        finalPaidByMap[paidBy] = effectiveTotalBill;
      }

      // Determine primary payer (highest amount paid)
      let primaryPayer = paidBy;
      if (payerMode === 'multiple') {
        let maxPaid = -1;
        Object.entries(finalPaidByMap).forEach(([pId, amt]) => {
          if (amt > maxPaid) {
            maxPaid = amt;
            primaryPayer = pId;
          }
        });
      }

      let finalCustomShares: Record<string, number> | undefined = undefined;
      let finalParticipants: string[] = selectedParticipants;

      if (splitMethod === 'unequal') {
        finalCustomShares = {};
        const shareParticipants: string[] = [];
        activeMembers.forEach((m) => {
          const val = parseFloat(customSharesMap[m.id]) || 0;
          finalCustomShares![m.id] = val;
          if (val > 0) {
            shareParticipants.push(m.id);
          }
        });
        if (shareParticipants.length === 0) {
          setErrorMsg('Please enter share amounts for at least one participant.');
          return;
        }
        finalParticipants = shareParticipants;
      }

      const newExpense: Expense = {
        id: isEditing && selectedExpense ? selectedExpense.id : '',
        date: expenseDate || todayStr,
        description: description.trim(),
        category,
        type: 'simple',
        splitType: splitMethod,
        source: selectedExpense?.source || 'manual',
        paidBy: primaryPayer,
        paidByMap: finalPaidByMap,
        customShares: finalCustomShares,
        isSettled: isSettled,
        totalAmount: effectiveTotalBill,
        participants: finalParticipants,
        notes: notes.trim() || undefined,
        createdAt: isEditing && selectedExpense ? selectedExpense.createdAt : new Date().toISOString(),
        weekId: isEditing && selectedExpense ? (selectedExpense.weekId || '') : ''
      };

      addOrUpdateExpense(newExpense);
    } else {
      if (!itemizedTitle.trim()) {
        setErrorMsg('Please enter an expense title.');
        return;
      }
      if (items.length === 0) {
        setErrorMsg('Please add at least one item.');
        return;
      }

      const allItemParticipants = Array.from(new Set(items.flatMap((item) => item.participants)));

      const newExpense: Expense = {
        id: isEditing && selectedExpense ? selectedExpense.id : '',
        date: expenseDate || todayStr,
        description: itemizedTitle.trim(),
        category: itemizedCategory,
        type: 'itemized',
        splitType: 'itemized',
        source: selectedExpense?.source || 'manual',
        paidBy: itemizedPaidBy,
        paidByMap: { [itemizedPaidBy]: itemizedTotalBill },
        isSettled: isSettled,
        totalAmount: itemizedTotalBill,
        participants: allItemParticipants,
        items: items.map((it) => ({ ...it, amount: Number(it.amount) })),
        notes: notes.trim() || undefined,
        createdAt: isEditing && selectedExpense ? selectedExpense.createdAt : new Date().toISOString(),
        weekId: isEditing && selectedExpense ? (selectedExpense.weekId || '') : ''
      };

      addOrUpdateExpense(newExpense);
    }
  };

  return (
    <Modal
      isOpen={activeModal === 'add-expense' || activeModal === 'edit-expense'}
      onClose={closeModal}
      title={isEditing ? 'Edit Expense' : 'Add Shared Expense'}
      subtitle={isEditing ? 'Modify expense details and participant shares' : 'Choose upload method or enter expense manually'}
      maxWidth="xl"
    >
      {mode === 'launcher' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Option 1: Upload Bill */}
            <div
              onClick={() => {
                closeModal();
                openModal('upload-bill');
              }}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-md cursor-pointer transition-all space-y-3 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span>Upload Bill</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300 rounded-md">
                    Single / Multiple
                  </span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Upload one or multiple receipt images. Automatically extracts itemized shares and saves images in IndexedDB.
                </p>
              </div>
            </div>

            {/* Option 2: Manual Expense */}
            <div
              onClick={() => setMode('manual')}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all space-y-3 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Manual Expense Entry
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Enter description, custom date, amount, category, payer(s), custom split shares, and notes.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Manual Expense Form */
        <div className="space-y-5">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('simple')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'simple'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Shared Expense</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('itemized')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'itemized'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Itemized Expense (Bill Items)</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-rose-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'simple' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Description *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Travel to Mysore"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Expense Date & Payer Mode Header */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Expense Date *
                    </label>
                    <input
                      type="date"
                      max={todayStr}
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Payer Mode
                    </label>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setPayerMode('single')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                          payerMode === 'single'
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Single Payer
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayerMode('multiple')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                          payerMode === 'multiple'
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Multiple Payers
                      </button>
                    </div>
                  </div>
                </div>

                {/* Payer Input Section */}
                {payerMode === 'single' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Amount ({currency}) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="70"
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Paid By *
                      </label>
                      <select
                        value={paidBy}
                        onChange={(e) => setPaidBy(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
                      >
                        {activeMembers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>Amounts Paid by Members ({currency})</span>
                      <span className="text-brand-600 dark:text-brand-400 font-extrabold">
                        Total: {currency}{computedTotalFromPayers.toFixed(2)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {activeMembers.map((m) => (
                        <div key={m.id} className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-16 truncate">{m.name}:</span>
                          <div className="flex items-center gap-1 flex-1">
                            <span className="text-xs font-bold text-slate-400">{currency}</span>
                            <input
                              type="number"
                              step="any"
                              placeholder="0"
                              value={paidByMap[m.id] || ''}
                              onChange={(e) => setPaidByMap(prev => ({ ...prev, [m.id]: e.target.value }))}
                              className="w-full px-2 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Split Method Section */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Split Option
                    </label>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setSplitMethod('equal')}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                          splitMethod === 'equal'
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Divided Equally
                      </button>
                      <button
                        type="button"
                        onClick={() => setSplitMethod('unequal')}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                          splitMethod === 'unequal'
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Unequal / Custom Split
                      </button>
                    </div>
                  </div>

                  {splitMethod === 'equal' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {activeMembers.map((m) => {
                        const isChecked = selectedParticipants.includes(m.id);
                        return (
                          <button
                            type="button"
                            key={m.id}
                            onClick={() => toggleParticipantSimple(m.id)}
                            className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                              isChecked
                                ? 'border-brand-500 bg-brand-50/70 text-brand-900 dark:bg-brand-950 dark:text-brand-200'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600'
                            }`}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-brand-600 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 shrink-0" />
                            )}
                            <span className="truncate">{m.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span>Individual Shares ({currency})</span>
                        <span className={Math.abs(computedTotalShares - effectiveTotalBill) < 0.01 ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "text-amber-600 font-extrabold"}>
                          Sum: {currency}{computedTotalShares.toFixed(2)} / {currency}{effectiveTotalBill.toFixed(2)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {activeMembers.map((m) => (
                          <div key={m.id} className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-16 truncate">{m.name}:</span>
                            <div className="flex items-center gap-1 flex-1">
                              <span className="text-xs font-bold text-slate-400">{currency}</span>
                              <input
                                type="number"
                                step="any"
                                placeholder="0"
                                value={customSharesMap[m.id] || ''}
                                onChange={(e) => setCustomSharesMap(prev => ({ ...prev, [m.id]: e.target.value }))}
                                className="w-full px-2 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSettled}
                      onChange={(e) => setIsSettled(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Mark as Settled Mid-Way
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Excludes this expense from weekly debt accounting (useful for rent/bills settled immediately).
                      </p>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Notes / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Paid via UPI"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
                  />
                </div>

                {/* Live Share & Net Debt Preview */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-brand-600" />
                      <span>Live Share & Net Debt Preview</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Total Bill: {currency}{effectiveTotalBill.toFixed(2)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {activeMembers.map((m) => {
                      const paidVal = payerMode === 'multiple'
                        ? (parseFloat(paidByMap[m.id]) || 0)
                        : (m.id === paidBy ? effectiveTotalBill : 0);

                      const shareVal = splitMethod === 'unequal'
                        ? (parseFloat(customSharesMap[m.id]) || 0)
                        : (selectedParticipants.includes(m.id) ? simpleSharePerPerson : 0);

                      const netVal = Number((paidVal - shareVal).toFixed(2));

                      return (
                        <div
                          key={m.id}
                          className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1"
                        >
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            <span className="truncate">{m.name}</span>
                            {netVal > 0.009 ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold shrink-0">
                                Gets back {currency}{netVal.toFixed(2)}
                              </span>
                            ) : netVal < -0.009 ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold shrink-0">
                                Owes {currency}{Math.abs(netVal).toFixed(2)}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-bold shrink-0">
                                Settled
                              </span>
                            )}
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                            <span>Paid: {currency}{paidVal.toFixed(2)}</span>
                            <span>Share: {currency}{shareVal.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              /* Itemized Tab */
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Expense Title *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Blinkit Order"
                      value={itemizedTitle}
                      onChange={(e) => setItemizedTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Paid By *
                    </label>
                    <select
                      value={itemizedPaidBy}
                      onChange={(e) => setItemizedPaidBy(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
                    >
                      {activeMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Expense Date *
                    </label>
                    <input
                      type="date"
                      max={todayStr}
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Itemized Items
                    </span>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="flex items-center gap-1 text-xs font-bold text-brand-600"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Item</span>
                    </button>
                  </div>

                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-400">#{idx + 1}</span>
                        <input
                          type="text"
                          placeholder="Item name"
                          value={item.name}
                          onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-500">{currency}</span>
                          <input
                            type="number"
                            step="any"
                            placeholder="50"
                            value={item.amount || ''}
                            onChange={(e) => updateItem(item.id, 'amount', e.target.value)}
                            className="w-24 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          For:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {activeMembers.map((m) => {
                            const isChecked = item.participants.includes(m.id);
                            return (
                              <button
                                type="button"
                                key={m.id}
                                onClick={() => toggleItemParticipant(item.id, m.id)}
                                className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                                  isChecked
                                    ? 'bg-brand-50 text-brand-800 border-brand-300 dark:bg-brand-950 dark:text-brand-300'
                                    : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800'
                                }`}
                              >
                                {isChecked ? '✓ ' : ''}
                                {m.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between">
              <button
                type="button"
                onClick={() => setMode('launcher')}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Back to Launcher
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 rounded-xl shadow-2xs transition-colors duration-150"
                >
                  {isEditing ? 'Save Changes' : 'Add Expense'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
};
