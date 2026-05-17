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
  /** `'YYYY-MM'` for a specific month, or `'all'` for no month filter. */
  value: string;
  onChange: (value: string) => void;
  /** How many months back from today to include. Default 12. */
  monthsBack?: number;
  /** How many months forward from today to include. Default 6. */
  monthsForward?: number;
  className?: string;
}

const LABEL_FORMAT = new Intl.DateTimeFormat('en-ZA', {
  month: 'long',
  year: 'numeric',
});

/** Returns the current month as a `'YYYY-MM'` key in local time. */
export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Convert a `'YYYY-MM'` key to first/last day of the month, formatted as
 * `'YYYY-MM-DD'` in local time. Returns `null` for malformed input.
 */
export function monthBounds(key: string): { dateFrom: string; dateTo: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]); // 1–12
  if (month < 1 || month > 12) return null;
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0); // day 0 of next month = last day of this month
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { dateFrom: fmt(first), dateTo: fmt(last) };
}

export function MonthFilter({
  value,
  onChange,
  monthsBack = 12,
  monthsForward = 6,
  className,
}: MonthFilterProps) {
  const options = useMemo(() => {
    const now = new Date();
    const opts: { key: string; label: string }[] = [];
    for (let offset = monthsForward; offset >= -monthsBack; offset--) {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      opts.push({ key, label: LABEL_FORMAT.format(d) });
    }
    return opts;
  }, [monthsBack, monthsForward]);

  return (
    <Select
      value={value}
      onValueChange={(v: unknown) => onChange(typeof v === 'string' ? v : 'all')}
    >
      <SelectTrigger className={className ?? 'w-full sm:w-44'}>
        <SelectValue placeholder="All months" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All months</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.key} value={o.key}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
