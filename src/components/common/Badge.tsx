import React from 'react';

interface Props {
  children: React.ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'neutral' | 'brand';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<Props> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = ''
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs font-medium' : 'px-2.5 py-1 text-xs font-semibold';

  let variantClasses = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

  if (variant === 'success') {
    variantClasses = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
  } else if (variant === 'danger') {
    variantClasses = 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
  } else if (variant === 'warning') {
    variantClasses = 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
  } else if (variant === 'brand') {
    variantClasses = 'bg-brand-100 text-brand-800 dark:bg-brand-950/80 dark:text-brand-300 border border-brand-200 dark:border-brand-800';
  }

  return (
    <span className={`inline-flex items-center rounded-full ${sizeClasses} ${variantClasses} ${className}`}>
      {children}
    </span>
  );
};
