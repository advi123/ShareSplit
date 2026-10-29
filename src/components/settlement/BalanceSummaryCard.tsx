import React from 'react';
import { Person } from '../../types';
import { Badge } from '../common/Badge';

interface Props {
  members: Person[];
  netBalances: Record<string, number>;
  currency: string;
}

export const BalanceSummaryCard: React.FC<Props> = ({ members, netBalances, currency }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Current Balances</h3>
        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Individual Positions
        </span>
      </div>

      <div className="space-y-2.5">
        {members.map((member) => {
          const balance = netBalances[member.id] || 0;
          const isSettled = Math.abs(balance) <= 0.01;
          const isCredit = balance > 0.01;

          let badgeVariant: 'success' | 'danger' | 'neutral' = 'neutral';
          let statusText = 'Settled';

          if (isCredit) {
            badgeVariant = 'success';
            statusText = `Should receive ${currency}${Math.abs(balance).toFixed(2)}`;
          } else if (balance < -0.01) {
            badgeVariant = 'danger';
            statusText = `Owes ${currency}${Math.abs(balance).toFixed(2)}`;
          }

          return (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800/80"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-xs text-white ${
                    member.color === 'indigo'
                      ? 'bg-indigo-600'
                      : member.color === 'amber'
                      ? 'bg-amber-600'
                      : member.color === 'rose'
                      ? 'bg-rose-600'
                      : member.color === 'emerald'
                      ? 'bg-emerald-600'
                      : member.color === 'blue'
                      ? 'bg-blue-600'
                      : member.color?.startsWith('bg-')
                      ? member.color
                      : 'bg-brand-600'
                  }`}
                >
                  {member.avatar || member.name.slice(0, 1)}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {member.name}
                  </span>
                </div>
              </div>

              <Badge variant={badgeVariant} size="sm">
                {statusText}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
};
