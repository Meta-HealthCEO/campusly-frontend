'use client';

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { EmptyState } from '@/components/shared/EmptyState';
import { Activity } from 'lucide-react';
import type { PastoralReport } from '@/types';

const COLORS = [
  '#10b981',
  '#2563eb',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
];

interface OutcomeChartProps {
  report: PastoralReport | null;
}

interface OutcomeDataItem {
  name: string;
  value: number;
}

function isOutcomeDataItem(item: unknown): item is OutcomeDataItem {
  if (typeof item !== 'object' || item === null) return false;
  const obj = item as Record<string, unknown>;
  return typeof obj.name === 'string' && typeof obj.value === 'number';
}

export function OutcomeChart({ report }: OutcomeChartProps) {
  const data = useMemo<OutcomeDataItem[]>(() => {
    if (!report) return [];
    return report.data
      .filter(isOutcomeDataItem)
      .map((item) => ({
        name: item.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        value: item.value,
      }));
  }, [report]);

  if (!report || data.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No outcome data"
        description="Referral outcome breakdown will appear here once referrals are resolved."
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={3}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => [value, 'Referrals']} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
