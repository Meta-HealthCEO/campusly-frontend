'use client';

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts';
import type { IncidentReportSummary } from '@/types';

const COLORS = [
  '#2563eb', '#dc2626', '#f59e0b', '#10b981', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1',
];

interface IncidentChartsProps {
  summary: IncidentReportSummary;
}

export function IncidentTypePieChart({ summary }: IncidentChartsProps) {
  const data = Object.entries(summary.byType).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
  }));

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No data</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function IncidentTrendChart({ summary }: IncidentChartsProps) {
  const data = summary.monthlyTrend;

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No data</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" fontSize={12} />
        <YAxis fontSize={12} />
        <Tooltip />
        <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function TopLocationsChart({ summary }: IncidentChartsProps) {
  const data = summary.topLocations.slice(0, 5);

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No data</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" fontSize={12} />
        <YAxis dataKey="location" type="category" fontSize={12} width={100} />
        <Tooltip />
        <Bar dataKey="count" fill="#2563eb" />
      </BarChart>
    </ResponsiveContainer>
  );
}
