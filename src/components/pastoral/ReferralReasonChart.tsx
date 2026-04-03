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
import { PieChart as PieIcon } from 'lucide-react';
import type { PastoralReport } from '@/types';

const COLORS = [
  '#2563eb',
  '#f59e0b',
  '#10b981',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#6366f1',
  '#dc2626',
];

interface ReferralReasonChartProps {
  report: PastoralReport | null;
}

interface ReasonDataItem {
  name: string;
  value: number;
}

function isReasonDataItem(item: unknown): item is ReasonDataItem {
  if (typeof item !== 'object' || item === null) return false;
  const obj = item as Record<string, unknown>;
  return typeof obj.name === 'string' && typeof obj.value === 'number';
}

export function ReferralReasonChart({ report }: ReferralReasonChartProps) {
  const data = useMemo<ReasonDataItem[]>(() => {
    if (!report) return [];
    return report.data
      .filter(isReasonDataItem)
      .map((item) => ({
        name: item.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        value: item.value,
      }));
  }, [report]);

  if (!report || data.length === 0) {
    return (
      <EmptyState
        icon={PieIcon}
        title="No referral data"
        description="Referral reason breakdown will appear here once data is available."
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
          outerRadius={90}
          label={({ name, percent }: { name: string; percent: number }) =>
            `${name} (${(percent * 100).toFixed(0)}%)`
          }
          labelLine={false}
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
