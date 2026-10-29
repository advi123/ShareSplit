import React, { useState } from 'react';
import { Search, Filter, Upload, FileText, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BillCard } from '../components/bills/BillCard';
import { EmptyState } from '../components/common/EmptyState';
import { BillViewerModal } from '../components/bills/BillViewerModal';
import { DeleteBillConfirmModal } from '../components/bills/DeleteBillConfirmModal';

export const BillsView: React.FC = () => {
  const { bills, members, settings, openModal, historicalWeeks, currentWeek } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedWeekId, setSelectedWeekId] = useState<string>('all');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  const currency = settings.currency;
  const allWeeks = [currentWeek, ...historicalWeeks];

  const filteredBills = bills.filter((bill) => {
    const titleMatch = (bill.storeName || bill.fileName).toLowerCase().includes(searchTerm.toLowerCase());
    const memberMatch = selectedMember === 'all' || bill.paidBy === selectedMember;
    const categoryMatch = selectedCategory === 'all' || bill.category === selectedCategory;

    // Week Filter
    let weekMatch = true;
    if (selectedWeekId !== 'all') {
      const targetWeek = allWeeks.find((w) => w.id === selectedWeekId);
      if (targetWeek && bill.date) {
        weekMatch = bill.date >= targetWeek.startDate && bill.date <= targetWeek.endDate;
      }
    }

    // Date Range Filter
    let rangeMatch = true;
    if (startDateFilter && bill.date) {
      rangeMatch = rangeMatch && bill.date >= startDateFilter;
    }
    if (endDateFilter && bill.date) {
      rangeMatch = rangeMatch && bill.date <= endDateFilter;
    }

    return titleMatch && memberMatch && categoryMatch && weekMatch && rangeMatch;
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Receipt & Bill Archive ({bills.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            IndexedDB stored receipt images linked to independent group expenses
          </p>
        </div>

        <button
          onClick={() => openModal('upload-bill')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs font-bold rounded-xl shadow-2xs transition-colors duration-150"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Receipt</span>
        </button>
      </div>

      {/* Search & Comprehensive Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search bills by store or file..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Week Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedWeekId}
              onChange={(e) => setSelectedWeekId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All Weeks</option>
              {allWeeks.map((w) => (
                <option key={w.id} value={w.id}>
                  Week: {w.startDate} to {w.endDate} ({w.status})
                </option>
              ))}
            </select>
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
              <option value="Blinkit">Blinkit</option>
              <option value="Groceries">Groceries</option>
              <option value="Food">Food</option>
              <option value="Travel">Travel</option>
              <option value="Rent">Rent</option>
              <option value="Electricity">Electricity</option>
              <option value="Internet">Internet</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Second Row: Date Range & Member Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Paid By Member
            </label>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-xs font-medium"
            >
              <option value="all">All Members</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  Paid by {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bills Grid */}
      {filteredBills.length === 0 ? (
        <EmptyState
          title="No receipt bills stored"
          description="Uploaded receipt images will be preserved locally in browser IndexedDB."
          actionText="Upload First Receipt"
          onAction={() => openModal('upload-bill')}
          icon={<FileText className="w-6 h-6" />}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBills.map((bill) => (
            <BillCard
              key={bill.id}
              bill={bill}
              members={members}
              currency={currency}
              onClick={() => openModal('bill-viewer', bill)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <BillViewerModal />
      <DeleteBillConfirmModal />
    </div>
  );
};
