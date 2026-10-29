import { Expense, Person, SimplifiedTransaction } from '../types';

export interface PersonShareBreakdown {
  personId: string;
  totalPaid: number;
  totalShare: number;
  netBalance: number;
}

/**
 * Calculates per-person paid amounts for a single expense.
 * Returns a record mapping personId -> amount paid.
 */
export function calculateExpensePayments(expense: Expense): Record<string, number> {
  const payments: Record<string, number> = {};

  if (expense.paidByMap && Object.keys(expense.paidByMap).length > 0) {
    Object.entries(expense.paidByMap).forEach(([pId, amt]) => {
      payments[pId] = Number(Number(amt).toFixed(2));
    });
  } else {
    payments[expense.paidBy] = Number(Number(expense.totalAmount).toFixed(2));
  }

  return payments;
}

/**
 * Calculates per-person shares for a single expense.
 * Returns a record mapping personId -> share amount.
 */
export function calculateSingleExpenseShares(expense: Expense): Record<string, number> {
  const shares: Record<string, number> = {};

  if ((expense.splitType === 'custom' || expense.type === 'custom') && expense.customShares) {
    Object.entries(expense.customShares).forEach(([pId, shareAmt]) => {
      shares[pId] = Number(Number(shareAmt).toFixed(2));
    });
  } else if (expense.type === 'itemized' && expense.items && expense.items.length > 0) {
    expense.items.forEach((item) => {
      const count = item.participants.length;
      if (count > 0) {
        const itemSharePerPerson = item.amount / count;
        item.participants.forEach((pId) => {
          shares[pId] = (shares[pId] || 0) + itemSharePerPerson;
        });
      }
    });

    // Round shares to 2 decimal places
    Object.keys(shares).forEach((pId) => {
      shares[pId] = Number(shares[pId].toFixed(2));
    });
  } else {
    // Simple or equal split
    const count = expense.participants.length;
    if (count > 0) {
      const sharePerPerson = Number((expense.totalAmount / count).toFixed(2));
      expense.participants.forEach((pId) => {
        shares[pId] = sharePerPerson;
      });
    }
  }

  return shares;
}

/**
 * Computes net balances for a list of expenses and a list of group members.
 */
export function calculateNetBalances(
  expenses: Expense[],
  members: Person[],
  ignoreIsSettled: boolean = false
): Record<string, PersonShareBreakdown> {
  const breakdownMap: Record<string, PersonShareBreakdown> = {};

  // Initialize for all members
  members.forEach((m) => {
    breakdownMap[m.id] = {
      personId: m.id,
      totalPaid: 0,
      totalShare: 0,
      netBalance: 0
    };
  });

  expenses.forEach((expense) => {
    if (!ignoreIsSettled && expense.isSettled) return; // Skip mid-way settled expenses from debt accounting

    // Add per-person paid amounts
    const expPayments = calculateExpensePayments(expense);
    Object.entries(expPayments).forEach(([pId, paidAmount]) => {
      if (!breakdownMap[pId]) {
        breakdownMap[pId] = {
          personId: pId,
          totalPaid: 0,
          totalShare: 0,
          netBalance: 0
        };
      }
      breakdownMap[pId].totalPaid += paidAmount;
    });

    // Add per-person share
    const expShares = calculateSingleExpenseShares(expense);
    Object.entries(expShares).forEach(([pId, shareAmount]) => {
      if (!breakdownMap[pId]) {
        breakdownMap[pId] = {
          personId: pId,
          totalPaid: 0,
          totalShare: 0,
          netBalance: 0
        };
      }
      breakdownMap[pId].totalShare += shareAmount;
    });
  });

  // Calculate net balances and round to 2 decimals
  Object.values(breakdownMap).forEach((b) => {
    b.totalPaid = Number(b.totalPaid.toFixed(2));
    b.totalShare = Number(b.totalShare.toFixed(2));
    b.netBalance = Number((b.totalPaid - b.totalShare).toFixed(2));
  });

  return breakdownMap;
}

/**
 * Simplifies debts between members to produce the minimum number of transactions.
 * Input: map of personId -> netBalance (or breakdownMap)
 */
export function simplifyDebts(
  netBalances: Record<string, number | PersonShareBreakdown>,
  expenses?: Expense[],
  members?: Person[],
  ignoreIsSettled: boolean = false
): SimplifiedTransaction[] {
  // If we have expenses and members, calculate the unsimplified direct pairwise net debts
  if (expenses && members) {
    const debts: Record<string, Record<string, number>> = {};
    members.forEach((m) => {
      debts[m.id] = {};
      members.forEach((other) => {
        if (m.id !== other.id) {
          debts[m.id][other.id] = 0;
        }
      });
    });

    expenses.forEach((expense) => {
      if (!ignoreIsSettled && expense.isSettled) return; // Exclude mid-way settled expenses from debt calculations

      const expPayments = calculateExpensePayments(expense);
      const expShares = calculateSingleExpenseShares(expense);

      const expCreditors: Array<{ id: string; amount: number }> = [];
      const expDebtors: Array<{ id: string; amount: number }> = [];

      const allPeople = new Set([...Object.keys(expPayments), ...Object.keys(expShares)]);
      allPeople.forEach((pId) => {
        const paid = expPayments[pId] || 0;
        const share = expShares[pId] || 0;
        const diff = Number((paid - share).toFixed(2));
        if (diff > 0.009) {
          expCreditors.push({ id: pId, amount: diff });
        } else if (diff < -0.009) {
          expDebtors.push({ id: pId, amount: Math.abs(diff) });
        }
      });

      const cList = expCreditors.map((c) => ({ ...c }));
      const dList = expDebtors.map((d) => ({ ...d }));

      while (cList.length > 0 && dList.length > 0) {
        dList.sort((a, b) => b.amount - a.amount);
        cList.sort((a, b) => b.amount - a.amount);

        const debtor = dList[0];
        const creditor = cList[0];
        const transfer = Number(Math.min(debtor.amount, creditor.amount).toFixed(2));

        if (transfer > 0.009 && debts[debtor.id] && debts[debtor.id][creditor.id] !== undefined) {
          debts[debtor.id][creditor.id] += transfer;
        }

        debtor.amount = Number((debtor.amount - transfer).toFixed(2));
        creditor.amount = Number((creditor.amount - transfer).toFixed(2));

        if (debtor.amount <= 0.009) dList.shift();
        if (creditor.amount <= 0.009) cList.shift();
      }
    });

    const transactions: SimplifiedTransaction[] = [];
    let txCounter = 1;
    const seenPairs = new Set<string>();

    members.forEach((m1) => {
      members.forEach((m2) => {
        if (m1.id === m2.id) return;
        const pairKey = [m1.id, m2.id].sort().join('-');
        if (seenPairs.has(pairKey)) return;
        seenPairs.add(pairKey);

        const m1OwesM2 = debts[m1.id][m2.id] || 0;
        const m2OwesM1 = debts[m2.id][m1.id] || 0;

        const diff = Number((m1OwesM2 - m2OwesM1).toFixed(2));
        if (diff > 0.01) {
          transactions.push({
            id: `tx-${txCounter++}`,
            from: m1.id,
            to: m2.id,
            amount: diff
          });
        } else if (diff < -0.01) {
          transactions.push({
            id: `tx-${txCounter++}`,
            from: m2.id,
            to: m1.id,
            amount: Math.abs(diff)
          });
        }
      });
    });

    return transactions;
  }

  // Fallback: standard debt simplification
  const creditors: Array<{ id: string; amount: number }> = [];
  const debtors: Array<{ id: string; amount: number }> = [];

  Object.entries(netBalances).forEach(([personId, val]) => {
    const balance = typeof val === 'number' ? val : val.netBalance;
    const rounded = Number(balance.toFixed(2));
    if (rounded > 0.01) {
      creditors.push({ id: personId, amount: rounded });
    } else if (rounded < -0.01) {
      debtors.push({ id: personId, amount: Math.abs(rounded) });
    }
  });

  const transactions: SimplifiedTransaction[] = [];
  let txCounter = 1;

  while (creditors.length > 0 && debtors.length > 0) {
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const debtor = debtors[0];
    const creditor = creditors[0];

    const transferAmount = Number(Math.min(debtor.amount, creditor.amount).toFixed(2));

    if (transferAmount > 0.009) {
      transactions.push({
        id: `tx-${txCounter++}`,
        from: debtor.id,
        to: creditor.id,
        amount: transferAmount
      });
    }

    debtor.amount = Number((debtor.amount - transferAmount).toFixed(2));
    creditor.amount = Number((creditor.amount - transferAmount).toFixed(2));

    if (debtor.amount <= 0.01) {
      debtors.shift();
    }
    if (creditor.amount <= 0.01) {
      creditors.shift();
    }
  }

  return transactions;
}
