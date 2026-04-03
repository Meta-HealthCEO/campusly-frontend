'use client';

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
import { Wrench } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { MaintenanceCostReport, MaintenanceCostEntry } from '@/types';

interface MaintenanceCostChartProps {
  report: MaintenanceCostReport | null;
}

function tooltipFormatter(value: unknown): [string, string] {
  return [formatCurrency(Number(value)), 'Total Cost'];
}

function yAxisFormatter(value: number): string {
  if (value >= 100) return `R${Math.round(value / 100)}k`;
  return `R${value}`;
}

export function MaintenanceCostChart({ report }: MaintenanceCostChartProps) {
  if (!report || report.entries.length === 0) {
    return (
      <EmptyState
        icon={Wrench}
        title="No maintenance cost data"
        description="Maintenance costs by category will appear here once records exist."
      />
    );
  }

  const chartData = report.entries.map((entry: MaintenanceCostEntry) => ({
    name: entry.category,
    totalCost: entry.totalCost,
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
            width={64}
          />
          <Tooltip formatter={tooltipFormatter} />
          <Bar
            dataKey="totalCost"
            name="Total Cost"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
