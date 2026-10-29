/**
 * Utility functions for date calculations, week range determination, and formatting.
 */

export function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export interface WeekInfo {
  weekId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  formattedRange: string;
}

/**
 * Calculates the week start date (Monday/Sunday) and end date (Sunday/Saturday)
 * for any given ISO date string (YYYY-MM-DD).
 */
export function getWeekInfoForDate(
  dateStr: string,
  weekStartsOn: 'Monday' | 'Sunday' = 'Monday'
): WeekInfo {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0 is Sunday, 1 is Monday, ...

  let diffToStart = 0;
  if (weekStartsOn === 'Monday') {
    // If Monday is start, Monday is 1, Sunday is 7
    diffToStart = d.getDate() - day + (day === 0 ? -6 : 1);
  } else {
    // If Sunday is start, Sunday is 0
    diffToStart = d.getDate() - day;
  }

  const startDate = new Date(d);
  startDate.setDate(diffToStart);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  const formatISO = (date: Date) => date.toISOString().split('T')[0];

  const startIso = formatISO(startDate);
  const endIso = formatISO(endDate);

  const sMonth = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const eMonth = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return {
    weekId: `week-${startIso}`,
    startDate: startIso,
    endDate: endIso,
    formattedRange: `${sMonth} – ${eMonth}`
  };
}

export function formatDateStr(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}
