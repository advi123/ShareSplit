import React, { useState } from 'react';
import { Search, Plus, Filter } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ExpenseCard } from '../components/expenses/ExpenseCard';
import { EmptyState } from '../components/common/EmptyState';
import { ExpenseCategory } from '../types';

export const ExpensesView: React.FC = () => {
  const { expenses, members, settings, openModal, currentWeek } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPayer, setSelectedPayer] = useState<string>('all');

  const currency = settings.currency;

  // Filter current week expenses (or all active)
  const currentWeekExpenses = expenses.filter((e) => e.weekId === currentWeek.id || !e.weekId);

  const filteredExpenses = currentWeekExpenses.filter((exp) => {
    const matchesSearch = exp.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || exp.category === selectedCategory;
    const matchesPayer = selectedPayer === 'all' || exp.paidBy === selectedPayer;
    return matchesSearch && matchesCategory && matchesPayer;
  });

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
      const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
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
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Expense Log
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            All recorded shared and itemized expenses for current week
          </p>
        </div>

        <button
          onClick={() => openModal('add-expense')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-900 dark:text-slate-100 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors"
        >
          <Plus className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
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
          </select>
        </div>

        {/* Payer Filter */}
        <div>
          <select
            value={selectedPayer}
            onChange={(e) => setSelectedPayer(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Payers</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                Paid by {m.name}
              </option>
            ))}
          </select>
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
