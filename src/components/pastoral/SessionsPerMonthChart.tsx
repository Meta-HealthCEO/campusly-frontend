'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { EmptyState } from '@/components/shared/EmptyState';
import { BarChart2 } from 'lucide-react';
import type { PastoralReport } from '@/types';

interface SessionsPerMonthChartProps {
  report: PastoralReport | null;
}

interface MonthDataItem {
  month: string;
  count: number;
}

function isMonthDataItem(item: unknown): item is MonthDataItem {
  if (typeof item !== 'object' || item === null) return false;
  const obj = item as Record<string, unknown>;
  return typeof obj.month === 'string' && typeof obj.count === 'number';
}

export function SessionsPerMonthChart({ report }: SessionsPerMonthChartProps) {
  const data = useMemo<MonthDataItem[]>(() => {
    if (!report) return [];
    return report.data.filter(isMonthDataItem);
  }, [report]);

  if (!report || data.length === 0) {
    return (
      <EmptyState
        icon={BarChart2}
        title="No session data"
        description="Monthly session counts will appear here once sessions are recorded."
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" fontSize={12} />
        <YAxis fontSize={12} allowDecimals={false} />
        <Tooltip formatter={(value: number) => [value, 'Sessions']} />
        <Bar dataKey="count" name="Sessions" fill="#2563eb" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
