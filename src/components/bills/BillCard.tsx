import React, { useEffect, useState } from 'react';
import { FileText, Calendar } from 'lucide-react';
import { Bill, Person } from '../../types';
import { CategoryIcon, getCategoryBgColor } from '../common/CategoryIcon';
import { imageStorageService } from '../../services/imageStorageService';

interface Props {
  bill: Bill;
  members: Person[];
  currency: string;
  onClick: () => void;
}

export const BillCard: React.FC<Props> = ({ bill, members, currency, onClick }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(bill.imageData || null);

  useEffect(() => {
    let isMounted = true;
    if (!bill.imageData) {
      imageStorageService.getImage(bill.id).then((data) => {
        if (isMounted && data) {
          setImageSrc(data);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [bill.id, bill.imageData]);

  const payer = members.find((m) => m.id === bill.paidBy);
  const payerName = payer ? payer.name : (bill.paidByName || 'Unknown');

  const displayDate = bill.date || bill.uploadedAt;
  const dateStr = displayDate
    ? new Date(displayDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Unknown Date';

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 group"
    >
      {/* Thumbnail Preview Box */}
      <div className="relative h-36 w-full rounded-xl bg-slate-100 dark:bg-slate-850 overflow-hidden border border-slate-200/60 dark:border-slate-800 flex items-center justify-center">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={bill.storeName || bill.fileName}
            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="text-center text-slate-400 p-4">
            <FileText className="w-8 h-8 mx-auto mb-1 opacity-60" />
            <span className="text-[10px] font-semibold">{bill.fileName}</span>
          </div>
        )}

        {/* Category Overlay Badge */}
        {bill.category && (
          <div className="absolute top-2 left-2 shadow-xs">
            <span
              className={`px-2 py-0.5 text-[10px] font-bold rounded-lg flex items-center gap-1 ${getCategoryBgColor(
                bill.category
              )}`}
            >
              <CategoryIcon category={bill.category} className="w-3 h-3" />
              <span>{bill.category}</span>
            </span>
          </div>
        )}
      </div>

      {/* Bill Meta Details */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
            {bill.storeName || bill.fileName}
          </h4>
          <span className="text-sm font-black text-slate-900 dark:text-slate-100 shrink-0">
            {currency}{(bill.totalAmount || 0).toLocaleString('en-IN')}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{dateStr}</span>
          </div>

          <span>
            Paid by <strong className="font-semibold text-slate-700 dark:text-slate-200">{payerName}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
