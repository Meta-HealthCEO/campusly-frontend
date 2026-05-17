'use client';

import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MonthFilterProps {
  /** 4-digit year string, e.g. `'2026'`. */
  year: string;
  /** `'01'`–`'12'` for a specific month, or `'all'` for the whole year. */
  month: string;
  onChange: (year: string, month: string) => void;
  /** How many years back from today to include. Default 2. */
  yearsBack?: number;
  /** How many years forward from today to include. Default 1. */
  yearsForward?: number;
}

const MONTH_OPTIONS: { value: string; label: string }[] = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

/** Returns the current year + month in local time. Month is `'01'`–`'12'`. */
export function currentYearMonth(): { year: string; month: string } {
  const d = new Date();
  return {
    year: String(d.getFullYear()),
    month: String(d.getMonth() + 1).padStart(2, '0'),
  };
}

/**
 * Convert a year + month selection to date bounds as `'YYYY-MM-DD'`
 * strings in local time. When `month === 'all'`, returns the whole year.
 * Returns `null` for malformed input.
 */
export function getMonthBounds(
  year: string,
  month: string,
): { dateFrom: string; dateTo: string } | null {
  const y = Number(year);
  if (!Number.isFinite(y) || y < 1900 || y > 9999) return null;

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  if (month === 'all') {
    return { dateFrom: fmt(new Date(y, 0, 1)), dateTo: fmt(new Date(y, 11, 31)) };
  }

  const m = Number(month);
  if (!Number.isFinite(m) || m < 1 || m > 12) return null;
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0); // day 0 of next month = last day of this month
  return { dateFrom: fmt(first), dateTo: fmt(last) };
}

export function MonthFilter({
  year,
  month,
  onChange,
  yearsBack = 2,
  yearsForward = 1,
}: MonthFilterProps) {
  const years = useMemo(() => {
    const now = new Date().getFullYear();
    const out: string[] = [];
    for (let offset = yearsForward; offset >= -yearsBack; offset--) {
      out.push(String(now + offset));
    }
    return out;
  }, [yearsBack, yearsForward]);

  return (
    <div className="flex gap-2">
      <Select
        value={year}
        onValueChange={(v: unknown) =>
          onChange(typeof v === 'string' ? v : year, month)
        }
      >
        <SelectTrigger className="w-full sm:w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={y}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={month}
        onValueChange={(v: unknown) =>
          onChange(year, typeof v === 'string' ? v : 'all')
        }
      >
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder="All months" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All months</SelectItem>
          {MONTH_OPTIONS.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
