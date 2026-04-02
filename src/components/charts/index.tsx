'use client';

import {
  LineChart as RechartsLineChart, Line, BarChart as RechartsBarChart, Bar,
  PieChart as RechartsPieChart, Pie, Cell, AreaChart as RechartsAreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const COLORS = ['#2563EB', '#4F46E5', '#F97316', '#10B981', '#F59E0B', '#EF4444'];

interface ChartProps {
  data: Record<string, unknown>[];
  height?: number;
}

interface LineChartProps extends ChartProps {
  xKey: string;
  lines: { key: string; color?: string; name?: string }[];
}

function NoDataMessage({ height = 300 }: { height?: number }) {
  return (
    <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
      No data available
    </div>
  );
}

export function LineChartComponent({ data, xKey, lines, height = 300 }: LineChartProps) {
  if (data.length === 0) return <NoDataMessage height={height} />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey={xKey} className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
        <Legend />
        {lines.map((line, i) => (
          <Line key={line.key} type="monotone" dataKey={line.key} stroke={line.color || COLORS[i]} name={line.name || line.key} strokeWidth={2} dot={false} />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}

interface BarChartProps extends ChartProps {
  xKey: string;
  bars: { key: string; color?: string; name?: string }[];
}

export function BarChartComponent({ data, xKey, bars, height = 300 }: BarChartProps) {
  if (data.length === 0) return <NoDataMessage height={height} />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey={xKey} className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
        <Legend />
        {bars.map((bar, i) => (
          <Bar key={bar.key} dataKey={bar.key} fill={bar.color || COLORS[i]} name={bar.name || bar.key} radius={[4, 4, 0, 0]} />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}

interface PieChartProps {
  data: { name: string; value: number; color?: string }[];
  height?: number;
}

export function PieChartComponent({ data, height = 300 }: PieChartProps) {
  if (data.length === 0) return <NoDataMessage height={height} />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}>
          {data.map((entry, i) => (
            <Cell key={`cell-${i}`} fill={entry.color || COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}

interface AreaChartProps extends ChartProps {
  xKey: string;
  areas: { key: string; color?: string; name?: string }[];
}

export function AreaChartComponent({ data, xKey, areas, height = 300 }: AreaChartProps) {
  if (data.length === 0) return <NoDataMessage height={height} />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey={xKey} className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
        <Legend />
        {areas.map((area, i) => (
          <Area key={area.key} type="monotone" dataKey={area.key} stroke={area.color || COLORS[i]} fill={area.color || COLORS[i]} fillOpacity={0.1} name={area.name || area.key} />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
