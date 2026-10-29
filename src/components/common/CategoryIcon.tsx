import React from 'react';
import {
  Home,
  ShoppingCart,
  Zap,
  Wifi,
  Car,
  Utensils,
  ShoppingBag,
  Sparkles,
  Sofa,
  Tv,
  Tag
} from 'lucide-react';
import { ExpenseCategory } from '../../types';

interface Props {
  category: ExpenseCategory;
  className?: string;
}

export const CategoryIcon: React.FC<Props> = ({ category, className = 'w-5 h-5' }) => {
  switch (category) {
    case 'Rent':
      return <Home className={className} />;
    case 'Groceries':
      return <ShoppingCart className={className} />;
    case 'Blinkit':
      return <ShoppingBag className={className} />;
    case 'Food':
      return <Utensils className={className} />;
    case 'Travel':
      return <Car className={className} />;
    case 'Electricity':
      return <Zap className={className} />;
    case 'Internet':
      return <Wifi className={className} />;
    case 'Household':
      return <Sofa className={className} />;
    case 'Cleaning':
      return <Sparkles className={className} />;
    case 'Entertainment':
      return <Tv className={className} />;
    case 'Other':
    default:
      return <Tag className={className} />;
  }
};

export const getCategoryBgColor = (category: ExpenseCategory): string => {
  switch (category) {
    case 'Rent':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300';
    case 'Groceries':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300';
    case 'Blinkit':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300';
    case 'Food':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300';
    case 'Travel':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300';
    case 'Electricity':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-300';
    case 'Internet':
      return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300';
    case 'Household':
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300';
    case 'Cleaning':
      return 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300';
    case 'Entertainment':
      return 'bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
};
