import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Person, SimplifiedTransaction } from '../../types';

interface Props {
  transactions: SimplifiedTransaction[];
  members: Person[];
  currency: string;
  title?: string;
  subtitle?: string;
}

export const SettlementTransactionCard: React.FC<Props> = ({
  transactions,
  members,
  currency,
  title = 'Simplified Net Settlement',
  subtitle = 'Calculated from all recorded expenses with minimum transactions'
}) => {
  const getMemberName = (id: string) => {
    const m = members.find((mem) => mem.id === id);
    return m ? m.name : 'Unknown';
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      {transactions.length === 0 ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Everyone is completely settled up! No transactions needed.</span>
        </div>
      ) : (
        <div className="space-y-2.5">
          {transactions.map((tx) => {
            const fromName = getMemberName(tx.from);
            const toName = getMemberName(tx.to);

            return (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800"
              >
                {/* Transaction Flow: Debtor -> Creditor */}
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {fromName}
                  </span>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <span>pays</span>
                    <ArrowRight className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {toName}
                  </span>
                </div>

                {/* Amount */}
                <div className="text-sm font-black text-slate-900 dark:text-slate-100">
                  {currency}{Math.round(tx.amount).toLocaleString('en-IN')}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
