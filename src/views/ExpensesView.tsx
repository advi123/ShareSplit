import React, { useState } from 'react';
import { Search, Plus, Filter, Calendar, X, RotateCcw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ExpenseCard } from '../components/expenses/ExpenseCard';
import { EmptyState } from '../components/common/EmptyState';
import { ExpenseCategory } from '../types';

export const ExpensesView: React.FC = () => {
  const { expenses, members, settings, currentGroup, openModal, currentWeek } = useApp();

  const isTrip = currentGroup?.groupType === 'trip' || settings.groupType === 'trip';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPayer, setSelectedPayer] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [viewScope, setViewScope] = useState<'current_week' | 'all'>('current_week');

  const currency = settings.currency;
  const activeMembers = members.filter((m) => m.isActive !== false);

  // If user enters a search term or picks date range, or if it is a trip group, automatically search across all expenses!
  const isGlobalSearch = isTrip || searchTerm.trim().length > 0 || startDate !== '' || endDate !== '' || viewScope === 'all';
  const baseExpenses = isGlobalSearch ? expenses : expenses.filter((e) => e.weekId === currentWeek.id || !e.weekId);

  const filteredExpenses = baseExpenses.filter((exp) => {
    const term = searchTerm.toLowerCase().trim();
    const payer = members.find((m) => m.id === exp.paidBy);
    const payerName = payer ? payer.name.toLowerCase() : '';

    const matchesSearch =
      term === '' ||
      exp.description.toLowerCase().includes(term) ||
      payerName.includes(term) ||
      exp.date.includes(term) ||
      (exp.items && exp.items.some((it) => it.name.toLowerCase().includes(term)));

    const matchesCategory = selectedCategory === 'all' || exp.category === selectedCategory;
    const matchesPayer = selectedPayer === 'all' || exp.paidBy === selectedPayer;

    let matchesDateRange = true;
    if (startDate && exp.date < startDate) matchesDateRange = false;
    if (endDate && exp.date > endDate) matchesDateRange = false;

    return matchesSearch && matchesCategory && matchesPayer && matchesDateRange;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedPayer('all');
    setStartDate('');
    setEndDate('');
    setViewScope('current_week');
  };

  // Group by Date
  const groupedByDate: Record<string, typeof expenses> = {};
  filteredExpenses.forEach((exp) => {
    if (!groupedByDate[exp.date]) {
      groupedByDate[exp.date] = [];
    }
    groupedByDate[exp.date].push(exp);
  });

  // Sort dates descending
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  const formatDateHeader = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
      const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
      return `${dayName} — ${monthDay}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Expense Log
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
              {filteredExpenses.length} {filteredExpenses.length === 1 ? 'Expense' : 'Expenses'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isGlobalSearch
              ? 'Searching across all recorded past and current expenses'
              : 'All recorded shared and itemized expenses for current active week'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Scope switch pills (only for home groups) */}
          {!isTrip && (
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/60 dark:border-slate-700 text-xs font-bold">
              <button
                onClick={() => setViewScope('current_week')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewScope === 'current_week' && !searchTerm && !startDate && !endDate
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Current Week
              </button>
              <button
                onClick={() => setViewScope('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewScope === 'all' || searchTerm || startDate || endDate
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All History
              </button>
            </div>
          )}

          <button
            onClick={() => openModal('add-expense')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs font-bold rounded-xl shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search past & present expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All Categories</option>
              {isTrip ? (
                <>
                  <option value="Travel">Travel</option>
                  <option value="Stay">Stay</option>
                  <option value="Food & Drinks">Food & Drinks</option>
                  <option value="Activities">Activities</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Other">Other</option>
                </>
              ) : (
                <>
                  <option value="Rent">Rent</option>
                  <option value="Groceries">Groceries</option>
                  <option value="Blinkit">Blinkit</option>
                  <option value="Food">Food</option>
                  <option value="Travel">Travel</option>
                  <option value="Electricity">Electricity</option>
                  <option value="Internet">Internet</option>
                  <option value="Household">Household</option>
                  <option value="Cleaning">Cleaning</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Other">Other</option>
                </>
              )}
            </select>
          </div>

          {/* Payer Filter (Active members only) */}
          <div>
            <select
              value={selectedPayer}
              onChange={(e) => setSelectedPayer(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All Active Payers</option>
              {activeMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  Paid by {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range Row */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Date Range:</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                title="Start Date"
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-200"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                title="End Date"
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {(searchTerm || startDate || endDate || selectedCategory !== 'all' || selectedPayer !== 'all') && (
            <button
              onClick={clearFilters}
              className="text-xs font-bold text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Date Grouped Expense List */}
      {sortedDates.length === 0 ? (
        <EmptyState
          title="No expenses found"
          description="There are no expenses matching your active filter criteria."
          actionText="Add Expense"
          onAction={() => openModal('add-expense')}
        />
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateStr) => {
            const dateExpenses = groupedByDate[dateStr];
            const dateTotal = dateExpenses.reduce((sum, e) => sum + e.totalAmount, 0);

            return (
              <div key={dateStr} className="space-y-3">
                {/* Date Group Banner Header */}
                <div className="flex items-center justify-between px-2 pt-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {formatDateHeader(dateStr)}
                  </h3>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Day Total: {currency}{dateTotal.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2.5">
                  {dateExpenses.map((exp) => (
                    <ExpenseCard
                      key={exp.id}
                      expense={exp}
                      members={members}
                      currency={currency}
                      onClick={() => openModal('expense-detail', exp)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
