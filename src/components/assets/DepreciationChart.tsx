'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { EmptyState } from '@/components/shared/EmptyState';
import { BarChart2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { DepreciationReport, DepreciationCategory } from '@/types';

interface DepreciationChartProps {
  report: DepreciationReport | null;
}

function yAxisFormatter(value: number): string {
  return `R${value}k`;
}

function tooltipFormatter(value: unknown): [string, string] {
  return [formatCurrency(Number(value) * 100), ''];
}

export function DepreciationChart({ report }: DepreciationChartProps) {
  if (!report || report.byCategory.length === 0) {
    return (
      <EmptyState
        icon={BarChart2}
        title="No category data"
        description="Depreciation data by category will appear here once a report is generated."
      />
    );
  }

  const chartData = report.byCategory.map((cat: DepreciationCategory) => ({
    name: cat.categoryName,
    purchaseValue: Math.round(cat.purchaseValue / 100),
    currentValue: Math.round(cat.currentValue / 100),
  }));

  return (
    <div className="w-full h-72 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={yAxisFormatter}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip formatter={tooltipFormatter} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="purchaseValue" name="Purchase Value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          <Bar dataKey="currentValue" name="Current Value" fill="hsl(var(--primary) / 0.4)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
