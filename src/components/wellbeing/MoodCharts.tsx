'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import type { MoodDashboardData } from '@/types';

const COLORS = [
  '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899',
  '#06b6d4', '#f97316',
];

interface MoodChartsProps {
  data: MoodDashboardData;
}

export function MoodTrendChart({ data }: MoodChartsProps) {
  if (data.trendData.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No trend data yet</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data.trendData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" fontSize={12} />
        <YAxis domain={[0, 5]} fontSize={12} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="averageMood"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function FeelingDistributionChart({ data }: MoodChartsProps) {
  const chartData = Object.entries(data.feelingDistribution).map(([name, value]) => ({
    name, value,
  }));

  if (chartData.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ name, value }) => `${name}: ${value}%`}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: unknown) => `${value}%`} />
      </PieChart>
    </ResponsiveContainer>
  );
}
